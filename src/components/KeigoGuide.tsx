import React, { useState } from 'react';
import { STAFF_KEIGO_ESSENTIALS, KeigoEssential } from '../data/scenarios';
import { speakJapanese } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
import { Volume2, Sparkles, HelpCircle, CheckCircle2, ArrowRight, Ear } from 'lucide-react';

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
    <div className="space-y-5 pb-28">
      {/* 상단 배너 */}
      <div className="rounded-[28px] bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-6 text-white shadow-xl shadow-orange-500/20 space-y-3.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5" /> 왜 일본 점원의 말은 안 들릴까?
        </div>
        <h2 className="text-xl font-extrabold leading-snug tracking-tight">
          교과서 일본어 vs 매장 점원 전용 접객어(接客敬語)
        </h2>
        <p className="text-xs text-white/90 leading-relaxed">
          일본 매장 직원은 손님에게 일반 회화가 아닌 <strong>전용 접객 경어</strong>를 씁니다. 아래 6대 필수 접객어만 귀에 익혀도 일본 여행의 90%가 들립니다!
        </p>
        <button
          onClick={startListeningQuiz}
          className="w-full py-3.5 px-4 rounded-2xl bg-white text-orange-700 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition cursor-pointer"
        >
          <Ear className="w-4 h-4" />
          점원 기습 질문 1초 듣기 테스트 시작하기
        </button>
      </div>

      {/* 기습 듣기 퀴즈 */}
      {currentQuizItem && (
        <div className="rounded-[26px] bg-white border-2 border-amber-400 p-5 shadow-xl space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> 실전 점원 듣기 퀴즈
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
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-2 text-amber-800 font-extrabold text-xs cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            점원 음성 다시 듣기
          </button>

          <div className="grid grid-cols-1 gap-2">
            {(() => {
              const others = STAFF_KEIGO_ESSENTIALS.filter(
                (o) => o.id !== currentQuizItem.id
              );
              const rotatedOthers = [
                others[quizIndex! % others.length],
                others[(quizIndex! + 1) % others.length],
                others[(quizIndex! + 2) % others.length],
              ];
              const options = [...rotatedOthers];
              options.splice(quizIndex! % 4, 0, currentQuizItem);
              return options.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedAnswer(item.id)}
                  className={`text-left p-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
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
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-extrabold text-indigo-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                정답 문장: {currentQuizItem.exampleInStore}
              </div>
              <div className="text-slate-600 font-bold">
                발음: [{currentQuizItem.staffKoreanPron}]
              </div>
              <div className="text-slate-800 font-extrabold">
                뜻: {currentQuizItem.exampleKorean}
              </div>
              <button
                onClick={startListeningQuiz}
                className="mt-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold text-xs cursor-pointer"
              >
                다음 문제 듣기 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 접객 경어 리스트 */}
      <div className="space-y-3.5">
        {STAFF_KEIGO_ESSENTIALS.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-[24px] bg-white border border-slate-200/80 p-5 space-y-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-50 text-amber-800">
                필수 접객어 #{idx + 1}
              </span>
              <span className="text-xs font-bold text-slate-500">{item.meaning}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>일반 회화(교과서):</span>
                <span className="line-through decoration-rose-400">{item.casualOrTextbook}</span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-extrabold pt-1.5 border-t border-slate-200/70">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>실제 매장 직원이 쓰는 말:</span>
              </div>
              <div>
                <FuriganaText
                  text={item.staffKeigo}
                  showFurigana={true}
                  className="text-lg font-black text-slate-900"
                  rtClassName="text-[10px] font-bold text-indigo-600"
                />
              </div>
              <div className="text-xs text-indigo-600 font-extrabold">
                발음: [{item.staffKoreanPron}]
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl">
              💡 <strong className="text-amber-800">안 들렸던 이유:</strong> {item.whyConfusing}
            </p>

            <div className="flex items-center justify-between gap-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              <div className="space-y-0.5">
                <FuriganaText
                  text={item.exampleInStore}
                  showFurigana={true}
                  className="text-sm font-black text-slate-900"
                  rtClassName="text-[9.5px] font-bold text-indigo-600"
                />
                <div className="text-xs text-slate-600 font-medium">{item.exampleKorean}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => speakJapanese(item.exampleInStore, 0.75)}
                  className="px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 font-extrabold cursor-pointer"
                >
                  🐢 0.75x
                </button>
                <button
                  onClick={() => speakJapanese(item.exampleInStore, 1.0)}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
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
