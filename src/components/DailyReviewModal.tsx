import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Flame,
  Volume2,
  RotateCcw,
  Eye,
  EyeOff,
  Brain,
  Check,
} from 'lucide-react';
import {
  loadUserStreak,
  recordStudyCompletion,
  markDailyReviewCompletedToday,
  getDueReviewItems,
  updateSRSGrade,
  getWeekStudyStatus,
  UserStreakData,
  DueReviewCard,
} from '../utils/srsEngine';
import { speakJapanese, unlockSpeechForIOS } from '../utils/speech';
import { SavedExpression } from '../types/conversation';
import { N3_VOCAB_LIST } from '../data/n3Vocab';
import { FuriganaText } from './FuriganaText';
import { RhythmicPronunciation } from './RhythmicPronunciation';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedExpressions: SavedExpression[];
  ttsSpeed?: number;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  isOpen,
  onClose,
  savedExpressions,
  ttsSpeed = 1.0,
}) => {
  const [streakData, setStreakData] = useState<UserStreakData>(() => loadUserStreak());
  const [sessionItems, setSessionItems] = useState<DueReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showFuriganaHint, setShowFuriganaHint] = useState<boolean>(true);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);

  // 모달 오픈 시점에 복습 세션 카드 목록을 고정(스냅샷)하여 도중에 순서가 뒤섞이지 않도록 보호
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStreakData(loadUserStreak());
      setSessionItems(getDueReviewItems(savedExpressions, N3_VOCAB_LIST, 5));
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsSessionComplete(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const weekStatus = useMemo(() => getWeekStudyStatus(streakData), [streakData]);
  const currentItem = sessionItems[currentIndex];

  // 카드 평가 및 다음 카드로 이동
  const handleGrade = (grade: 'hard' | 'good' | 'easy') => {
    if (!currentItem) return;

    updateSRSGrade(currentItem.id, grade, {
      title: currentItem.japanese,
      japanese: currentItem.japanese,
      furigana: currentItem.furigana,
      koreanPronunciation: currentItem.koreanPronunciation,
      koreanTranslation: currentItem.koreanTranslation,
      category: currentItem.category,
    });

    if (currentIndex + 1 < sessionItems.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      markDailyReviewCompletedToday();
      const updatedStreak = recordStudyCompletion(true);
      setStreakData(updatedStreak);
      setIsSessionComplete(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-[480px] max-h-[94dvh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)]">
        {/* 상단 핸들 바 & 깔끔한 화이트 헤더 */}
        <div className="pt-2.5 px-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2.5 sm:hidden" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">오늘의 3분 복습</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  연속 {streakData.currentStreak}일째 · 누적 {streakData.totalReviewsCompleted}회 완료
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 주간 미니 출석 바 */}
          <div className="grid grid-cols-7 gap-1.5 pt-3">
            {weekStatus.map((dayInfo) => (
              <div
                key={dayInfo.dateStr}
                className={`py-1 rounded-xl text-center flex flex-col items-center gap-0.5 border text-[10px] font-bold ${
                  dayInfo.isToday
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : dayInfo.isStudied
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
              >
                <span>{dayInfo.dayLabel}</span>
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    dayInfo.isStudied
                      ? 'bg-emerald-500 text-white'
                      : dayInfo.isToday
                      ? 'bg-indigo-200/70'
                      : 'bg-slate-200/60'
                  }`}
                >
                  {dayInfo.isStudied && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between smooth-scroll">
          {!isSessionComplete && currentItem ? (
            <div className="space-y-4">
              {/* 진행률 바 */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-500" />
                  오늘의 맞춤 복습 카드
                </span>
                <span className="text-indigo-600 font-extrabold">
                  {currentIndex + 1} / {sessionItems.length}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentIndex + 1) / Math.max(1, sessionItems.length)) * 100}%`,
                  }}
                />
              </div>

              {/* 플래시카드 영역 */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative min-h-[230px] rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 border shadow-md select-none ${
                  isFlipped
                    ? 'bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-700'
                    : 'bg-gradient-to-br from-white to-slate-50 text-slate-900 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* 상단 뱃지 및 발음 듣기 */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      isFlipped
                        ? 'bg-indigo-700/80 text-indigo-200'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}
                  >
                    {currentItem.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFuriganaHint(!showFuriganaHint);
                      }}
                      className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isFlipped
                          ? 'bg-white/10 hover:bg-white/20 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title="후리가나·발음 힌트 토글"
                    >
                      {showFuriganaHint ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unlockSpeechForIOS();
                        speakJapanese(currentItem.japanese, ttsSpeed);
                      }}
                      className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-2xs"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 중앙 콘텐츠: 일본어(후리가나 루비 지원) or 한국어 뜻 */}
                <div className="text-center py-4 space-y-2">
                  {!isFlipped ? (
                    <>
                      <div>
                        <FuriganaText
                          text={currentItem.japanese}
                          showFurigana={showFuriganaHint}
                          className="text-2xl sm:text-3xl font-black tracking-tight leading-relaxed text-slate-900"
                          rtClassName="text-[11px] font-bold text-indigo-600"
                        />
                      </div>
                      {showFuriganaHint && (
                        <div className="flex justify-center animate-fadeIn">
                          <RhythmicPronunciation
                            pronunciation={currentItem.koreanPronunciation}
                            japanese={currentItem.japanese}
                            variant="compact"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2 animate-fadeIn">
                      <div className="text-xl sm:text-2xl font-black text-amber-300 leading-snug">
                        {currentItem.koreanTranslation}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {currentItem.japanese} ({currentItem.furigana})
                      </div>
                      <RhythmicPronunciation
                        pronunciation={currentItem.koreanPronunciation}
                        japanese={currentItem.japanese}
                        variant="dark"
                      />
                    </div>
                  )}
                </div>

                {/* 카드 하단 뒤집기 힌트 */}
                <div className="text-center">
                  <span
                    className={`text-[11px] font-bold flex items-center justify-center gap-1 ${
                      isFlipped ? 'text-indigo-300' : 'text-slate-400'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {isFlipped ? '탭하여 원문 카드로 뒤집기' : '💡 카드를 탭하여 뜻 확인하기'}
                  </span>
                </div>
              </div>

              {/* 자기 평가 버튼 */}
              {isFlipped ? (
                <div className="space-y-1.5 animate-fadeIn">
                  <span className="text-[11px] font-bold text-slate-500 block text-center">
                    암기 난이도를 선택하면 망각곡선 복습 주기가 자동 조정됩니다:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleGrade('hard')}
                      className="py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs transition cursor-pointer text-center"
                    >
                      <div>❌ 어려움</div>
                      <div className="text-[10px] text-rose-500 font-normal mt-0.5">
                        최우선 재복습
                      </div>
                    </button>
                    <button
                      onClick={() => handleGrade('good')}
                      className="py-3 px-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs transition cursor-pointer text-center"
                    >
                      <div>⚡ 보통</div>
                      <div className="text-[10px] text-indigo-500 font-normal mt-0.5">
                        3~7일 후 복습
                      </div>
                    </button>
                    <button
                      onClick={() => handleGrade('easy')}
                      className="py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs transition cursor-pointer text-center"
                    >
                      <div>✨ 완벽 암기</div>
                      <div className="text-[10px] text-emerald-600 font-normal mt-0.5">
                        14~30일 후 복습
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  정답 확인하기
                </button>
              )}
            </div>
          ) : (
            /* 복습 완료 축하 화면 */
            <div className="py-6 text-center space-y-4 animate-fadeIn my-auto">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 mx-auto flex items-center justify-center text-white text-4xl shadow-xl shadow-orange-500/30">
                🎉
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  오늘의 망각곡선 복습 완료!
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  망각곡선 주기에 맞춰 기억이 강화되었으며 오늘의 출석 도장이 찍혔습니다.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl max-w-xs mx-auto text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-orange-900">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    연속 학습 스트릭
                  </span>
                  <span className="font-black text-orange-600 text-sm">
                    {streakData.currentStreak}일 연속 달성!
                  </span>
                </div>
                <p className="text-[11px] text-orange-700 leading-relaxed font-medium">
                  롤플레잉 대화나 N3 퀴즈에서 틀린 단어도 내일 복습 카드에 자동으로 준비됩니다.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full max-w-xs py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 text-white font-black rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-indigo-500/25 mx-auto block"
              >
                복습 완료 및 닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
