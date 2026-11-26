import React from 'react';
import { kanaToKoreanPronunciation } from '../utils/japanesePhonetics';

export interface RhythmicPronunciationProps {
  pronunciation?: string;
  japanese: string;
  variant?: 'default' | 'compact' | 'dark' | 'big' | 'bubble-user';
  className?: string;
}

/**
 * 일본어 문장의 한글 발음을 어절(박자) 단위로 띄어 보여주고
 * 사이에 은은한 호흡 점(·)을 표시하는 공용 발음 가이드 컴포넌트입니다.
 * (클립보드 드래그·복사 시에는 호흡 점이 제외되어 순수 텍스트만 복사됩니다.)
 */
export const RhythmicPronunciation: React.FC<RhythmicPronunciationProps> = ({
  pronunciation,
  japanese,
  variant = 'default',
  className = '',
}) => {
  const raw = pronunciation?.trim() || '';
  const cleanPron =
    raw && (japanese.length < 7 || raw.includes(' '))
      ? raw
      : kanaToKoreanPronunciation(japanese);

  const chunks = cleanPron
    .replace(/^\[|\]$/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (chunks.length === 0) return null;

  const variantTextClass =
    variant === 'big'
      ? 'text-base sm:text-lg font-extrabold text-amber-300 leading-relaxed justify-center'
      : variant === 'dark'
      ? 'text-xs sm:text-sm font-extrabold text-amber-300 leading-relaxed justify-center'
      : variant === 'bubble-user'
      ? 'text-xs sm:text-[13px] font-extrabold text-amber-200 leading-relaxed'
      : variant === 'compact'
      ? 'text-xs sm:text-[13px] font-extrabold text-indigo-600 leading-relaxed'
      : 'text-[14px] sm:text-[15px] font-extrabold text-indigo-700 leading-relaxed';

  const dotClass =
    variant === 'big' || variant === 'dark' || variant === 'bubble-user'
      ? 'text-amber-400/55 font-normal select-none mx-0.5'
      : 'text-indigo-300 font-normal select-none mx-0.5';

  return (
    <div className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 ${variantTextClass} ${className}`}>
      {chunks.map((chunk, idx) => {
        const isLast = idx === chunks.length - 1;
        const endsWithPunct = /[,?.!，。？！~/]$/.test(chunk);
        return (
          <React.Fragment key={idx}>
            <span className="tracking-tight">{chunk}</span>
            {!isLast && !endsWithPunct && (
              <span aria-hidden="true" className={dotClass}>
                ·
              </span>
            )}
            {!isLast && endsWithPunct && <span className="w-1" aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
