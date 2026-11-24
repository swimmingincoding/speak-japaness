import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Subtitles,
  RotateCcw,
  BookmarkPlus,
  Check,
} from 'lucide-react';
import {
  speakJapanese,
  stopSpeaking,
  unlockSpeechForIOS,
  startJapaneseSpeechRecognition,
  RecognitionHandle,
} from '../utils/speech';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
} from '../utils/japanesePhonetics';
import { generatePartnerReply } from '../utils/aiService';
import { Scenario, RoleType, AIConfig, SavedExpression } from '../types/conversation';
import { FuriganaText } from './FuriganaText';

interface LiveCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: Scenario;
  userRole: RoleType;
  aiConfig: AIConfig;
  ttsSpeed?: number;
  onSaveExpression?: (expr: SavedExpression) => void;
  onCallCompleted?: () => void;
}

interface CallTurn {
  id: string;
  speaker: 'user' | 'partner';
  japanese: string;
  furigana: string;
  reading: string;
  korean: string;
}

interface SuggestedHint {
  japanese: string;
  koreanPronunciation: string;
  koreanTranslation: string;
}

export const LiveCallModal: React.FC<LiveCallModalProps> = ({
  isOpen,
  onClose,
  scenario,
  userRole,
  aiConfig,
  ttsSpeed = 1.0,
  onSaveExpression,
  onCallCompleted,
}) => {
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [showHints, setShowHints] = useState<boolean>(false);
  const [sessionSeed, setSessionSeed] = useState<number>(0);

  const [callTurns, setCallTurns] = useState<CallTurn[]>([]);
  const [currentAiSpeech, setCurrentAiSpeech] = useState<CallTurn | null>(null);
  const [dynamicHints, setDynamicHints] = useState<SuggestedHint[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isUserListening, setIsUserListening] = useState<boolean>(false);
  const [interimUserText, setInterimUserText] = useState<string>('');
  const [micStatusNote, setMicStatusNote] = useState<string | null>(null);
  const [savedTurnIds, setSavedTurnIds] = useState<Set<string>>(new Set());

  // 비동기 클로저에서도 항상 최신 상태를 참조하기 위한 Ref 동기화
  const isOpenRef = useRef<boolean>(isOpen);
  const callStateRef = useRef<'calling' | 'connected' | 'ended'>('calling');
  const isAiSpeakingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const callTurnsRef = useRef<CallTurn[]>([]);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  isOpenRef.current = isOpen;
  callStateRef.current = callState;
  isAiSpeakingRef.current = isAiSpeaking;
  isMutedRef.current = isMuted;
  callTurnsRef.current = callTurns;

  const partnerName = userRole === 'customer' ? scenario.staffRoleName : scenario.customerRoleName;

  // 시나리오 기반 기본 추천 힌트 (시나리오 대본에서 내 역할의 대사 추출)
  const defaultScenarioHints = useMemo<SuggestedHint[]>(() => {
    const myTurns = scenario.turns.filter((t) => t.speaker === userRole);
    if (myTurns.length > 0) {
      return myTurns.slice(0, 3).map((t) => ({
        japanese: t.japanese,
        koreanPronunciation: t.koreanPronunciation,
        koreanTranslation: t.koreanTranslation,
      }));
    }
    return [
      {
        japanese: 'すみません、少しお伺いしてもよろしいでしょうか？',
        koreanPronunciation: '스미마센, 스코시 오우카가이시테모 요로시이데쇼-카?',
        koreanTranslation: '저기 죄송한데, 잠시 여쭤봐도 괜찮을까요?',
      },
    ];
  }, [scenario, userRole]);

  const activeHints = dynamicHints.length > 0 ? dynamicHints : defaultScenarioHints;

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const stopMic = () => {
    clearRetryTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsUserListening(false);
  };

  // 통화 연결 시 오프닝 멘트
  const openingJapanese =
    userRole === 'customer'
      ? `もしもし、${scenario.placeName}でございます。ご用件をお伺いできますでしょうか？`
      : `もしもし、お忙しいところ恐れ入ります。少しお伺いしてもよろしいでしょうか？`;

  const openingFurigana = japaneseToHiraganaReading(openingJapanese);

  const openingKorean =
    userRole === 'customer'
      ? `여보세요, ${scenario.placeName}입니다. 어떤 용건이신가요?`
      : `여보세요, 바쁘신 와중에 실례합니다. 잠시 여쭤봐도 될까요?`;

  const openingReading =
    userRole === 'customer'
      ? `모시모시, ${scenario.placeName}데 고자이마스. 고요-켄오 오우카가이 데키마스데쇼-카?`
      : `모시모시, 오이소가시이 토코로 오소레이리마스. 스코시 오우카가이시테모 요로시이데쇼-카?`;

  // 사용자 음성 인식 시작 (핸즈프리 + Ref 안전 체크)
  const startListeningForUser = () => {
    clearRetryTimer();
    if (!isOpenRef.current || callStateRef.current !== 'connected' || isMutedRef.current) {
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setMicStatusNote(null);
    setIsUserListening(true);
    setInterimUserText('');

    let capturedFinal = false;

    const handle = startJapaneseSpeechRecognition(
      (transcript: string, isFinal: boolean) => {
        if (!isOpenRef.current || callStateRef.current !== 'connected') return;
        if (isFinal) {
          capturedFinal = true;
          setIsUserListening(false);
          setInterimUserText('');
          if (transcript && transcript.trim().length > 0) {
            handleUserUtterance(transcript.trim());
          } else {
            retryTimerRef.current = setTimeout(() => {
              if (isOpenRef.current && callStateRef.current === 'connected' && !isAiSpeakingRef.current && !isMutedRef.current) {
                startListeningForUser();
              }
            }, 600);
          }
        } else {
          setInterimUserText(transcript);
        }
      },
      (errorMsg: string) => {
        setIsUserListening(false);
        if (errorMsg.includes('권한') || errorMsg.includes('지원하지')) {
          setMicStatusNote(errorMsg);
          return;
        }
        retryTimerRef.current = setTimeout(() => {
          if (isOpenRef.current && callStateRef.current === 'connected' && !isAiSpeakingRef.current && !isMutedRef.current) {
            startListeningForUser();
          }
        }, 1000);
      },
      () => {
        setIsUserListening(false);
        if (!capturedFinal && isOpenRef.current && callStateRef.current === 'connected' && !isAiSpeakingRef.current && !isMutedRef.current) {
          retryTimerRef.current = setTimeout(() => {
            if (isOpenRef.current && callStateRef.current === 'connected' && !isAiSpeakingRef.current && !isMutedRef.current) {
              startListeningForUser();
            }
          }, 800);
        }
      }
    );

    recognitionRef.current = handle;
  };

  // 사용자 발화 후 AI 응답 생성
  const handleUserUtterance = async (userText: string, koreanHint?: string) => {
    if (!isOpenRef.current || callStateRef.current !== 'connected') return;
    stopMic();

    const userTurn: CallTurn = {
      id: `call-user-${Date.now()}`,
      speaker: 'user',
      japanese: userText,
      furigana: japaneseToHiraganaReading(userText),
      reading: kanaToKoreanPronunciation(userText),
      korean: koreanHint || '내 음성 발화',
    };

    const nextTurns = [...callTurnsRef.current, userTurn];
    setCallTurns(nextTurns);
    setIsAiThinking(true);
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;

    try {
      const historyMessages = nextTurns.map((t) => ({
        id: t.id,
        sender: t.speaker === 'user' ? ('user' as const) : ('partner' as const),
        role:
          t.speaker === 'user'
            ? userRole
            : userRole === 'customer'
            ? ('staff' as const)
            : ('customer' as const),
        japanese: t.japanese,
        furigana: t.furigana,
        koreanTranslation: t.korean,
        koreanPronunciation: t.reading,
      }));

      const reply = await generatePartnerReply(
        scenario,
        userRole,
        historyMessages,
        userText,
        aiConfig
      );

      if (!isOpenRef.current || callStateRef.current !== 'connected') return;

      const aiTurn: CallTurn = {
        id: `call-ai-${Date.now()}`,
        speaker: 'partner',
        japanese: reply.japanese,
        furigana: reply.furigana || japaneseToHiraganaReading(reply.japanese),
        reading: reply.koreanPronunciation,
        korean: reply.koreanTranslation,
      };

      setCallTurns((prev) => [...prev, aiTurn]);
      setCurrentAiSpeech(aiTurn);
      if (reply.suggestedReplies && reply.suggestedReplies.length > 0) {
        setDynamicHints(reply.suggestedReplies.slice(0, 3));
      }
      setIsAiThinking(false);

      speakJapanese(reply.japanese, ttsSpeed, () => {
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        if (isOpenRef.current && callStateRef.current === 'connected' && !isMutedRef.current) {
          startListeningForUser();
        }
      });
    } catch {
      setIsAiThinking(false);
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      if (isOpenRef.current && callStateRef.current === 'connected' && !isMutedRef.current) {
        startListeningForUser();
      }
    }
  };

  // 모달 오픈 시 통화 발신/연결 시뮬레이션
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCallState('calling');
      callStateRef.current = 'calling';
      setCallDuration(0);
      setCallTurns([]);
      setCurrentAiSpeech(null);
      setDynamicHints([]);
      setIsMuted(false);
      isMutedRef.current = false;
      setMicStatusNote(null);
      setSavedTurnIds(new Set());

      const connectTimeout = setTimeout(() => {
        if (!isOpenRef.current) return;
        setCallState('connected');
        callStateRef.current = 'connected';

        const initialTurn: CallTurn = {
          id: `call-open-${Date.now()}`,
          speaker: 'partner',
          japanese: openingJapanese,
          furigana: openingFurigana,
          reading: openingReading,
          korean: openingKorean,
        };
        setCallTurns([initialTurn]);
        setCurrentAiSpeech(initialTurn);
        setIsAiSpeaking(true);
        isAiSpeakingRef.current = true;

        speakJapanese(openingJapanese, ttsSpeed, () => {
          setIsAiSpeaking(false);
          isAiSpeakingRef.current = false;
          if (isOpenRef.current && callStateRef.current === 'connected' && !isMutedRef.current) {
            startListeningForUser();
          }
        });
      }, 1100);

      return () => {
        clearTimeout(connectTimeout);
        clearRetryTimer();
        stopSpeaking();
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, sessionSeed]);

  // 통화 시간 타이머
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // 음소거 토글 핸들러
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    if (nextMuted) {
      stopMic();
    } else if (callStateRef.current === 'connected' && !isAiSpeakingRef.current) {
      startListeningForUser();
    }
  };

  // 수동으로 내 차례 말하기 깨우기 (AI 발화 스킵 및 마이크 즉시 활성화)
  const handleManualSpeakNow = () => {
    unlockSpeechForIOS();
    stopSpeaking();
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
    }
    startListeningForUser();
  };

  // 통화 종료 핸들러
  const handleEndCall = () => {
    callStateRef.current = 'ended';
    setCallState('ended');
    stopSpeaking();
    stopMic();
    if (callTurns.filter((t) => t.speaker === 'user').length >= 1) {
      onCallCompleted?.();
    }
  };

  // 통화 리포트에서 표현 단어장 저장
  const handleSaveCallTurn = (turn: CallTurn) => {
    if (!onSaveExpression || savedTurnIds.has(turn.id)) return;
    onSaveExpression({
      id: turn.id,
      scenarioId: scenario.id,
      scenarioTitle: `📞 ${scenario.title} (전화통화)`,
      speaker:
        turn.speaker === 'user'
          ? userRole
          : userRole === 'customer'
          ? 'staff'
          : 'customer',
      japanese: turn.japanese,
      furigana: turn.furigana,
      koreanPronunciation: turn.reading,
      koreanTranslation: turn.korean,
      realLifeTip: '실시간 전화 통화 롤플레잉에서 저장한 표현입니다.',
      savedAt: new Date().toISOString(),
    });
    setSavedTurnIds((prev) => new Set(prev).add(turn.id));
  };

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-[440px] h-full sm:h-[92vh] sm:max-h-[850px] sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-800">
        {/* 상단 통화 상태 인디케이터 바 (아이폰 다이내믹 아일랜드 Safe Area 대응) */}
        <div className="pt-[calc(env(safe-area-inset-top,20px)+1.2rem)] px-6 pb-3 text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                callState === 'connected'
                  ? 'bg-emerald-400 animate-ping'
                  : callState === 'calling'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            {callState === 'calling'
              ? '신호 연결 중...'
              : callState === 'connected'
              ? `통화 중 · ${formatTime(callDuration)}`
              : '통화 종료됨'}
          </div>

          {/* 상대방 프로필 아바타 */}
          <div className="relative mx-auto w-20 h-20 my-1.5">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-3xl shadow-2xl transition ${
                isAiSpeaking ? 'ring-4 ring-indigo-400/80 scale-105' : ''
              }`}
            >
              🇯🇵
            </div>
            {isAiSpeaking && (
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full text-xs shadow-md">
                <Volume2 className="w-3.5 h-3.5" />
              </span>
            )}
            {isUserListening && !isMuted && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full text-xs shadow-md animate-bounce">
                <Mic className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <h3 className="text-lg font-black tracking-tight">{partnerName}</h3>
            <p className="text-xs text-slate-400 font-medium">
              {scenario.placeName} · {isAiThinking ? '답변 생각 중...' : isAiSpeaking ? '상대방 말하는 중' : isMuted ? '마이크 음소거됨' : isUserListening ? '내 목소리 듣는 중' : '대기 중'}
            </p>
          </div>
        </div>

        {/* 중앙 실시간 파동 비주얼라이저 & 자막/힌트 영역 */}
        <div className="px-5 flex-1 overflow-y-auto no-scrollbar flex flex-col justify-center items-center space-y-3.5 py-2">
          {/* 120Hz 부드러운 CSS 키프레임 음성 파동 */}
          <div className="flex items-center justify-center gap-1.5 h-10 shrink-0">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
              const active = isAiSpeaking || (isUserListening && !isMuted);
              return (
                <div
                  key={bar}
                  className={`w-1.5 rounded-full transition-colors duration-200 ${
                    isAiSpeaking
                      ? 'bg-indigo-400'
                      : isUserListening && !isMuted
                      ? 'bg-emerald-400'
                      : 'bg-white/20'
                  } ${active ? 'h-9 animate-audio-wave' : 'h-2'}`}
                  style={
                    active
                      ? { animationDelay: `${(bar % 5) * 0.12}s` }
                      : undefined
                  }
                />
              );
            })}
          </div>

          {/* 실시간 음성 자막 카드 */}
          {showSubtitles && currentAiSpeech && callState === 'connected' && (
            <div className="w-full max-w-sm p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-2 animate-fadeIn shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <FuriganaText
                  text={currentAiSpeech.japanese}
                  showFurigana={true}
                  className="text-base sm:text-lg font-black text-amber-300 leading-relaxed"
                  rtClassName="text-[10px] font-bold text-indigo-200"
                />
                <button
                  onClick={() => {
                    unlockSpeechForIOS();
                    speakJapanese(currentAiSpeech.japanese, ttsSpeed);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
                  title="다시 듣기"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-indigo-200 font-medium">
                [{currentAiSpeech.reading}]
              </div>
              <div className="text-xs text-slate-300 font-bold pt-1.5 border-t border-white/10">
                {currentAiSpeech.korean}
              </div>
            </div>
          )}

          {/* 사용자 인식 중 실시간 텍스트 */}
          {isUserListening && interimUserText && (
            <div className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-500/40 animate-pulse max-w-sm truncate">
              🎙️ 인식 중: "{interimUserText}"
            </div>
          )}

          {micStatusNote && (
            <div className="text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-3 py-2 rounded-xl text-center max-w-sm">
              {micStatusNote} (아래 '힌트' 버튼으로 터치 응답도 가능합니다)
            </div>
          )}

          {/* 시나리오 맞춤 추천 힌트 (터치로도 바로 발화 가능) */}
          {showHints && callState === 'connected' && (
            <div className="w-full max-w-sm p-3 bg-indigo-950/90 rounded-2xl border border-indigo-500/50 space-y-1.5 text-left animate-fadeIn">
              <span className="text-[11px] font-bold text-indigo-300 block">
                💡 말문이 막힐 때 읽거나 탭하여 바로 대답해보세요:
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {activeHints.map((hint, hIdx) => (
                  <button
                    key={hIdx}
                    onClick={() => {
                      unlockSpeechForIOS();
                      handleUserUtterance(hint.japanese, hint.koreanTranslation);
                    }}
                    disabled={isAiThinking}
                    className="w-full p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition text-left cursor-pointer disabled:opacity-50"
                  >
                    <div>{hint.japanese}</div>
                    <div className="text-[10.5px] text-amber-300 font-semibold mt-0.5">
                      [{hint.koreanPronunciation}]
                    </div>
                    <div className="text-[10.5px] text-slate-300 font-normal">
                      {hint.koreanTranslation}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 통화 종료 리포트 (통화 종료 시 표출 + 단어장 저장 지원) */}
        {callState === 'ended' && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 pt-[calc(env(safe-area-inset-top,20px)+1.2rem)] px-6 pb-[calc(env(safe-area-inset-bottom,20px)+1.2rem)] flex flex-col justify-between animate-fadeIn text-center">
            <div className="space-y-3 my-auto w-full overflow-hidden flex flex-col max-h-full">
              <div className="w-14 h-14 rounded-3xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 mx-auto flex items-center justify-center text-2xl shadow-xl shrink-0">
                📞
              </div>
              <div className="shrink-0">
                <h3 className="text-xl font-black">통화 세션 리포트</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  총 통화 시간: <strong className="text-white">{formatTime(callDuration)}</strong> · 주고받은 대화:{' '}
                  <strong className="text-white">{callTurns.length}턴</strong>
                </p>
              </div>

              <div className="mt-2 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2.5 overflow-y-auto flex-1 max-h-72">
                <span className="text-xs font-bold text-amber-400 block">
                  📝 통화 대화 기록 (음성 듣기 & 단어장 저장):
                </span>
                {callTurns.map((turn) => {
                  const isSaved = savedTurnIds.has(turn.id);
                  return (
                    <div
                      key={turn.id}
                      className="text-xs space-y-1 border-b border-white/10 pb-2.5 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-bold">
                          {turn.speaker === 'user' ? '🙋‍♂️ 나' : `🇯🇵 ${partnerName}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => speakJapanese(turn.japanese, ttsSpeed)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                            title="다시 듣기"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          {onSaveExpression && (
                            <button
                              onClick={() => handleSaveCallTurn(turn)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                isSaved
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white/10 hover:bg-white/20 text-indigo-200'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check className="w-3 h-3" /> 저장됨
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" /> 저장
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-white font-bold">{turn.japanese}</p>
                      {turn.reading && (
                        <p className="text-[11px] text-indigo-300">[{turn.reading}]</p>
                      )}
                      <p className="text-[11px] text-slate-400">{turn.korean}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 shrink-0">
              <button
                onClick={() => {
                  unlockSpeechForIOS();
                  setSessionSeed((s) => s + 1);
                }}
                className="py-3.5 bg-white/10 hover:bg-white/20 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> 다시 통화하기
              </button>
              <button
                onClick={onClose}
                className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-indigo-500/30"
              >
                대화방으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* 하단 통화 컨트롤 바 (아이폰 16 프로 홈 인디케이터 Safe Area 완벽 대응) */}
        {callState !== 'ended' && (
          <div className="pt-3.5 px-5 pb-[calc(env(safe-area-inset-bottom,20px)+1.1rem)] bg-slate-950/90 border-t border-white/10 space-y-3">
            {/* 보조 액션: 인식이 멈췄거나 AI 말을 끊고 바로 말하고 싶을 때 */}
            {callState === 'connected' && (
              <button
                onClick={handleManualSpeakNow}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-extrabold text-emerald-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isAiSpeaking ? '상대 말 건너뛰고 내 차례 말하기' : '마이크 다시 깨우기 (탭하여 말하기)'}</span>
              </button>
            )}

            <div className="flex items-center justify-between max-w-sm mx-auto px-2">
              {/* 마이크 음소거 토글 */}
              <button
                onClick={handleToggleMute}
                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs transition cursor-pointer ${
                  isMuted ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'bg-white/15 text-white'
                }`}
                title={isMuted ? '음소거 해제' : '마이크 음소거'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-[9px] mt-0.5">{isMuted ? '음소거됨' : '마이크'}</span>
              </button>

              {/* 자막 토글 버튼 */}
              <button
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs transition cursor-pointer ${
                  showSubtitles ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
                }`}
                title="자막 켜기/끄기"
              >
                <Subtitles className="w-5 h-5" />
                <span className="text-[9px] mt-0.5">자막</span>
              </button>

              {/* 통화 종료 버튼 (빨간색) */}
              <button
                onClick={handleEndCall}
                className="w-15 h-15 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition cursor-pointer active:scale-95"
                title="통화 종료"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              {/* 시나리오 추천 힌트 토글 버튼 */}
              <button
                onClick={() => setShowHints(!showHints)}
                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs transition cursor-pointer ${
                  showHints ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-white/15 text-white'
                }`}
                title="답변 힌트 보기"
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-[9px] mt-0.5">힌트</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
