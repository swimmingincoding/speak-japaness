import React, { useState } from 'react';
import { STAFF_KEIGO_ESSENTIALS, KeigoEssential } from '../data/scenarios';
import { speakJapanese } from '../utils/speech';
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
    <div className="space-y-5 pb-24">
      {/* 상단 배너 */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-600/90 via-rose-700 to-slate-900 p-5 shadow-lg border border-rose-400/20">
        <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          왜 일본 점원의 말은 안 들릴까?
        </div>
        <h2 className="text-xl font-bold text-white leading-snug">
          교과서 일본어 vs 매장 종업원 접객어(接客敬語)
        </h2>
        <p className="text-sm text-rose-100/90 mt-2 leading-relaxed">
          내가 손님으로서 할 말은 외워 갔어도, 일본 점원은 손님에게 <strong>일반 회화가 아닌 전용 접객 경어</strong>를 씁니다. 아래 6대 필수 접객어만 귀에 익혀도 일본 여행의 90%가 들립니다!
        </p>
        <button
          onClick={startListeningQuiz}
          className="mt-4 w-full py-3 px-4 rounded-xl bg-white text-rose-700 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition cursor-pointer"
        >
          <Ear className="w-4 h-4" />
          점원 기습 질문 1초 듣기 테스트 시작하기
        </button>
      </div>

      {/* 기습 듣기 퀴즈 모달/박스 */}
      {currentQuizItem && (
        <div className="rounded-2xl bg-slate-900 border-2 border-amber-400/60 p-4 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> 실전 점원 듣기 퀴즈
            </span>
            <button
              onClick={() => setQuizIndex(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>
          <p className="text-xs text-slate-300">
            방금 점원이 말한 문장의 뜻은 무엇일까요? (다시 들으려면 스피커 버튼 클릭)
          </p>
          <button
            onClick={() => speakJapanese(currentQuizItem.exampleInStore, ttsSpeed)}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 text-amber-300 font-semibold text-sm cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            점원 음성 다시 듣기
          </button>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {STAFF_KEIGO_ESSENTIALS.slice(0, 4).map((option) => {
              // 보장된 선택지 구성
              const item =
                option.id === currentQuizItem.id
                  ? currentQuizItem
                  : option;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedAnswer(item.id)}
                  className={`text-left p-3 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    selectedAnswer === item.id
                      ? item.id === currentQuizItem.id
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-400 text-rose-200'
                      : 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {item.exampleKorean}
                </button>
              );
            })}
            {!STAFF_KEIGO_ESSENTIALS.slice(0, 4).some((o) => o.id === currentQuizItem.id) && (
              <button
                onClick={() => setSelectedAnswer(currentQuizItem.id)}
                className={`text-left p-3 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  selectedAnswer === currentQuizItem.id
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                    : 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {currentQuizItem.exampleKorean}
              </button>
            )}
          </div>

          {selectedAnswer && (
            <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1.5 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                정답 문장: {currentQuizItem.exampleInStore}
              </div>
              <div className="text-slate-300">발음: {currentQuizItem.staffKoreanPron}</div>
              <div className="text-emerald-300 font-medium">뜻: {currentQuizItem.exampleKorean}</div>
              <button
                onClick={startListeningQuiz}
                className="mt-2 w-full py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                다음 문제 듣기 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 접객 경어 리스트 */}
      <div className="space-y-4">
        {STAFF_KEIGO_ESSENTIALS.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                필수 접객어 #{idx + 1}
              </span>
              <span className="text-xs font-semibold text-slate-400">{item.meaning}</span>
            </div>

            {/* 교과서 vs 실제 점원 비교 */}
            <div className="grid grid-cols-1 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>일반 회화 (교과서):</span>
                <span className="line-through decoration-rose-500/60">{item.casualOrTextbook}</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold pt-1 border-t border-slate-800">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>실제 매장 직원이 쓰는 말:</span>
              </div>
              <div className="text-base font-bold text-white">{item.staffKeigo}</div>
              <div className="text-xs text-amber-300/90 font-medium">
                발음: [{item.staffKoreanPron}]
              </div>
              <div className="text-[11px] text-slate-400">히라가나: {item.staffReading}</div>
            </div>

            {/* 왜 안 들렸을까 해설 */}
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl">
              💡 <strong className="text-rose-300">안 들렸던 이유:</strong> {item.whyConfusing}
            </p>

            {/* 실전 매장 예문 듣기 */}
            <div className="flex items-center justify-between gap-3 bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-300">{item.exampleInStore}</div>
                <div className="text-[11px] text-slate-300">{item.exampleKorean}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => speakJapanese(item.exampleInStore, 0.75)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] text-slate-200 font-medium cursor-pointer"
                  title="느리게 듣기"
                >
                  🐢 0.75x
                </button>
                <button
                  onClick={() => speakJapanese(item.exampleInStore, 1.0)}
                  className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  title="원어민 속도로 듣기"
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

