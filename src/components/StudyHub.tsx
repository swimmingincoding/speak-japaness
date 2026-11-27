import React, { useState, useMemo } from 'react';
import {
  UserStreakData,
  getWeekStudyStatus,
  getDueReviewItems,
  isDailyReviewCompletedToday,
} from '../utils/srsEngine';
import { SavedExpression } from '../types/conversation';
import { N3_VOCAB_LIST } from '../data/n3Vocab';
import { N3StudyRoom } from './N3StudyRoom';
import { KeigoGuide } from './KeigoGuide';
import { Flame, Check, Play } from 'lucide-react';

interface StudyHubProps {
  ttsSpeed: number;
  streakData: UserStreakData;
  masteredIds: Set<string>;
  savedExpressions: SavedExpression[];
  savedJapaneseSet: Set<string>;
  onToggleSave: (expr: SavedExpression) => void;
  onToggleMastered: (id: string) => void;
  onStudyActivity: () => void;
  onOpenDailyReview: () => void;
  initialSubTab?: 'n3' | 'keigo';
}

export const StudyHub: React.FC<StudyHubProps> = ({
  ttsSpeed,
  streakData,
  masteredIds,
  savedExpressions,
  savedJapaneseSet,
  onToggleSave,
  onToggleMastered,
  onStudyActivity,
  onOpenDailyReview,
  initialSubTab = 'n3',
}) => {
  const [subTab, setSubTab] = useState<'n3' | 'keigo'>(initialSubTab);
  const weekStatus = useMemo(() => getWeekStudyStatus(streakData), [streakData]);
  const dueItems = useMemo(
    () => getDueReviewItems(savedExpressions, N3_VOCAB_LIST, 5),
    [savedExpressions, streakData]
  );
  const reviewDoneToday = isDailyReviewCompletedToday();

  return (
    <div className="space-y-4 pb-28">
      {/* 1. 심플 주간 스트릭 & 오늘의 3분 복습 요약 카드 */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900">
                연속 학습 {streakData.currentStreak}일째
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {reviewDoneToday
                  ? '오늘의 망각곡선 3분 복습 완료!'
                  : `오늘 맞춤 복습 카드 ${dueItems.length}장 대기 중`}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenDailyReview}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition cursor-pointer shrink-0 ${
              reviewDoneToday
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {reviewDoneToday ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                <span>복습 완료</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>3분 복습 ({dueItems.length})</span>
              </>
            )}
          </button>
        </div>

        {/* 월~일 미니 출석 바 */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {weekStatus.map((d) => (
            <div
              key={d.dateStr}
              className={`py-1.5 rounded-xl flex flex-col items-center gap-1 border text-[10px] font-bold ${
                d.isToday
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : d.isStudied
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}
            >
              <span>{d.dayLabel}</span>
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  d.isStudied
                    ? 'bg-emerald-500 text-white'
                    : d.isToday
                    ? 'bg-indigo-200/70'
                    : 'bg-slate-200/60'
                }`}
              >
                {d.isStudied && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 깔끔한 2단 세그먼트 탭 (N3 단어장 vs 점원 접객어) */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-200/70">
        <button
          onClick={() => setSubTab('n3')}
          className={`py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'n3'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📚 N3 필수 단어 ({masteredIds.size}/{N3_VOCAB_LIST.length})
        </button>
        <button
          onClick={() => setSubTab('keigo')}
          className={`py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'keigo'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🛎️ 점원 단골 접객어
        </button>
      </div>

      {/* 3. 하위 콘텐츠 */}
      {subTab === 'n3' ? (
        <N3StudyRoom
          ttsSpeed={ttsSpeed}
          masteredIds={masteredIds}
          onToggleMastered={onToggleMastered}
          onStudyActivity={onStudyActivity}
        />
      ) : (
        <KeigoGuide
          ttsSpeed={ttsSpeed}
          savedJapaneseSet={savedJapaneseSet}
          onToggleSave={onToggleSave}
          onStudyActivity={onStudyActivity}
        />
      )}
    </div>
  );
};
