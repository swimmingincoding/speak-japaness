import React, { useState } from 'react';
import { N3_VOCAB_LIST, N3WordItem, N3PartType } from '../data/n3Vocab';
import { speakJapanese } from '../utils/speech';
import {
  BookOpen,
  Layers,
  Award,
  Volume2,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface N3StudyRoomProps {
  ttsSpeed: number;
  masteredIds: Set<string>;
  onToggleMastered: (id: string) => void;
}

export const N3StudyRoom: React.FC<N3StudyRoomProps> = ({
  ttsSpeed,
  masteredIds,
  onToggleMastered,
}) => {
  const [studyMode, setStudyMode] = useState<'list' | 'flashcard' | 'quiz'>('list');
  const [partFilter, setPartFilter] = useState<N3PartType | 'all'>('all');
  const [hideMeaningInList, setHideMeaningInList] = useState<boolean>(false);

  // 플래시카드 상태
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // 퀴즈 상태
  const [quizTargetIndex, setQuizTargetIndex] = useState<number>(0);
  const [quizType, setQuizType] = useState<'reading' | 'meaning'>('reading');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });

  const filteredList: N3WordItem[] =
    partFilter === 'all'
      ? N3_VOCAB_LIST
      : N3_VOCAB_LIST.filter((w) => w.partOfSpeech === partFilter);

  const currentCard = filteredList[cardIndex % filteredList.length] || N3_VOCAB_LIST[0];
  const currentQuizWord = N3_VOCAB_LIST[quizTargetIndex % N3_VOCAB_LIST.length];

  const getQuizChoices = (target: N3WordItem) => {
    const others = N3_VOCAB_LIST.filter((w) => w.id !== target.id).slice(0, 3);
    const combined = [target, ...others];
    // 결정론적 섞기 (id 및 인덱스 기반)
    return combined.sort((a, b) => a.id.localeCompare(b.id));
  };

  const handleSelectQuizOption = (choiceId: string) => {
    if (selectedChoice) return;
    setSelectedChoice(choiceId);
    const isCorrect = choiceId === currentQuizWord.id;
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    speakJapanese(currentQuizWord.word, ttsSpeed);
  };

  const handleNextQuiz = () => {
    setSelectedChoice(null);
    setQuizType((prev) => (prev === 'reading' ? 'meaning' : 'reading'));
    setQuizTargetIndex((prev) => (prev + 1) % N3_VOCAB_LIST.length);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* 1. 상단 N3 학습장 헤더 */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 p-5 shadow-xl border border-emerald-400/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 text-emerald-200 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" /> JLPT N3 핵심 어휘 & 한자 마스터
          </span>
          <span className="text-xs font-bold text-emerald-100">
            암기 완료: {masteredIds.size}/{N3_VOCAB_LIST.length} 단어
          </span>
        </div>

        <h2 className="text-xl font-extrabold text-white leading-snug">
          실전 여행과 회화에 바로 쓰이는 N3 필수 한자 & 단어장
        </h2>
        <p className="text-xs text-emerald-100/90 leading-relaxed">
          단순히 단어 뜻만 외우지 않고 각 한자의 <strong>음독(音読み)·훈독(訓読み) 원리</strong>와 실제 매장·역에서 쓰이는 회화 예문을 함께 익힙니다.
        </p>

        {/* 학습 모드 3종 스위치 */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950/50 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setStudyMode('list')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              studyMode === 'list'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-emerald-100 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> 한자·단어장
          </button>
          <button
            onClick={() => {
              setStudyMode('flashcard');
              setIsCardFlipped(false);
            }}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              studyMode === 'flashcard'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-emerald-100 hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> 플래시카드
          </button>
          <button
            onClick={() => {
              setStudyMode('quiz');
              setSelectedChoice(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              studyMode === 'quiz'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-emerald-100 hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> N3 한자 퀴즈
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 모드 1: 한자·단어 상세 리스트 모드 */}
      {/* ============================================================ */}
      {studyMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: '전체' },
                  { id: 'noun', label: '명사/한자어' },
                  { id: 'verb', label: '핵심 동사' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPartFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                    partFilter === tab.id
                      ? 'bg-white text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setHideMeaningInList((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 border cursor-pointer ${
                hideMeaningInList
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {hideMeaningInList ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> 읽기/뜻 보이기
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> 읽기/뜻 가리기(암기용)
                </>
              )}
            </button>
          </div>

          <div className="space-y-3.5">
            {filteredList.map((item) => {
              const isMastered = masteredIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-slate-900/95 border p-4 space-y-3 shadow-md transition ${
                    isMastered ? 'border-emerald-500/50' : 'border-slate-800'
                  }`}
                >
                  {/* 단어 상단 헤더 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {item.word}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          JLPT N3
                        </span>
                      </div>

                      {!hideMeaningInList ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-slate-300">
                            히라가나: <strong className="text-white">{item.furigana}</strong> · 발음:{' '}
                            <strong className="text-amber-300">[{item.koreanPronunciation}]</strong>
                          </div>
                          <div className="text-base font-extrabold text-emerald-300">
                            뜻: {item.meaning}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-400/90 py-1">
                          🙈 암기 테스트 중 (우측 상단 [읽기/뜻 보이기]를 눌러 확인하세요)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => speakJapanese(item.word, ttsSpeed)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white transition cursor-pointer"
                        title="단어 발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleMastered(item.id)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition cursor-pointer ${
                          isMastered
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isMastered ? '암기완료' : '암기체크'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 한자 쪼개기 (음독/훈독/암기팁) */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {item.kanjiBreakdown.map((k, kIdx) => (
                      <div
                        key={kIdx}
                        className="rounded-xl bg-slate-950/90 border border-slate-800/90 p-3 flex items-start gap-3"
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl font-black text-amber-300 shrink-0">
                          {k.kanji}
                        </div>
                        <div className="space-y-1 text-xs flex-1">
                          <div className="font-bold text-white">
                            한자 훈음: <span className="text-rose-300">{k.meaningKo}</span>
                          </div>
                          <div className="text-slate-300">
                            <span className="text-slate-400">음독:</span> {k.onyomi} ·{' '}
                            <span className="text-slate-400">훈독:</span> {k.kunyomi}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            💡 {k.strokeOrTip}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 실전 회화 예문 */}
                  <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 p-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-white">{item.exampleJp}</div>
                      {!hideMeaningInList && (
                        <>
                          <div className="text-[11px] text-amber-300">[{item.exampleKoPron}]</div>
                          <div className="text-[11px] text-emerald-300">{item.exampleKo}</div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => speakJapanese(item.exampleJp, ttsSpeed)}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-rose-600 text-white shrink-0 cursor-pointer"
                      title="예문 음성 듣기"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 모드 2: 한자 플래시카드 모드 */}
      {/* ============================================================ */}
      {studyMode === 'flashcard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>카드를 탭하면 히라가나 발음과 한자 풀이 뒷면이 나타납니다</span>
            <span className="font-bold text-white">
              {(cardIndex % filteredList.length) + 1} / {filteredList.length}
            </span>
          </div>

          <div
            onClick={() => setIsCardFlipped((prev) => !prev)}
            className="min-h-[320px] rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 p-6 flex flex-col justify-between items-center text-center shadow-2xl cursor-pointer select-none transition"
          >
            <div className="w-full flex items-center justify-between text-xs text-slate-400">
              <span>JLPT N3 필수 한자어</span>
              <span className="flex items-center gap-1 text-emerald-300 font-bold">
                <RotateCw className="w-3.5 h-3.5" /> 탭하여 뒤집기
              </span>
            </div>

            {!isCardFlipped ? (
              <div className="my-auto space-y-4">
                <div className="text-5xl font-black text-white tracking-wider">
                  {currentCard.word}
                </div>
                <p className="text-xs text-slate-400">
                  이 한자 단어의 읽는 법(후리가나)과 뜻은 무엇일까요?
                </p>
              </div>
            ) : (
              <div className="my-auto space-y-3 w-full text-left animate-fadeIn">
                <div className="text-center border-b border-slate-800 pb-3">
                  <div className="text-2xl font-black text-white">{currentCard.word}</div>
                  <div className="text-sm font-bold text-amber-300 mt-1">
                    {currentCard.furigana} [{currentCard.koreanPronunciation}]
                  </div>
                  <div className="text-lg font-extrabold text-emerald-300 mt-1">
                    {currentCard.meaning}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {currentCard.kanjiBreakdown.map((k, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <strong className="text-amber-300">{k.kanji}</strong> ({k.meaningKo}) — 음독:{' '}
                      {k.onyomi} / 훈독: {k.kunyomi}
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 text-xs text-slate-200">
                  예문: <strong>{currentCard.exampleJp}</strong> ({currentCard.exampleKo})
                </div>
              </div>
            )}

            <div className="w-full flex items-center justify-center pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakJapanese(currentCard.word, ttsSpeed);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" /> 발음 듣기
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setIsCardFlipped(false);
                setCardIndex(
                  (prev) => (prev - 1 + filteredList.length) % filteredList.length
                );
              }}
              className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> 이전 단어
            </button>

            <button
              onClick={() => onToggleMastered(currentCard.id)}
              className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                masteredIds.has(currentCard.id)
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {masteredIds.has(currentCard.id) ? '암기 완료됨' : '암기 완료 체크'}
            </button>

            <button
              onClick={() => {
                setIsCardFlipped(false);
                setCardIndex((prev) => (prev + 1) % filteredList.length);
              }}
              className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
            >
              다음 단어 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 모드 3: N3 한자 읽기 & 의미 4지선다 퀴즈 */}
      {/* ============================================================ */}
      {studyMode === 'quiz' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-400">
              {quizType === 'reading' ? '📝 한자 읽기(후리가나) 퀴즈' : '📝 단어 의미 맞추기 퀴즈'}
            </span>
            <span className="text-slate-300 font-bold">
              정답률: {quizScore.correct} / {quizScore.total}
            </span>
          </div>

          <div className="py-6 text-center space-y-2 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="text-4xl font-black text-white">{currentQuizWord.word}</div>
            <div className="text-xs text-slate-400">
              {quizType === 'reading'
                ? '위 한자의 올바른 읽는 법(발음)을 고르세요'
                : `위 단어(${currentQuizWord.furigana})의 알맞은 뜻을 고르세요`}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {getQuizChoices(currentQuizWord).map((choice) => {
              const isSelected = selectedChoice === choice.id;
              const isCorrect = choice.id === currentQuizWord.id;
              let btnStyle =
                'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200';
              if (selectedChoice) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-950 border-emerald-400 text-emerald-200 font-bold';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-950 border-rose-400 text-rose-200';
                }
              }

              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectQuizOption(choice.id)}
                  className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${btnStyle}`}
                >
                  {quizType === 'reading'
                    ? `${choice.furigana} [${choice.koreanPronunciation}]`
                    : choice.meaning}
                </button>
              );
            })}
          </div>

          {selectedChoice && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 animate-fadeIn text-xs">
              <div className="font-bold text-amber-300">
                정답 해설: {currentQuizWord.word} ({currentQuizWord.furigana} / [
                {currentQuizWord.koreanPronunciation}]) = {currentQuizWord.meaning}
              </div>
              <div className="text-slate-300">예문: {currentQuizWord.exampleJp}</div>
              <button
                onClick={handleNextQuiz}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                다음 문제 풀기 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
