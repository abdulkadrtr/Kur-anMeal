#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Özel Okuyuşlar pipeline'ı.

Kullanım:
  1. scripts/recitation_sources.txt dosyasına YouTube linki ekle (her satıra bir tane).
     İsteğe bağlı: "URL | Okuyucu Adı" formatıyla okuyucu belirt (varsayılan: Yasser Al-Dosari).
  2. python3 scripts/update_recitations.py
  3. Çıktılar: public/recitations/<id>.m4a  +  public/recitations.json

Ne yapar:
  - yt-dlp ile sesi (m4a, 128k AAC) ve Arapça otomatik altyazıyı (json3, kelime
    zaman damgalı) indirir. Daha önce inmiş dosyaları atlar.
  - Altyazı metnini normalize edip meal.json'daki 114 sûre ile karşılaştırır,
    okunan sûreyi otomatik bulur.
  - Kelime dizilimini sûre metniyle hizalayıp (difflib) her ayetin başlangıç/bitiş
    milisaniyesini çıkarır -> uygulama ses çalarken doğru ayet + meali gösterir.
  - Altyazı yoksa ya da hizalama zayıfsa kayıt yine eklenir; uygulama o kayıtta
    sadece dalga görselleştirici gösterir.
"""
import json
import re
import subprocess
import sys
import shutil
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "scripts" / "recitation_sources.txt"
CACHE = ROOT / "scripts" / ".recitation_cache"
AUDIO_DIR = ROOT / "public" / "recitations"
MANIFEST = ROOT / "public" / "recitations.json"
MEAL = ROOT / "public" / "meal.json"
DEFAULT_RECITER = "Yasser Al-Dosari"

# ---------------------------------------------------------------- yardımcılar
# TikTok "Unable to extract universal data for rehydration" hatasının bilinen çözümü
YTDLP_ARGS = ["--extractor-args", "tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com"]

def yt_dlp():
    for c in (shutil.which("yt-dlp"), "/home/abd/.local/bin/yt-dlp"):
        if c and Path(c).exists():
            return c
    sys.exit("yt-dlp bulunamadı. Kur: https://github.com/yt-dlp/yt-dlp")

def run_ytdlp(args, **kw):
    return subprocess.run([yt_dlp(), *YTDLP_ARGS, *args],
                          capture_output=True, text=True, **kw)

def video_id(url: str) -> str:
    # YouTube
    m = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", url)
    if m:
        return m.group(1)
    # TikTok (video/photo)
    m = re.search(r"tiktok\.com/[^/]+/(?:video|photo)/(\d+)", url)
    if m:
        return f"tt{m.group(1)}"
    # Bilinmeyen site: id'yi yt-dlp'den al
    out = run_ytdlp(["--print", "id", "--no-download", url])
    vid = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else ""
    if not vid:
        raise RuntimeError(f"Video id çıkarılamadı: {url}")
    return re.sub(r"[^\w-]", "_", vid)

# Arapça normalizasyon: hareke/vakf işaretlerini at, harf varyantlarını birleştir.
_DIACRITICS = re.compile(r"[ً-ٰٟۖ-ۭ࣓-ࣿـ]")
_ALEF = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
                       "ى": "ي", "ئ": "ي", "ؤ": "و", "ة": "ه"})

def norm(text: str):
    text = _DIACRITICS.sub("", text).translate(_ALEF)
    return [w for w in re.split(r"[^ء-ي]+", text) if w]

# ------------------------------------------------------------------- indirme
def download(vid: str, url: str) -> dict:
    """Ses + altyazı + metadata indir (varsa atla). Meta döndürür."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    audio = AUDIO_DIR / f"{vid}.m4a"
    meta_f = CACHE / f"{vid}.info.json"
    subs_f = CACHE / f"{vid}.ar.json3"

    if not meta_f.exists():
        print(f"  metadata çekiliyor…")
        out = run_ytdlp(["-j", "--no-download", url], check=True).stdout
        d = json.loads(out)
        meta_f.write_text(json.dumps({
            "title": d.get("title"), "channel": d.get("channel"),
            "duration": d.get("duration")}, ensure_ascii=False))

    if not audio.exists():
        print(f"  ses indiriliyor…")
        # Her siteyle çalışır: en iyi sesi al, m4a değilse ffmpeg ile m4a'ya çevir.
        # Not: TikTok'un bytevc1 (h265) dosyalarında ses izi fiilen yok; h264'ü tercih et.
        run_ytdlp(["-f", "140/bestaudio[ext=m4a]/bestaudio/b[vcodec^=h264]/b",
                   "-x", "--audio-format", "m4a", "--audio-quality", "128K",
                   "-o", str(AUDIO_DIR / f"{vid}.%(ext)s"), url], check=True)

    if not any(CACHE.glob(f"{vid}.ar*")):
        print(f"  altyazı indiriliyor…")
        run_ytdlp(["--skip-download", "--write-auto-subs",
                   "--write-subs", "--sub-langs", "ar.*,ar",
                   "--sub-format", "json3/vtt/best",
                   "-o", f"subtitle:{CACHE}/{vid}.%(ext)s", url])  # altyazı yoksa hata verme

    return json.loads(meta_f.read_text())

_VTT_TIME = re.compile(
    r"(?:(\d+):)?(\d\d):(\d\d)\.(\d{3})\s*-->\s*(?:(\d+):)?(\d\d):(\d\d)\.(\d{3})")

def _vtt_ms(h, m, s, ms):
    return (int(h or 0) * 3600 + int(m) * 60 + int(s)) * 1000 + int(ms)

def caption_words(vid: str):
    """Altyazıdan [(ms, kelime)] listesi. Önce json3 (kelime bazlı), yoksa vtt."""
    f = CACHE / f"{vid}.ar.json3"
    if f.exists():
        words = []
        for e in json.loads(f.read_text()).get("events", []):
            t0 = e.get("tStartMs", 0)
            for s in e.get("segs") or []:
                w = s.get("utf8", "").strip()
                if w and w != "\n":
                    words.append((t0 + s.get("tOffsetMs", 0), w))
        return words

    # vtt: satır zamanını satırdaki kelimelere doğrusal dağıt
    vtts = sorted(CACHE.glob(f"{vid}.ar*.vtt"))
    if not vtts:
        return []
    words = []
    cur = None
    for line in vtts[0].read_text().splitlines():
        m = _VTT_TIME.search(line)
        if m:
            cur = (_vtt_ms(*m.groups()[:4]), _vtt_ms(*m.groups()[4:]))
            continue
        line = line.strip()
        if cur and line and not line.startswith(("WEBVTT", "NOTE", "Kind:", "Language:")):
            toks = line.split()
            t0, t1 = cur
            for i, w in enumerate(toks):
                words.append((t0 + (t1 - t0) * i // max(1, len(toks)), w))
    return words

# ------------------------------------------------------------------ hizalama
def detect_surah(cap_tokens, surahs):
    """Bigram kesişimine göre en olası sûre."""
    cap_bi = {(cap_tokens[i], cap_tokens[i + 1]) for i in range(len(cap_tokens) - 1)}
    best, best_score = None, 0.0
    for s in surahs:
        toks = [t for a in s["ayetler"] for t in norm(a["ar"])]
        bi = {(toks[i], toks[i + 1]) for i in range(len(toks) - 1)}
        if not bi:
            continue
        score = len(cap_bi & bi) / max(1, len(cap_bi))
        if score > best_score:
            best, best_score = s, score
    return best, best_score

def align(cap, surah):
    """cap: [(ms, kelime)] -> [{ayahIndex, a_no, startMs, endMs}]"""
    cap_toks = [t for _, w in cap for t in norm(w)]
    cap_ms = []
    for ms, w in cap:
        for _ in norm(w):
            cap_ms.append(ms)

    ay_toks, ay_of_tok = [], []
    for idx, a in enumerate(surah["ayetler"]):
        for t in norm(a["ar"]):
            ay_toks.append(t)
            ay_of_tok.append(idx)

    sm = SequenceMatcher(None, cap_toks, ay_toks, autojunk=False)
    hits = {}   # ayahIndex -> [ms, ...]
    matched = {}
    for i, j, n in sm.get_matching_blocks():
        for k in range(n):
            idx = ay_of_tok[j + k]
            hits.setdefault(idx, []).append(cap_ms[i + k])
            matched[idx] = matched.get(idx, 0) + 1

    total = {}
    for idx in ay_of_tok:
        total[idx] = total.get(idx, 0) + 1

    segs = []
    for idx in sorted(hits):
        if matched[idx] / total[idx] < 0.35:   # zayıf eşleşme: ayet okunmamış say
            continue
        segs.append({"ayahIndex": idx,
                     "a_no": str(surah["ayetler"][idx]["a_no"]),
                     "startMs": min(hits[idx]),
                     "endMs": max(hits[idx])})

    # bitişleri bir sonraki ayetin başına uzat (aradaki tekrarlar/nefesler kaybolmasın)
    for k in range(len(segs) - 1):
        segs[k]["endMs"] = segs[k + 1]["startMs"]
    return segs

# ---------------------------------------------------------------------- main
def main():
    if not SOURCES.exists():
        sys.exit(f"{SOURCES} yok. Her satıra bir YouTube linki yaz.")
    surahs = json.loads(MEAL.read_text())
    items = []

    for line in SOURCES.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        url = parts[0]
        reciter = parts[1] if len(parts) > 1 and parts[1] else DEFAULT_RECITER
        title_override = parts[2] if len(parts) > 2 and parts[2] else None

        # YEREL DOSYA: satır http ile başlamıyorsa dosya yolu kabul et.
        # Dosya public/recitations/ içine kopyalanır; kaynak sonradan silinse de
        # kopya durduğu sürece kayıt korunur. Ayet takibi yok (altyazı olmadığından).
        if not url.startswith(("http://", "https://")):
            src = Path(url).expanduser()
            name = re.sub(r"[^\w.-]", "_", src.name)
            dest = AUDIO_DIR / name
            print(f"» {dest.stem} (yerel dosya)")
            if not dest.exists():
                if not src.exists():
                    print(f"  ✗ Dosya bulunamadı, atlanıyor: {src}")
                    continue
                AUDIO_DIR.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
            dur = 0
            ffprobe = shutil.which("ffprobe") or "/home/abd/.local/bin/ffprobe"
            try:
                out = subprocess.run([ffprobe, "-v", "error", "-show_entries",
                                      "format=duration", "-of", "csv=p=0", str(dest)],
                                     capture_output=True, text=True, check=True).stdout
                dur = round(float(out.strip()))
            except Exception:
                pass
            items.append({
                "id": dest.stem,
                "youtubeUrl": "",
                "ytTitle": src.name,
                "reciter": reciter,
                "file": f"./recitations/{name}",
                "durationSec": dur,
                "title": title_override or dest.stem,
            })
            print("  ~ yerel kayıt eklendi (sade oynatıcı)")
            continue

        try:
            vid = video_id(url)
            print(f"» {vid}")
            meta = download(vid, url)
        except (RuntimeError, subprocess.CalledProcessError) as e:
            err = getattr(e, "stderr", "") or str(e)
            print(f"  ✗ İNDİRİLEMEDİ, atlanıyor: {url}\n    {err.strip().splitlines()[-1] if err.strip() else e}")
            continue

        item = {
            "id": vid,
            "youtubeUrl": f"https://www.youtube.com/watch?v={vid}",
            "ytTitle": meta.get("title", ""),
            "reciter": reciter,
            "file": f"./recitations/{vid}.m4a",
            "durationSec": meta.get("duration", 0),
        }

        cap = caption_words(vid)
        if len(cap) >= 20:
            cap_toks = [t for _, w in cap for t in norm(w)]
            surah, score = detect_surah(cap_toks, surahs)
            if surah and score > 0.25:
                segs = align(cap, surah)
                if len(segs) >= 2:
                    dur_ms = (meta.get("duration") or 0) * 1000
                    if dur_ms:
                        segs[-1]["endMs"] = max(segs[-1]["endMs"], dur_ms - 500)
                    first, last = segs[0]["a_no"], segs[-1]["a_no"]
                    item.update({
                        "surahId": surah["sure_no"],
                        "surahName": surah["sure_adi"],
                        "title": f"{surah['sure_adi']} {first}-{last.split(' - ')[-1]}",
                        "segments": segs,
                    })
                    print(f"  ✓ {surah['sure_adi']} {first}→{last} | {len(segs)} ayet eşleşti (skor {score:.2f})")
        if "segments" not in item:
            # hashtag/emoji temizle, kısalt
            t = re.sub(r"#\S+", "", meta.get("title") or vid)
            t = re.sub(r"[^\w\s'’\-.,:()ء-يÀ-ÿĞğİıÖöŞşÜüÇç]", "", t)
            t = re.sub(r"\s+", " ", t).strip() or vid
            item["title"] = t[:70]
            print("  ~ ayet eşleşmesi yok, sade oynatıcıda çalınacak")
        if title_override:
            item["title"] = title_override
        items.append(item)

    MANIFEST.write_text(json.dumps({"items": items}, ensure_ascii=False, indent=2))
    print(f"\n{MANIFEST.relative_to(ROOT)} yazıldı ({len(items)} kayıt).")

if __name__ == "__main__":
    main()
