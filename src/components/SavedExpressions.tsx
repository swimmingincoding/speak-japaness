import React from 'react';
import { SavedExpression } from '../types/conversation';
import { speakJapanese } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
import { Bookmark, Trash2, Volume2, User, Store, Ticket, Download, Sparkles, Flame, Brain } from 'lucide-react';

interface SavedExpressionsProps {
  savedList: SavedExpression[];
  onRemove: (id: string) => void;
  ttsSpeed: number;
  onOpenCheatSheet?: () => void;
  onOpenDailyReview?: () => void;
}

export const SavedExpressions: React.FC<SavedExpressionsProps> = ({
  savedList,
  onRemove,
  ttsSpeed,
  onOpenCheatSheet,
  onOpenDailyReview,
}) => {
  if (savedList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
          <Bookmark className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-800">
            저장한 회화 표현이 아직 없어요
          </h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            롤플레잉 대화방에서 기억하고 싶은 손님 표현이나 점원의 접객 문장 옆의{' '}
            <strong className="text-indigo-600">북마크 아이콘</strong>을 누르면 이곳에 저장됩니다!
          </p>
        </div>

        {onOpenCheatSheet && (
          <button
            onClick={onOpenCheatSheet}
            className="mt-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs transition shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-amber-300" />
            <span>✈️ 여행 필수 골든 치트시트(1장 PNG) 만들기</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">나만의 실전 표현 단어장</h2>
          <p className="text-xs text-slate-500 font-medium">
            일본 현지에서 바로 꺼내 쓸 문장과 점원의 단골 질문 모음 ({savedList.length}개)
          </p>
        </div>

        {onOpenCheatSheet && (
          <button
            onClick={onOpenCheatSheet}
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs transition flex items-center gap-1.5 border border-indigo-200 cursor-pointer shadow-2xs shrink-0"
            title="고화질 1장 이미지로 내보내기"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>치트시트 1장 내보내기</span>
          </button>
        )}
      </div>

      {/* 망각곡선 일일 복습 배너 */}
      {onOpenDailyReview && (
        <div
          onClick={onOpenDailyReview}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md flex items-center justify-between cursor-pointer group hover:opacity-95 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-base group-hover:scale-105 transition shadow-2xs">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-white">
                  망각곡선 일일 복습 (오늘 5개)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-orange-600">
                  스트릭 유지
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                플래시카드로 복습하고 연속 학습 스트릭을 이어가세요!
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-white group-hover:translate-x-0.5 transition shrink-0">
            복습 시작 →
          </span>
        </div>
      )}

      {/* 치트시트 추천 배너 */}
      {onOpenCheatSheet && (
        <div
          onClick={onOpenCheatSheet}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex items-center justify-between cursor-pointer group hover:border-indigo-400 border border-slate-800 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 font-black text-base group-hover:scale-105 transition">
              📄
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-white">
                  저장한 문장으로 "여행 치트시트(PNG)" 만들기
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                  잠금화면용
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                보딩패스 / 도쿄 영수증 스타일 · 비행기 모드에서도 1초 만에 확인
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-300 group-hover:translate-x-0.5 transition shrink-0">
            만들기 →
          </span>
        </div>
      )}

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
