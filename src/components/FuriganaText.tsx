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
  rtClassName = 'text-[10px] font-medium text-rose-300 select-none',
}) => {
  if (!showFurigana) {
    return <span className={className}>{text}</span>;
  }

  const segments = parseJapaneseToRubySegments(text);

  return (
    <span className={`leading-[2.1] ${className}`}>
      {segments.map((seg, idx) =>
        seg.furigana ? (
          <ruby key={idx} className="mx-[1px] ruby-align-center">
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
