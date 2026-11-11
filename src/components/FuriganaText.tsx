import React from 'react';
import { parseJapaneseToRubySegments } from '../utils/japanesePhonetics';

interface FuriganaTextProps {
  text: string;
  showFurigana?: boolean;
  className?: string;
  rtClassName?: string;
}

export const FuriganaText: React.FC<FuriganaTextProps> = ({
  text,
  showFurigana = true,
  className = '',
  rtClassName = 'text-[10.5px] font-bold text-indigo-600 select-none',
}) => {
  if (!showFurigana) {
    return <span className={className}>{text}</span>;
  }

  const segments = parseJapaneseToRubySegments(text);

  return (
    <span className={`inline-block leading-[2.25] ${className}`}>
      {segments.map((seg, idx) =>
        seg.furigana ? (
          <ruby key={idx} className="mx-[1.5px]">
            {seg.text}
            <rt className={rtClassName}>{seg.furigana}</rt>
          </ruby>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        )
      )}
    </span>
  );
};
