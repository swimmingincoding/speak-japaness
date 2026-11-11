import React from 'react';
import { SavedExpression } from '../types/conversation';
import { speakJapanese } from '../utils/speech';
import { Bookmark, Trash2, Volume2, User, Store } from 'lucide-react';

interface SavedExpressionsProps {
  savedList: SavedExpression[];
  onRemove: (id: string) => void;
  ttsSpeed: number;
}

export const SavedExpressions: React.FC<SavedExpressionsProps> = ({
  savedList,
  onRemove,
  ttsSpeed,
}) => {
  if (savedList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <Bookmark className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-200">저장한 회화 표현이 아직 없어요</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          롤플레잉 대화방에서 기억하고 싶은 손님 표현이나 점원의 접객 문장 옆의{' '}
          <strong className="text-rose-400">북마크 아이콘</strong>을 누르면 이곳에 차곡차곡 저장됩니다!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-white">나만의 실전 표현 단어장</h2>
          <p className="text-xs text-slate-400">
            일본 현지에서 바로 꺼내 쓸 문장과 점원의 단골 질문 모음 ({savedList.length}개)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {savedList.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    item.speaker === 'customer'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {item.speaker === 'customer' ? (
                    <>
                      <User className="w-3 h-3" /> 손님(A) 표현
                    </>
                  ) : (
                    <>
                      <Store className="w-3 h-3" /> 종업원(B) 표현
                    </>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                  {item.scenarioTitle}
                </span>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-base font-bold text-white leading-snug">{item.japanese}</div>
              <div className="text-xs text-slate-400">{item.furigana}</div>
              <div className="text-xs font-semibold text-amber-300">
                [{item.koreanPronunciation}]
              </div>
              <div className="text-sm font-medium text-emerald-300 pt-0.5">
                {item.koreanTranslation}
              </div>
            </div>

            {item.realLifeTip && (
              <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                💡 {item.realLifeTip}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => speakJapanese(item.japanese, 0.75)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium cursor-pointer"
              >
                🐢 천천히 듣기
              </button>
              <button
                onClick={() => speakJapanese(item.japanese, ttsSpeed)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" /> 원어민 발음 듣기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

