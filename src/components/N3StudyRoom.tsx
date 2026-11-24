import React, { useState } from 'react';
import { N3_VOCAB_LIST, N3WordItem, N3PartType } from '../data/n3Vocab';
import { speakJapanese } from '../utils/speech';
import { updateSRSGrade } from '../utils/srsEngine';
import { FuriganaText } from './FuriganaText';
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
  const [hideMeaningInList, setHideMeaningInList] = useState<boolean>(false);

  const [cardIndex, setCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

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
    // 퀴즈 정답/오답 결과를 망각곡선(SRS) 복습 큐에 실시간 연동
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
    setQuizTargetIndex((prev) => (prev + 1) % N3_VOCAB_LIST.length);
  };

  return (
    <div className="space-y-5 pb-28">
      {/* 1. 상단 N3 학습장 헤더 */}
      <div className="rounded-[28px] bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 p-6 text-white shadow-xl shadow-emerald-600/20 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-50 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> JLPT N3 한자 & 어휘
          </span>
          <span className="text-xs font-bold text-emerald-100">
            암기 완료 {masteredIds.size}/{N3_VOCAB_LIST.length}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-extrabold leading-snug tracking-tight">
            일본 안내판과 실전 회화가 읽히는 N3 핵심 단어장
          </h2>
          <p className="text-xs text-emerald-100/85 mt-1 leading-relaxed">
            한자 훈음과 음독(音読み)·훈독(訓読み) 원리를 이해하면 처음 보는 합성어도 쉽게 읽을 수 있습니다.
          </p>
        </div>

        {/* 학습 모드 3종 스위치 */}
        <div className="grid grid-cols-3 gap-1.5 bg-black/20 p-1 rounded-2xl">
          <button
            onClick={() => setStudyMode('list')}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              studyMode === 'list'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> 한자·단어장
          </button>
          <button
            onClick={() => {
              setStudyMode('flashcard');
              setIsCardFlipped(false);
            }}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              studyMode === 'flashcard'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> 플래시카드
          </button>
          <button
            onClick={() => {
              setStudyMode('quiz');
              setSelectedChoice(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              studyMode === 'quiz'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> 4지선다 퀴즈
          </button>
        </div>
      </div>

      {/* 모드 1: 한자·단어 상세 리스트 모드 */}
      {studyMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: '전체' },
                  { id: 'noun', label: '명사·한자어' },
                  { id: 'verb', label: '동사' },
                  { id: 'adj', label: '형용사' },
                  { id: 'expression', label: '부사·표현' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPartFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold shrink-0 cursor-pointer transition ${
                    partFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setHideMeaningInList((prev) => !prev)}
              className={`px-3 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1 shrink-0 border cursor-pointer ${
                hideMeaningInList
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {hideMeaningInList ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> 정답 보이기
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> 가리기(암기)
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
                  className={`rounded-[24px] bg-white border p-5 space-y-3.5 shadow-xs transition ${
                    isMastered ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ruby className="text-2xl font-black text-slate-900">
                          {item.word}
                          {!hideMeaningInList && (
                            <rt className="text-[11px] font-bold text-indigo-600">
                              {item.furigana}
                            </rt>
                          )}
                        </ruby>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          JLPT N3
                        </span>
                      </div>

                      {!hideMeaningInList ? (
                        <div className="space-y-0.5 pt-1">
                          <div className="text-xs font-extrabold text-indigo-600">
                            발음: [{item.koreanPronunciation}]
                          </div>
                          <div className="text-base font-extrabold text-slate-800">
                            뜻: {item.meaning}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-amber-600 py-1">
                          🙈 후리가나와 뜻이 가려져 있습니다
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => speakJapanese(item.word, ttsSpeed)}
                        className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleMastered(item.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 border transition cursor-pointer ${
                          isMastered
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isMastered ? '암기됨' : '암기체크'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 한자 쪼개기 */}
                  <div className="grid grid-cols-1 gap-2">
                    {item.kanjiBreakdown.map((k, kIdx) => (
                      <div
                        key={kIdx}
                        className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3.5 flex items-start gap-3"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl font-black text-indigo-600 shrink-0 shadow-2xs">
                          {k.kanji}
                        </div>
                        <div className="space-y-0.5 text-xs flex-1">
                          <div className="font-extrabold text-slate-900">
                            훈음: <span className="text-indigo-600">{k.meaningKo}</span>
                          </div>
                          <div className="text-slate-600 font-medium">
                            음독: <strong className="text-slate-800">{k.onyomi}</strong> · 훈독:{' '}
                            <strong className="text-slate-800">{k.kunyomi}</strong>
                          </div>
                          <div className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                            💡 {k.strokeOrTip}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 실전 회화 예문 (한자 위 후리가나 포함) */}
                  <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-3.5 flex items-center justify-between gap-2">
                    <div className="space-y-1 text-xs">
                      <FuriganaText
                        text={item.exampleJp}
                        showFurigana={!hideMeaningInList}
                        className="font-black text-slate-900 text-sm"
                        rtClassName="text-[10px] font-bold text-indigo-600"
                      />
                      {!hideMeaningInList && (
                        <>
                          <div className="text-[11px] font-bold text-indigo-600">
                            [{item.exampleKoPron}]
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            {item.exampleKo}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => speakJapanese(item.exampleJp, ttsSpeed)}
                      className="p-2.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-600 hover:text-white text-indigo-600 shrink-0 transition cursor-pointer"
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

      {/* 모드 2: 플래시카드 */}
      {studyMode === 'flashcard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold">
            <span>카드를 터치하면 뒤집힙니다</span>
            <span className="text-slate-900">
              {(cardIndex % filteredList.length) + 1} / {filteredList.length}
            </span>
          </div>

          <div
            onClick={() => setIsCardFlipped((prev) => !prev)}
            className="min-h-[340px] rounded-[28px] bg-white border-2 border-emerald-500/30 p-6 flex flex-col justify-between items-center text-center shadow-xl cursor-pointer select-none transition"
          >
            <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400">
              <span>JLPT N3 필수 어휘</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <RotateCw className="w-3.5 h-3.5" /> 탭하여 뒤집기
              </span>
            </div>

            {!isCardFlipped ? (
              <div className="my-auto space-y-4">
                <div className="text-5xl font-black text-slate-900 tracking-wider">
                  {currentCard.word}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  이 한자어의 읽는 법(후리가나)과 뜻은 무엇일까요?
                </p>
              </div>
            ) : (
              <div className="my-auto space-y-3 w-full text-left animate-fadeIn">
                <div className="text-center border-b border-slate-100 pb-3">
                  <div className="text-3xl font-black text-slate-900">{currentCard.word}</div>
                  <div className="text-sm font-extrabold text-indigo-600 mt-1">
                    {currentCard.furigana} [{currentCard.koreanPronunciation}]
                  </div>
                  <div className="text-lg font-black text-emerald-700 mt-1">
                    {currentCard.meaning}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {currentCard.kanjiBreakdown.map((k, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700"
                    >
                      <strong className="text-indigo-600">{k.kanji}</strong> ({k.meaningKo}) — 음독:{' '}
                      {k.onyomi} / 훈독: {k.kunyomi}
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 text-xs text-slate-800">
                  <FuriganaText
                    text={currentCard.exampleJp}
                    showFurigana={true}
                    className="font-bold"
                  />
                  <div className="text-slate-600 mt-0.5">{currentCard.exampleKo}</div>
                </div>
              </div>
            )}

            <div className="w-full flex items-center justify-center pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakJapanese(currentCard.word, ttsSpeed);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
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
              className="py-3.5 rounded-2xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>

            <button
              onClick={() => onToggleMastered(currentCard.id)}
              className={`py-3.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer ${
                masteredIds.has(currentCard.id)
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {masteredIds.has(currentCard.id) ? '암기 완료' : '암기 체크'}
            </button>

            <button
              onClick={() => {
                setIsCardFlipped(false);
                setCardIndex((prev) => (prev + 1) % filteredList.length);
              }}
              className="py-3.5 rounded-2xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 모드 3: 4지선다 퀴즈 */}
      {studyMode === 'quiz' && (
        <div className="rounded-[28px] bg-white border border-slate-200/90 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {quizType === 'reading' ? '📝 한자 읽기(후리가나) 퀴즈' : '📝 단어 의미 맞추기 퀴즈'}
            </span>
            <span className="text-slate-600 font-extrabold">
              정답률: {quizScore.correct} / {quizScore.total}
            </span>
          </div>

          <div className="py-7 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="text-4xl font-black text-slate-900">{currentQuizWord.word}</div>
            <div className="text-xs text-slate-500 font-medium">
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
                  className={`p-4 rounded-2xl border text-left text-sm transition cursor-pointer ${btnStyle}`}
                >
                  {quizType === 'reading'
                    ? `${choice.furigana} [${choice.koreanPronunciation}]`
                    : choice.meaning}
                </button>
              );
            })}
          </div>

          {selectedChoice && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 animate-fadeIn text-xs">
              <div className="font-extrabold text-indigo-900">
                정답 해설: {currentQuizWord.word} ({currentQuizWord.furigana} / [
                {currentQuizWord.koreanPronunciation}]) = {currentQuizWord.meaning}
              </div>
              <div className="text-slate-700">예문: {currentQuizWord.exampleJp}</div>
              <button
                onClick={handleNextQuiz}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-extrabold text-xs cursor-pointer"
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
