import React, { useState, useMemo } from 'react';
import { SavedExpression } from '../types/conversation';
import { speakJapanese } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
import { RhythmicPronunciation } from './RhythmicPronunciation';
import {
  Bookmark,
  Trash2,
  Volume2,
  User,
  Store,
  Ticket,
  Search,
  X,
  Maximize2,
} from 'lucide-react';

interface SavedExpressionsProps {
  savedList: SavedExpression[];
  onRemove: (id: string) => void;
  ttsSpeed: number;
  onOpenCheatSheet?: () => void;
  onOpenDailyReview?: () => void;
}

type SavedFilterType = 'all' | 'customer' | 'staff' | 'translator';

export const SavedExpressions: React.FC<SavedExpressionsProps> = ({
  savedList,
  onRemove,
  ttsSpeed,
  onOpenCheatSheet,
  onOpenDailyReview,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<SavedFilterType>('all');
  const [bigScreenItem, setBigScreenItem] = useState<SavedExpression | null>(null);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return savedList.filter((item) => {
      if (filterType === 'customer' && item.speaker !== 'customer') return false;
      if (filterType === 'staff' && item.speaker !== 'staff') return false;
      if (
        filterType === 'translator' &&
        item.scenarioId !== 'translator' &&
        item.scenarioId !== 'menu_scanner'
      ) {
        return false;
      }

      if (!q) return true;
      return (
        item.koreanTranslation.toLowerCase().includes(q) ||
        item.japanese.toLowerCase().includes(q) ||
        item.koreanPronunciation.toLowerCase().includes(q) ||
        item.scenarioTitle.toLowerCase().includes(q)
      );
    });
  }, [savedList, searchQuery, filterType]);

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
            롤플레잉 대화방이나 번역기·메뉴판 스캐너에서 기억하고 싶은 문장의{' '}
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
    <div className="space-y-3.5 pb-28">
      <div className="px-1 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-slate-900">
            내 표현 보관함 ({savedList.length})
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            저장한 문장을 검색하거나 점원에게 바로 크게 보여주세요
          </p>
        </div>

        {onOpenCheatSheet && (
          <button
            onClick={onOpenCheatSheet}
            className="px-3 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title="아이폰 잠금화면 치트시트 만들기"
          >
            <Ticket className="w-3.5 h-3.5 text-amber-300" />
            <span>잠금화면 저장</span>
          </button>
        )}
      </div>

      {/* 빠른 검색 & 출처/역할 필터 바 */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="저장한 한국어 뜻·일본어·발음으로 빠른 검색..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-[16px] sm:text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `전체 (${savedList.length})` },
              { id: 'customer', label: '🙋‍♂️ 손님 표현' },
              { id: 'staff', label: '🧑‍🍳 점원 표현' },
              { id: 'translator', label: '🌐 번역·스캔 북마크' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition cursor-pointer ${
                filterType === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          조건에 일치하는 저장 표현이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] bg-white border border-slate-200/80 p-5 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 ${
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
                  <span className="text-[11px] text-slate-400 font-semibold truncate">
                    {item.scenarioTitle}
                  </span>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <FuriganaText
                  text={item.japanese}
                  showFurigana={true}
                  className="text-lg font-black text-slate-900"
                  rtClassName="text-[10.5px] font-bold text-indigo-600"
                />
                <RhythmicPronunciation
                  pronunciation={item.koreanPronunciation}
                  japanese={item.japanese}
                />
                <div className="text-sm font-bold text-slate-800 pt-0.5">
                  {item.koreanTranslation}
                </div>
              </div>

              {item.realLifeTip && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  💡 {item.realLifeTip}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => setBigScreenItem(item)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> 큰 화면
                </button>
                <button
                  onClick={() => speakJapanese(item.japanese, 0.75)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold cursor-pointer"
                >
                  🐢 천천히
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
      )}

      {/* 점원에게 보여주는 전체화면 SOS 빅카드 (아이폰 16 프로 Safe-Area 대응) */}
      {bigScreenItem && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between pt-[calc(env(safe-area-inset-top,20px)+1.2rem)] px-6 pb-[calc(env(safe-area-inset-bottom,20px)+1.2rem)] animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="px-3.5 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-extrabold">
              🇯🇵 상대방에게 화면을 보여주세요
            </span>
            <button
              onClick={() => setBigScreenItem(null)}
              className="p-2.5 rounded-2xl bg-slate-800 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="my-auto space-y-6 text-center px-2">
            <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              すみません、これを読んでいただけますか？
            </p>
            <div className="py-2">
              <FuriganaText
                text={bigScreenItem.japanese}
                showFurigana={true}
                className="text-3xl sm:text-4xl font-black text-white break-keep"
                rtClassName="text-xs font-bold text-amber-300"
              />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <RhythmicPronunciation
                pronunciation={bigScreenItem.koreanPronunciation}
                japanese={bigScreenItem.japanese}
                variant="big"
              />
              <div className="text-sm text-emerald-300 pt-1 border-t border-slate-800">
                {bigScreenItem.koreanTranslation}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => speakJapanese(bigScreenItem.japanese, 0.95)}
              className="py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Volume2 className="w-5 h-5" /> 일본어 음성 크게 재생
            </button>
            <button
              onClick={() => setBigScreenItem(null)}
              className="py-4 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
