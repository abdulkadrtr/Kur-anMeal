export const ARABIC_RUN_SOURCE = '[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]+';

export const formatTurkishText = (text: string): string => {
  return text
    .replace(
      /\(([^)]+)\)/g,
      '<span class="text-light-secondary dark:text-dark-secondary font-normal opacity-90">($1)</span>'
    )
    .replace(
      new RegExp(ARABIC_RUN_SOURCE, 'g'),
      '<span class="font-arabic text-[1.15em]">$&</span>'
    );
};
