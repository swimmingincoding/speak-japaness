import React from 'react';
import { SavedExpression } from '../types/conversation';
import { speakJapanese } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
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
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
          <Bookmark className="w-8 h-8" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">
          저장한 회화 표현이 아직 없어요
        </h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          롤플레잉 대화방에서 기억하고 싶은 손님 표현이나 점원의 접객 문장 옆의{' '}
          <strong className="text-indigo-600">북마크 아이콘</strong>을 누르면 이곳에 저장됩니다!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="px-1">
        <h2 className="text-lg font-extrabold text-slate-900">나만의 실전 표현 단어장</h2>
        <p className="text-xs text-slate-500 font-medium">
          일본 현지에서 바로 꺼내 쓸 문장과 점원의 단골 질문 모음 ({savedList.length}개)
        </p>
      </div>

      <div className="space-y-3">
        {savedList.map((item) => (
          <div
            key={item.id}
            className="rounded-[24px] bg-white border border-slate-200/80 p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                    item.speaker === 'customer'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {item.speaker === 'customer' ? (
                    <>
                      <User className="w-3 h-3" /> 손님(A) 표현
                    </>
                  ) : (
                    <>
                      <Store className="w-3 h-3" /> 점원(B) 표현
                    </>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[160px]">
                  {item.scenarioTitle}
                </span>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <FuriganaText
                text={item.japanese}
                showFurigana={true}
                className="text-lg font-black text-slate-900"
                rtClassName="text-[10.5px] font-bold text-indigo-600"
              />
              <div className="text-xs font-extrabold text-indigo-600">
                [{item.koreanPronunciation}]
              </div>
              <div className="text-sm font-bold text-slate-800 pt-0.5">
                {item.koreanTranslation}
              </div>
            </div>

            {item.realLifeTip && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                💡 {item.realLifeTip}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => speakJapanese(item.japanese, 0.75)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold cursor-pointer"
              >
                🐢 천천히 듣기
              </button>
              <button
                onClick={() => speakJapanese(item.japanese, ttsSpeed)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" /> 발음 듣기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
