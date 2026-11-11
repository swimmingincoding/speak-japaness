import React, { useState, useEffect } from 'react';
import {
  OFFLINE_EMERGENCY_PHRASES,
  EMERGENCY_CATEGORY_META,
  EmergencyCategory,
  EmergencyPhrase,
  translateOfflineSmart,
  OfflineTranslationResult,
} from '../data/offlineTranslatorData';
import { speakJapanese, startJapaneseSpeechRecognition } from '../utils/speech';
import {
  Wifi,
  WifiOff,
  ArrowRightLeft,
  Volume2,
  Maximize2,
  X,
  Mic,
  MicOff,
  Search,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface OfflineTranslatorProps {
  ttsSpeed: number;
}

export const OfflineTranslator: React.FC<OfflineTranslatorProps> = ({ ttsSpeed }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);
  const [direction, setDirection] = useState<'ko-to-jp' | 'jp-to-ko'>('ko-to-jp');
  const [inputText, setInputText] = useState<string>('');
  const [translationResult, setTranslationResult] =
    useState<OfflineTranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory | 'all'>('all');
  const [bigScreenPhrase, setBigScreenPhrase] = useState<{
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    korean: string;
  } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOffline = !isOnline || forceOfflineMode;

  const handleTranslate = async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text) return;

    // 1. 먼저 오프라인 엔진으로 즉시 결과 도출 (지연 시간 0초)
    const offlineRes = translateOfflineSmart(text, direction);
    setTranslationResult(offlineRes);

    // 2. 온라인 모드이고 오프라인 정확 매칭이 아닌 경우 온라인 번역 보강 시도
    if (!effectiveOffline && offlineRes.engineType !== 'offline-exact') {
      setIsTranslating(true);
      try {
        const sl = direction === 'ko-to-jp' ? 'ko' : 'ja';
        const tl = direction === 'ko-to-jp' ? 'ja' : 'ko';
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=rm&q=${encodeURIComponent(
          text
        )}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const translatedText =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data?.[0]?.map((seg: any) => seg?.[0] || '').join('') || '';
          if (translatedText) {
            setTranslationResult({
              japanese: direction === 'ko-to-jp' ? translatedText : text,
              furigana: offlineRes.furigana,
              koreanPronunciation:
                offlineRes.engineType === 'offline-composed'
                  ? offlineRes.koreanPronunciation
                  : '음성 듣기(🔊)를 눌러 원어민 발음을 확인하세요',
              koreanMeaning: direction === 'ko-to-jp' ? text : translatedText,
              engineType: 'online-ai',
              tip: '온라인 실시간 번역 + 오프라인 여행 사전이 결합된 결과입니다.',
            });
          }
        }
      } catch {
        // 네트워크 불안정 시 이미 세팅된 오프라인 결과 그대로 유지
      } finally {
        setIsTranslating(false);
      }
    }
  };

  // 음성 인식 (한국어 또는 일본어)
  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (direction === 'jp-to-ko') {
      setIsListening(true);
      startJapaneseSpeechRecognition(
        (transcript, isFinal) => {
          setInputText(transcript);
          if (isFinal) {
            handleTranslate(transcript);
          }
        },
        () => setIsListening(false),
        () => setIsListening(false)
      );
      return;
    }

    // 한국어 음성 인식
    const SpeechRecognitionClass =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRecognitionClass as any)();
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const spoken = e.results?.[0]?.[0]?.transcript || '';
      if (spoken) {
        setInputText(spoken);
        handleTranslate(spoken);
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const filteredPhrases: EmergencyPhrase[] =
    selectedCategory === 'all'
      ? OFFLINE_EMERGENCY_PHRASES
      : OFFLINE_EMERGENCY_PHRASES.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-5 pb-24">
      {/* 1. 상단 오프라인/온라인 상태 배너 */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {effectiveOffline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5" /> 오프라인 엔진 작동 중 (데이터 0%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <Wifi className="w-3.5 h-3.5" /> 온라인 + 오프라인 하이브리드
              </span>
            )}
          </div>

          <button
            onClick={() => setForceOfflineMode((prev) => !prev)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            {forceOfflineMode ? '온라인 모드로 전환' : '✈️ 비행기모드 테스트'}
          </button>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-white">
            돌발상황 실시간 통번역 & SOS 소통보드
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            일본 지하 매장이나 시골 기차역에서 <strong>로밍/eSIM 데이터가 끊겨도 100% 작동</strong>합니다. 급할 때는 아래 카드를 눌러 점원/역무원에게 큰 화면으로 바로 보여주세요!
          </p>
        </div>
      </div>

      {/* 2. 실시간 양방향 번역 입력 박스 */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <span
              className={
                direction === 'ko-to-jp' ? 'text-rose-400' : 'text-amber-400'
              }
            >
              {direction === 'ko-to-jp' ? '🇰🇷 한국어 입력' : '🇯🇵 일본어(점원 말) 입력'}
            </span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span
              className={
                direction === 'ko-to-jp' ? 'text-amber-400' : 'text-rose-400'
              }
            >
              {direction === 'ko-to-jp' ? '🇯🇵 일본어 변환' : '🇰🇷 한국어 의미'}
            </span>
          </div>

          <button
            onClick={() => {
              setDirection((d) => (d === 'ko-to-jp' ? 'jp-to-ko' : 'ko-to-jp'));
              setTranslationResult(null);
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ArrowRightLeft className="w-3 h-3" /> 방향 전환
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-xl border transition cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700'
            }`}
            title="음성으로 말해서 번역하기"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTranslate();
            }}
            placeholder={
              direction === 'ko-to-jp'
                ? '예: 전철에 가방을 두고 내렸어요 / 새우 빼주세요 / 화장실 어디예요'
                : '점원이 말한 일본어나 안내문 텍스트 입력...'
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
          />

          <button
            onClick={() => handleTranslate()}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" /> 번역
          </button>
        </div>

        {/* 빠른 키워드 칩 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {[
            '화장실 어디예요?',
            '가방을 두고 내렸어요',
            '새우 알레르기가 있어요',
            '카드가 안 돼요',
            '열이 나고 목이 아파요',
            '앞접시 주세요',
          ].map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setDirection('ko-to-jp');
                setInputText(sample);
                handleTranslate(sample);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 shrink-0 cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* 번역 결과 표시 카드 */}
        {translationResult && (
          <div className="mt-2 rounded-2xl bg-slate-950 border-2 border-rose-500/40 p-4 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {isTranslating
                  ? '번역 중...'
                  : translationResult.engineType === 'online-ai'
                  ? '⚡ 실시간 온라인 + 사전 결합 번역'
                  : '📦 오프라인 내장 엔진 즉시 번역'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setBigScreenPhrase({
                      japanese: translationResult.japanese,
                      furigana: translationResult.furigana,
                      koreanPronunciation: translationResult.koreanPronunciation,
                      korean: translationResult.koreanMeaning,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> 점원에게 큰 화면으로 보여주기
                </button>
                <button
                  onClick={() => speakJapanese(translationResult.japanese, ttsSpeed)}
                  className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-lg font-extrabold text-white leading-snug">
              {translationResult.japanese}
            </div>
            {translationResult.furigana && (
              <div className="text-xs text-slate-400">{translationResult.furigana}</div>
            )}
            <div className="text-xs font-bold text-amber-300">
              [{translationResult.koreanPronunciation}]
            </div>
            <div className="text-sm font-medium text-emerald-300">
              {translationResult.koreanMeaning}
            </div>

            {translationResult.tip && (
              <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
                {translationResult.tip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 오프라인 6대 돌발상황 프리셋 카드 */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white">
            오프라인 100% 보장 · 여행 돌발상황 SOS 문장집
          </h3>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-950'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            전체 ({OFFLINE_EMERGENCY_PHRASES.length})
          </button>
          {(Object.keys(EMERGENCY_CATEGORY_META) as EmergencyCategory[]).map((cat) => {
            const meta = EMERGENCY_CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* 돌발상황 문장 리스트 */}
        <div className="space-y-3">
          {filteredPhrases.map((item) => {
            const meta = EMERGENCY_CATEGORY_META[item.category];
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${meta.color}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setBigScreenPhrase({
                          japanese: item.japanese,
                          furigana: item.furigana,
                          koreanPronunciation: item.koreanPronunciation,
                          korean: item.korean,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" /> 큰 화면 제시
                    </button>
                    <button
                      onClick={() => speakJapanese(item.japanese, ttsSpeed)}
                      className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm font-bold text-emerald-300">{item.korean}</div>
                <div className="text-base font-extrabold text-white leading-snug">
                  {item.japanese}
                </div>
                <div className="text-xs text-slate-400">{item.furigana}</div>
                <div className="text-xs font-semibold text-amber-300">
                  [{item.koreanPronunciation}]
                </div>

                {/* 상대방 예상 답변 */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-300">
                  <div>
                    <span className="font-bold text-sky-300">👂 점원/역무원 예상 답변: </span>
                    {item.expectedReplyJp}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      → {item.expectedReplyKo}
                    </div>
                  </div>
                  <button
                    onClick={() => speakJapanese(item.expectedReplyJp, ttsSpeed)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 cursor-pointer"
                    title="예상 답변 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 점원/역무원에게 바로 보여주는 전체화면 SOS 빅카드 모달 */}
      {bigScreenPhrase && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">
              🇯🇵 상대방에게 화면을 보여주세요 (Show to Staff)
            </span>
            <button
              onClick={() => setBigScreenPhrase(null)}
              className="p-2 rounded-2xl bg-slate-800 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="my-auto space-y-6 text-center px-2">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              すみません、これを読んでいただけますか？
            </p>
            <div className="text-3xl sm:text-4xl font-black text-white leading-normal break-keep">
              {bigScreenPhrase.japanese}
            </div>
            <div className="text-base text-slate-300">{bigScreenPhrase.furigana}</div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-sm font-bold text-amber-300">
                내 발음 가이드: [{bigScreenPhrase.koreanPronunciation}]
              </div>
              <div className="text-sm text-emerald-300">{bigScreenPhrase.korean}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => speakJapanese(bigScreenPhrase.japanese, 0.95)}
              className="py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Volume2 className="w-5 h-5" /> 일본어 음성 크게 재생
            </button>
            <button
              onClick={() => setBigScreenPhrase(null)}
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
