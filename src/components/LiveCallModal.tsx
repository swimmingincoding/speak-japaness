import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Subtitles,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import {
  speakJapanese,
  stopSpeaking,
  startJapaneseSpeechRecognition,
  RecognitionHandle,
} from '../utils/speech';
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
}

interface CallTurn {
  speaker: 'user' | 'partner';
  japanese: string;
  reading: string;
  korean: string;
}

export const LiveCallModal: React.FC<LiveCallModalProps> = ({
  isOpen,
  onClose,
  scenario,
  userRole,
  aiConfig,
  ttsSpeed = 1.0,
  onSaveExpression,
}) => {
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [showHints, setShowHints] = useState<boolean>(false);

  const [callTurns, setCallTurns] = useState<CallTurn[]>([]);
  const [currentAiSpeech, setCurrentAiSpeech] = useState<CallTurn | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isUserListening, setIsUserListening] = useState<boolean>(false);
  const [interimUserText, setInterimUserText] = useState<string>('');

  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const timerRef = useRef<any>(null);

  const partnerName = userRole === 'customer' ? scenario.staffRoleName : scenario.customerRoleName;

  // 통화 연결 시 오프닝 멘트
  const openingJapanese =
    userRole === 'customer'
      ? `もしもし、${scenario.placeName}でございます。ご用件をお伺いできますでしょうか？`
      : `もしもし、お忙しいところ恐れ入ります。少しお伺いしてもよろしいでしょうか？`;

  const openingKorean =
    userRole === 'customer'
      ? `여보세요, ${scenario.placeName}입니다. 어떤 용건이신가요?`
      : `여보세요, 바쁘신 와중에 실례합니다. 잠시 여쭤봐도 될까요?`;

  const openingReading =
    userRole === 'customer'
      ? `모시모시, ${scenario.placeName}데 고자이마스. 고요-켄오 오우카가이 데키마스데쇼-카?`
      : `모시모시, 오이소가시이 토코로 오소레이리마스. 스코시 오우카가이시테모 요로시이데쇼-카?`;

  // 모달 오픈 시 통화 수신/발신 시뮬레이션
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCallState('calling');
      setCallDuration(0);
      setCallTurns([]);
      setCurrentAiSpeech(null);
      setIsMuted(false);

      // 1.5초 후 통화 연결 (전화 벨소리 후 연결)
      const connectTimeout = setTimeout(() => {
        setCallState('connected');
        const initialTurn: CallTurn = {
          speaker: 'partner',
          japanese: openingJapanese,
          reading: openingReading,
          korean: openingKorean,
        };
        setCallTurns([initialTurn]);
        setCurrentAiSpeech(initialTurn);
        setIsAiSpeaking(true);

        speakJapanese(openingJapanese, ttsSpeed, () => {
          setIsAiSpeaking(false);
          // 상대방 발화 끝나면 자동으로 사용자 마이크 음성인식 시작
          startListeningForUser();
        });
      }, 1500);

      return () => {
        clearTimeout(connectTimeout);
        stopSpeaking();
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

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

  // 사용자 음성 인식 시작 (핸즈프리)
  const startListeningForUser = () => {
    if (isMuted) return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setIsUserListening(true);
    setInterimUserText('');

    const handle = startJapaneseSpeechRecognition(
      (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          setIsUserListening(false);
          setInterimUserText('');
          if (transcript && transcript.trim().length > 0) {
            handleUserUtterance(transcript.trim());
          } else {
            // 말소리가 안 들렸으면 재인식 대기
            setTimeout(() => {
              if (callState === 'connected' && !isAiSpeaking) {
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
        setTimeout(() => {
          if (callState === 'connected' && !isAiSpeaking) {
            startListeningForUser();
          }
        }, 1200);
      },
      () => {
        setIsUserListening(false);
      }
    );

    recognitionRef.current = handle;
  };

  // 사용자 발화 후 AI 응답 생성
  const handleUserUtterance = async (userText: string) => {
    const userTurn: CallTurn = {
      speaker: 'user',
      japanese: userText,
      reading: '',
      korean: '사용자 발화',
    };

    setCallTurns((prev) => [...prev, userTurn]);
    setIsAiSpeaking(true);

    // AI 상대방 응답 생성
    try {
      const historyMessages = callTurns.map((t, idx) => ({
        id: `call-turn-${idx}`,
        sender: t.speaker === 'user' ? ('user' as const) : ('partner' as const),
        role: t.speaker === 'user' ? userRole : userRole === 'customer' ? ('staff' as const) : ('customer' as const),
        japanese: t.japanese,
        furigana: t.japanese,
        koreanTranslation: t.korean,
        koreanPronunciation: t.reading,
        createdAt: Date.now(),
      }));

      const reply = await generatePartnerReply(
        scenario,
        userRole,
        historyMessages,
        userText,
        aiConfig
      );

      const aiTurn: CallTurn = {
        speaker: 'partner',
        japanese: reply.japanese,
        reading: reply.koreanPronunciation,
        korean: reply.koreanTranslation,
      };

      setCallTurns((prev) => [...prev, aiTurn]);
      setCurrentAiSpeech(aiTurn);

      // 음성 자동 발화
      speakJapanese(reply.japanese, ttsSpeed, () => {
        setIsAiSpeaking(false);
        // 발화 끝나면 다시 사용자 음성 청취 대기
        startListeningForUser();
      });
    } catch {
      setIsAiSpeaking(false);
      startListeningForUser();
    }
  };

  // 통화 종료 핸들러
  const handleEndCall = () => {
    stopSpeaking();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setCallState('ended');
  };

  // 타이머 포맷 (MM:SS)
  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-[440px] h-full sm:h-[92vh] sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-800">
        {/* 상단 통화 상태 인디케이터 바 */}
        <div className="p-6 text-center space-y-3">
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
              ? '연결 중...'
              : callState === 'connected'
              ? `통화 중 · ${formatTime(callDuration)}`
              : '통화 종료됨'}
          </div>

          {/* 상대방 프로필 아바타 */}
          <div className="relative mx-auto w-24 h-24 my-2">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-4xl shadow-2xl ${
                isAiSpeaking ? 'ring-4 ring-indigo-400/80 animate-pulse' : ''
              }`}
            >
              🇯🇵
            </div>
            {isAiSpeaking && (
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full text-xs shadow-md">
                <Volume2 className="w-3.5 h-3.5" />
              </span>
            )}
            {isUserListening && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full text-xs shadow-md animate-bounce">
                <Mic className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <h3 className="text-xl font-black tracking-tight">{partnerName}</h3>
            <p className="text-xs text-slate-400 font-medium">{scenario.placeName}</p>
          </div>
        </div>

        {/* 중앙 파동 비주얼라이저 & 실시간 자막 영역 */}
        <div className="px-6 flex-1 flex flex-col justify-center items-center space-y-4">
          {/* 음성 파동 애니메이션 (발화 중일 때 활성화) */}
          <div className="flex items-center justify-center gap-1.5 h-12">
            {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
              <div
                key={bar}
                className={`w-1.5 rounded-full transition-all duration-200 ${
                  isAiSpeaking
                    ? 'bg-indigo-400 animate-pulse'
                    : isUserListening
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-white/20'
                }`}
                style={{
                  height: isAiSpeaking || isUserListening ? `${Math.sin(bar + Date.now() / 200) * 16 + 24}px` : '6px',
                }}
              />
            ))}
          </div>

          {/* 실시간 음성 자막 카드 */}
          {showSubtitles && currentAiSpeech && callState === 'connected' && (
            <div className="w-full max-w-sm p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-2 animate-fadeIn shadow-lg">
              <div className="text-lg font-black text-amber-300 leading-snug">
                {currentAiSpeech.japanese}
              </div>
              <div className="text-xs text-indigo-200 font-medium">
                [{currentAiSpeech.reading}]
              </div>
              <div className="text-xs text-slate-300 font-bold pt-1 border-t border-white/10">
                {currentAiSpeech.korean}
              </div>
            </div>
          )}

          {/* 사용자 인식 중 실시간 텍스트 */}
          {isUserListening && interimUserText && (
            <div className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-full border border-emerald-500/40 animate-pulse">
              🎙️ 들리는 중: "{interimUserText}"
            </div>
          )}

          {/* 말문이 막혔을 때 추천 힌트 */}
          {showHints && callState === 'connected' && (
            <div className="w-full max-w-sm p-3 bg-indigo-950/90 rounded-2xl border border-indigo-500/50 space-y-1.5 text-left animate-fadeIn">
              <span className="text-[11px] font-bold text-indigo-300 block">
                💡 이렇게 말씀해보세요:
              </span>
              <button
                onClick={() => handleUserUtterance('すみません、予約をお願いしたいのですが。')}
                className="w-full p-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition text-left cursor-pointer"
              >
                "すみません、予約をお願いしたいのですが。"
                <span className="block text-[10px] text-slate-400">
                  (저기 죄송한데, 예약을 부탁드리고 싶은데요.)
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 통화 종료 리포트 (통화 종료 시 표출) */}
        {callState === 'ended' && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 p-6 flex flex-col justify-between animate-fadeIn text-center">
            <div className="space-y-2 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 mx-auto flex items-center justify-center text-3xl shadow-xl">
                📞
              </div>
              <h3 className="text-xl font-black">통화 세션 완료</h3>
              <p className="text-xs text-slate-400">
                총 통화 시간: <strong className="text-white">{formatTime(callDuration)}</strong> · 나눈 대화: <strong className="text-white">{callTurns.length}턴</strong>
              </p>

              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2 max-h-48 overflow-y-auto">
                <span className="text-xs font-bold text-amber-400 block">
                  📝 통화 중 나눈 주요 표현:
                </span>
                {callTurns.slice(-3).map((turn, i) => (
                  <div key={i} className="text-xs space-y-0.5 border-b border-white/10 pb-1.5">
                    <span className="text-slate-400 font-bold">
                      {turn.speaker === 'user' ? '나' : partnerName}:
                    </span>
                    <p className="text-white font-medium">{turn.japanese}</p>
                    <p className="text-[11px] text-slate-400">{turn.korean}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-indigo-500/30"
            >
              닫기
            </button>
          </div>
        )}

        {/* 하단 통화 컨트롤 바 (전화기 실제 조작 UI) */}
        {callState !== 'ended' && (
          <div className="p-6 bg-slate-950/80 border-t border-white/10">
            <div className="flex items-center justify-around max-w-xs mx-auto">
              {/* 자막 토글 버튼 */}
              <button
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`w-13 h-13 rounded-full flex flex-col items-center justify-center text-xs transition cursor-pointer ${
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
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition cursor-pointer active:scale-95"
                title="통화 종료"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* 힌트 보기 토글 버튼 */}
              <button
                onClick={() => setShowHints(!showHints)}
                className={`w-13 h-13 rounded-full flex flex-col items-center justify-center text-xs transition cursor-pointer ${
                  showHints ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white'
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
