import React, { useState } from 'react';
import { STAFF_KEIGO_ESSENTIALS, KeigoEssential } from '../data/scenarios';
import { speakJapanese } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
import { RhythmicPronunciation } from './RhythmicPronunciation';
import { Volume2, HelpCircle, CheckCircle2, Ear } from 'lucide-react';

interface KeigoGuideProps {
  ttsSpeed: number;
}

export const KeigoGuide: React.FC<KeigoGuideProps> = ({ ttsSpeed }) => {
  const [quizIndex, setQuizIndex] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const startListeningQuiz = () => {
    const randomIdx = Math.floor(Math.random() * STAFF_KEIGO_ESSENTIALS.length);
    setQuizIndex(randomIdx);
    setSelectedAnswer(null);
    setTimeout(() => {
      speakJapanese(STAFF_KEIGO_ESSENTIALS[randomIdx].exampleInStore, ttsSpeed);
    }, 200);
  };

  const currentQuizItem: KeigoEssential | null =
    quizIndex !== null ? STAFF_KEIGO_ESSENTIALS[quizIndex] : null;

  return (
    <div className="space-y-3.5">
      {/* 컴팩트 1초 듣기 테스트 시작 바 */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 flex items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="text-sm font-black text-slate-900">점원 단골 멘트 듣기 훈련</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            매장에서 0.5초 만에 지나가는 필수 접객 경어 6선
          </p>
        </div>
        <button
          onClick={startListeningQuiz}
          className="px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
        >
          <Ear className="w-3.5 h-3.5" />
          <span>듣기 퀴즈</span>
        </button>
      </div>

      {/* 기습 듣기 퀴즈 카드 */}
      {currentQuizItem && (
        <div className="rounded-3xl bg-white border-2 border-amber-400 p-4 shadow-md space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-700 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" /> 방금 점원이 한 말의 뜻은?
            </span>
            <button
              onClick={() => setQuizIndex(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>

          <button
            onClick={() => speakJapanese(currentQuizItem.exampleInStore, ttsSpeed)}
            className="w-full py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-2 text-amber-800 font-extrabold text-xs cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            다시 듣기
          </button>

          <div className="grid grid-cols-1 gap-1.5">
            {(() => {
              const others = STAFF_KEIGO_ESSENTIALS.filter(
                (o) => o.id !== currentQuizItem.id
              );
              const options = [
                others[quizIndex! % others.length],
                others[(quizIndex! + 1) % others.length],
                others[(quizIndex! + 2) % others.length],
              ];
              options.splice(quizIndex! % 4, 0, currentQuizItem);
              return options.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedAnswer(item.id)}
                  className={`text-left p-3 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                    selectedAnswer === item.id
                      ? item.id === currentQuizItem.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold'
                        : 'bg-rose-50 border-rose-400 text-rose-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.exampleKorean}
                </button>
              ));
            })()}
          </div>

          {selectedAnswer && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-extrabold text-indigo-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {currentQuizItem.exampleInStore}
              </div>
              <RhythmicPronunciation
                pronunciation={currentQuizItem.staffKoreanPron}
                japanese={currentQuizItem.exampleInStore}
                variant="compact"
              />
              <button
                onClick={startListeningQuiz}
                className="mt-1 w-full py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold text-xs cursor-pointer"
              >
                다음 문제 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 깔끔한 접객 경어 리스트 */}
      <div className="space-y-3">
        {STAFF_KEIGO_ESSENTIALS.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800">
                #{idx + 1} {item.meaning}
              </span>
              <span className="text-[11px] text-slate-400 line-through">
                {item.casualOrTextbook.split(' ')[0]}
              </span>
            </div>

            <div className="space-y-1">
              <FuriganaText
                text={item.staffKeigo}
                showFurigana={true}
                className="text-lg font-black text-slate-900"
                rtClassName="text-[10px] font-bold text-indigo-600"
              />
              <RhythmicPronunciation
                pronunciation={item.staffKoreanPron}
                japanese={item.staffKeigo}
                variant="compact"
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl">
              💡 {item.whyConfusing}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="min-w-0">
                <FuriganaText
                  text={item.exampleInStore}
                  showFurigana={true}
                  className="text-sm font-bold text-slate-900"
                  rtClassName="text-[9.5px] font-bold text-indigo-600"
                />
                <div className="text-[11px] text-slate-500">{item.exampleKorean}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => speakJapanese(item.exampleInStore, 0.75)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-[11px] text-slate-700 font-bold cursor-pointer"
                >
                  🐢
                </button>
                <button
                  onClick={() => speakJapanese(item.exampleInStore, 1.0)}
                  className="p-2 rounded-xl bg-indigo-600 text-white cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
