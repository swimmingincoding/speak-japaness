import React, { useState, useMemo } from 'react';
import { N3_VOCAB_LIST, N3WordItem, N3PartType } from '../data/n3Vocab';
import { speakJapanese } from '../utils/speech';
import { updateSRSGrade } from '../utils/srsEngine';
import { FuriganaText } from './FuriganaText';
import { RhythmicPronunciation } from './RhythmicPronunciation';
import {
  Volume2,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Filter,
} from 'lucide-react';

interface N3StudyRoomProps {
  ttsSpeed: number;
  masteredIds: Set<string>;
  onToggleMastered: (id: string) => void;
  onStudyActivity?: () => void;
}

export const N3StudyRoom: React.FC<N3StudyRoomProps> = ({
  ttsSpeed,
  masteredIds,
  onToggleMastered,
  onStudyActivity,
}) => {
  const [studyMode, setStudyMode] = useState<'list' | 'flashcard' | 'quiz'>('list');
  const [partFilter, setPartFilter] = useState<N3PartType | 'all'>('all');
  const [onlyUnmastered, setOnlyUnmastered] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideMeaningInList, setHideMeaningInList] = useState<boolean>(false);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

  const [cardIndex, setCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  const [quizTargetIndex, setQuizTargetIndex] = useState<number>(0);
  const [quizType, setQuizType] = useState<'reading' | 'meaning'>('reading');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });

  const filteredList: N3WordItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return N3_VOCAB_LIST.filter((w) => {
      if (partFilter !== 'all' && w.partOfSpeech !== partFilter) return false;
      if (onlyUnmastered && masteredIds.has(w.id)) return false;
      if (!q) return true;
      return (
        w.word.toLowerCase().includes(q) ||
        w.furigana.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        w.koreanPronunciation.toLowerCase().includes(q)
      );
    });
  }, [partFilter, onlyUnmastered, masteredIds, searchQuery]);

  const unmasteredPool = useMemo(
    () => N3_VOCAB_LIST.filter((w) => !masteredIds.has(w.id)),
    [masteredIds]
  );

  const activeQuizPool =
    onlyUnmastered && unmasteredPool.length > 0 ? unmasteredPool : N3_VOCAB_LIST;

  const currentCard =
    filteredList.length > 0
      ? filteredList[cardIndex % filteredList.length]
      : N3_VOCAB_LIST[0];
  const currentQuizWord = activeQuizPool[quizTargetIndex % activeQuizPool.length];

  const getQuizChoices = (target: N3WordItem) => {
    const others = N3_VOCAB_LIST.filter((w) => w.id !== target.id);
    const rotated = [
      others[(quizTargetIndex * 2) % others.length],
      others[(quizTargetIndex * 2 + 3) % others.length],
      others[(quizTargetIndex * 2 + 7) % others.length],
    ];
    const options = [...rotated];
    options.splice((quizTargetIndex * 3 + 1) % 4, 0, target);
    return options;
  };

  const handleSelectQuizOption = (choiceId: string) => {
    if (selectedChoice) return;
    setSelectedChoice(choiceId);
    const isCorrect = choiceId === currentQuizWord.id;
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    updateSRSGrade(currentQuizWord.id, isCorrect ? 'good' : 'hard', {
      title: currentQuizWord.word,
      japanese: currentQuizWord.word,
      furigana: currentQuizWord.furigana,
      koreanPronunciation: currentQuizWord.koreanPronunciation,
      koreanTranslation: currentQuizWord.meaning,
      category: 'N3 퀴즈 복습',
    });
    onStudyActivity?.();
    speakJapanese(currentQuizWord.word, ttsSpeed);
  };

  const handleNextQuiz = () => {
    setSelectedChoice(null);
    setQuizType((prev) => (prev === 'reading' ? 'meaning' : 'reading'));
    setQuizTargetIndex((prev) => prev + 1);
  };

  const unmasteredCount = N3_VOCAB_LIST.length - masteredIds.size;

  return (
    <div className="space-y-3.5">
      {/* 컴팩트 3모드 선택 바 + 미암기 집중 토글 */}
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs flex-1">
          {(
            [
              { id: 'list', label: '단어 목록' },
              { id: 'flashcard', label: '플래시카드' },
              { id: 'quiz', label: '4지선다 퀴즈' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setStudyMode(m.id);
                setIsCardFlipped(false);
                setSelectedChoice(null);
              }}
              className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                studyMode === m.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setOnlyUnmastered((p) => !p);
            setCardIndex(0);
            setSelectedChoice(null);
          }}
          className={`px-3 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1 border shrink-0 transition cursor-pointer ${
            onlyUnmastered
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-slate-200/80 text-slate-600'
          }`}
          title="아직 암기 체크하지 않은 단어만 집중 학습"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>미암기({unmasteredCount})</span>
        </button>
      </div>

      {/* 모드 1: 깔끔한 단어 목록 (검색 + 정밀 루비 + 접이식 한자 해설) */}
      {studyMode === 'list' && (
        <div className="space-y-3">
          {/* 빠른 단어 검색창 */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="한자 · 뜻 · 발음으로 단어 검색..."
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-[16px] sm:text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
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

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: '전체' },
                  { id: 'noun', label: '명사' },
                  { id: 'verb', label: '동사' },
                  { id: 'adj', label: '형용사' },
                  { id: 'expression', label: '표현' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPartFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0 cursor-pointer transition ${
                    partFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setHideMeaningInList((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shrink-0 border cursor-pointer ${
                hideMeaningInList
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {hideMeaningInList ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> 보기
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> 암기모드
                </>
              )}
            </button>
          </div>

          {filteredList.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200/80 p-8 text-center space-y-2.5">
              <p className="text-sm font-extrabold text-slate-800">
                {onlyUnmastered && !searchQuery
                  ? '🎉 선택한 품사의 모든 단어를 암기 완료했어요!'
                  : '일치하는 단어가 없습니다.'}
              </p>
              {(onlyUnmastered || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyUnmastered(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-extrabold cursor-pointer"
                >
                  전체 단어 다시 보기
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredList.map((item) => {
                const isMastered = masteredIds.has(item.id);
                const isExpanded = expandedWordId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl bg-white border p-4 space-y-2.5 shadow-2xs transition ${
                      isMastered ? 'border-emerald-300 bg-emerald-50/15' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => setExpandedWordId(isExpanded ? null : item.id)}
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <FuriganaText
                          text={item.word}
                          showFurigana={!hideMeaningInList}
                          className="text-xl font-black text-slate-900"
                          rtClassName="text-[10.5px] font-bold text-indigo-600"
                        />

                        {!hideMeaningInList ? (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
                            <span className="text-sm font-extrabold text-slate-800">
                              {item.meaning}
                            </span>
                            <span className="text-xs font-bold text-indigo-600">
                              [{item.koreanPronunciation}]
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-amber-600">
                            탭하여 한자 풀이·예문 확인
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => speakJapanese(item.word, ttsSpeed)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-600 transition cursor-pointer"
                          title="발음 듣기"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleMastered(item.id)}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isMastered
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600'
                          }`}
                          title={isMastered ? '암기 완료' : '암기 체크'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedWordId(isExpanded ? null : item.id)}
                      className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      {isExpanded ? '한자 풀이 · 예문 접기 ▲' : '한자 훈음 · 실전 예문 보기 ▼'}
                    </button>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-fadeIn">
                        <div className="space-y-1.5">
                          {item.kanjiBreakdown.map((k, kIdx) => (
                            <div
                              key={kIdx}
                              className="rounded-2xl bg-slate-50 p-3 flex items-center gap-3 text-xs"
                            >
                              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg font-black text-indigo-600 shrink-0">
                                {k.kanji}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-extrabold text-slate-900">
                                  {k.meaningKo}{' '}
                                  <span className="font-medium text-slate-500">
                                    (음: {k.onyomi} / 훈: {k.kunyomi})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {k.strokeOrTip}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-3 flex items-center justify-between gap-2">
                          <div className="space-y-1 text-xs">
                            <FuriganaText
                              text={item.exampleJp}
                              showFurigana={true}
                              className="font-black text-slate-900 text-sm"
                              rtClassName="text-[10px] font-bold text-indigo-600"
                            />
                            <RhythmicPronunciation
                              pronunciation={item.exampleKoPron}
                              japanese={item.exampleJp}
                              variant="compact"
                            />
                            <div className="text-xs font-semibold text-slate-700">
                              {item.exampleKo}
                            </div>
                          </div>
                          <button
                            onClick={() => speakJapanese(item.exampleJp, ttsSpeed)}
                            className="p-2 rounded-xl bg-white border border-indigo-200 text-indigo-600 shrink-0 cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 모드 2: 플래시카드 */}
      {studyMode === 'flashcard' && (
        <div className="space-y-3.5">
          {filteredList.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200/80 p-8 text-center space-y-2.5">
              <p className="text-sm font-extrabold text-slate-800">
                🎉 모든 단어를 암기 완료했어요!
              </p>
              <button
                type="button"
                onClick={() => setOnlyUnmastered(false)}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-extrabold cursor-pointer"
              >
                전체 플래시카드 복습하기
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold">
                <span>카드를 터치하면 뜻이 보입니다</span>
                <span className="text-slate-900">
                  {(cardIndex % filteredList.length) + 1} / {filteredList.length}
                </span>
              </div>

              <div
                onClick={() => setIsCardFlipped((prev) => !prev)}
                className="min-h-[300px] rounded-3xl bg-white border border-slate-200 p-6 flex flex-col justify-between items-center text-center shadow-sm cursor-pointer select-none transition"
              >
                <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{onlyUnmastered ? '미암기 집중 카드' : 'JLPT N3'}</span>
                  <span className="flex items-center gap-1 text-indigo-600">
                    <RotateCw className="w-3.5 h-3.5" /> 뒤집기
                  </span>
                </div>

                {!isCardFlipped ? (
                  <div className="my-auto space-y-3">
                    <div className="text-5xl font-black text-slate-900 tracking-wider">
                      {currentCard.word}
                    </div>
                    <p className="text-xs text-slate-400">읽는 법과 뜻을 떠올려 보세요</p>
                  </div>
                ) : (
                  <div className="my-auto space-y-3 w-full text-center animate-fadeIn">
                    <div className="text-3xl font-black text-slate-900">{currentCard.word}</div>
                    <div className="text-sm font-extrabold text-indigo-600">
                      {currentCard.furigana} · [{currentCard.koreanPronunciation}]
                    </div>
                    <div className="text-lg font-black text-emerald-700">
                      {currentCard.meaning}
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-700 text-left">
                      <FuriganaText
                        text={currentCard.exampleJp}
                        showFurigana={true}
                        className="font-bold"
                      />
                      <div className="text-slate-500 mt-0.5">{currentCard.exampleKo}</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakJapanese(currentCard.word, ttsSpeed);
                  }}
                  className="px-4 py-2 rounded-full bg-indigo-600 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" /> 발음 듣기
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setIsCardFlipped(false);
                    setCardIndex(
                      (prev) => (prev - 1 + filteredList.length) % filteredList.length
                    );
                  }}
                  className="py-3 rounded-2xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>

                <button
                  onClick={() => onToggleMastered(currentCard.id)}
                  className={`py-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer ${
                    masteredIds.has(currentCard.id)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-200 text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {masteredIds.has(currentCard.id) ? '암기됨' : '암기체크'}
                </button>

                <button
                  onClick={() => {
                    setIsCardFlipped(false);
                    setCardIndex((prev) => (prev + 1) % filteredList.length);
                  }}
                  className="py-3 rounded-2xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 모드 3: 4지선다 퀴즈 */}
      {studyMode === 'quiz' && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {quizType === 'reading' ? '한자 읽기 퀴즈' : '단어 뜻 퀴즈'}
              {onlyUnmastered && unmasteredPool.length > 0 ? ' · 미암기 집중' : ''}
            </span>
            <span className="text-slate-600 font-extrabold">
              정답 {quizScore.correct} / {quizScore.total}
            </span>
          </div>

          <div className="py-6 text-center space-y-1.5 bg-slate-50 rounded-2xl">
            <div className="text-4xl font-black text-slate-900">{currentQuizWord.word}</div>
            <div className="text-xs text-slate-500">
              {quizType === 'reading'
                ? '올바른 발음을 선택하세요'
                : `(${currentQuizWord.furigana}) 알맞은 뜻을 선택하세요`}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {getQuizChoices(currentQuizWord).map((choice) => {
              const isSelected = selectedChoice === choice.id;
              const isCorrect = choice.id === currentQuizWord.id;
              let btnStyle =
                'bg-slate-50 hover:bg-indigo-50/60 border-slate-200 text-slate-800 font-bold';
              if (selectedChoice) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-50 border-rose-400 text-rose-800 font-bold';
                }
              }

              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectQuizOption(choice.id)}
                  className={`p-3.5 rounded-2xl border text-left text-sm transition cursor-pointer ${btnStyle}`}
                >
                  {quizType === 'reading'
                    ? `${choice.furigana} [${choice.koreanPronunciation}]`
                    : choice.meaning}
                </button>
              );
            })}
          </div>

          {selectedChoice && (
            <button
              onClick={handleNextQuiz}
              className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs cursor-pointer"
            >
              다음 문제 →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
