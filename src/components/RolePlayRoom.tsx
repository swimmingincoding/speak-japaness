import React, { useState, useEffect, useRef } from 'react';
import {
  Scenario,
  RoleType,
  DisplaySettings,
  AIConfig,
  DialogueTurn,
  SavedExpression,
  FreeTalkMessage,
} from '../types/conversation';
import {
  speakJapanese,
  stopSpeaking,
  startJapaneseSpeechRecognition,
  calculateSimilarityScore,
  RecognitionHandle,
} from '../utils/speech';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
} from '../utils/japanesePhonetics';
import { generatePartnerReply } from '../utils/aiService';
import { FuriganaText } from './FuriganaText';
import {
  ArrowLeft,
  ArrowLeftRight,
  Volume2,
  Mic,
  MicOff,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  Send,
  Lightbulb,
  User,
  Store,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';

interface RolePlayRoomProps {
  scenario: Scenario;
  initialRole?: RoleType;
  displaySettings: DisplaySettings;
  onUpdateDisplay: (next: DisplaySettings) => void;
  aiConfig: AIConfig;
  savedIds: Set<string>;
  onToggleSave: (expr: SavedExpression) => void;
  completedRoles: { customer: boolean; staff: boolean };
  onMarkCompleted: (scenarioId: string, role: RoleType) => void;
  onBack: () => void;
}

export const RolePlayRoom: React.FC<RolePlayRoomProps> = ({
  scenario,
  initialRole = 'customer',
  displaySettings,
  onUpdateDisplay,
  aiConfig,
  savedIds,
  onToggleSave,
  completedRoles,
  onMarkCompleted,
  onBack,
}) => {
  const [userRole, setUserRole] = useState<RoleType>(initialRole);
  const [mode, setMode] = useState<'guided' | 'freetalk'>('guided');

  // 가이드 모드 상태
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [expandedTurnId, setExpandedTurnId] = useState<string | null>(null);
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(-1); // -1이면 기본 문장
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [speechResult, setSpeechResult] = useState<{
    score: number;
    feedback: string;
  } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);

  // 프리토킹 모드 상태
  const [freeMessages, setFreeMessages] = useState<FreeTalkMessage[]>([]);
  const [freeInput, setFreeInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const currentTurn: DialogueTurn | undefined = scenario.turns[currentTurnIndex];
  const isFinished = mode === 'guided' && currentTurnIndex >= scenario.turns.length;

  // 역할 또는 모드가 바뀔 때 초기화
  useEffect(() => {
    stopSpeaking();
    setCurrentTurnIndex(0);
    setSelectedAltIndex(-1);
    setSpokenTranscript('');
    setSpeechResult(null);
    setSpeechError(null);
    setExpandedTurnId(null);

    // 프리토킹 초기 메시지 세팅
    if (userRole === 'customer') {
      const opening = scenario.freeTalkStarter.customerStarts.staffOpening;
      setFreeMessages([
        {
          id: opening.id,
          sender: 'partner',
          role: 'staff',
          japanese: opening.japanese,
          furigana: opening.furigana,
          koreanPronunciation: opening.koreanPronunciation,
          koreanTranslation: opening.koreanTranslation,
          realLifeTip: opening.realLifeTip,
          suggestedReplies: scenario.turns
            .filter((t) => t.speaker === 'customer')
            .slice(0, 2)
            .map((t) => ({
              japanese: t.japanese,
              koreanPronunciation: t.koreanPronunciation,
              koreanTranslation: t.koreanTranslation,
            })),
        },
      ]);
    } else {
      const opening = scenario.freeTalkStarter.staffStarts.customerOpening;
      setFreeMessages([
        {
          id: opening.id,
          sender: 'partner',
          role: 'customer',
          japanese: opening.japanese,
          furigana: opening.furigana,
          koreanPronunciation: opening.koreanPronunciation,
          koreanTranslation: opening.koreanTranslation,
          realLifeTip: opening.realLifeTip,
          suggestedReplies: scenario.turns
            .filter((t) => t.speaker === 'staff')
            .slice(0, 2)
            .map((t) => ({
              japanese: t.japanese,
              koreanPronunciation: t.koreanPronunciation,
              koreanTranslation: t.koreanTranslation,
            })),
        },
      ]);
    }
  }, [userRole, scenario]);

  // 가이드 모드에서 상대방(Partner) 차례가 되면 자동으로 음성 들려주기 및 내 차례까지 진행 옵션
  useEffect(() => {
    if (mode !== 'guided') return;
    if (currentTurnIndex >= scenario.turns.length) {
      onMarkCompleted(scenario.id, userRole);
      return;
    }

    const turn = scenario.turns[currentTurnIndex];
    setSelectedAltIndex(-1);
    setSpokenTranscript('');
    setSpeechResult(null);
    setSpeechError(null);

    if (turn.speaker !== userRole && displaySettings.autoPlayPartnerAudio) {
      const timer = setTimeout(() => {
        speakJapanese(turn.japanese, displaySettings.ttsSpeed);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, mode, userRole, scenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTurnIndex, freeMessages, isListening, speechResult]);

  // 컴포넌트 언마운트 시 음성 정리
  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSwapRole = () => {
    const nextRole: RoleType = userRole === 'customer' ? 'staff' : 'customer';
    setUserRole(nextRole);
  };

  // 현재 내 턴에서 말할 목표 문장 정보
  const getActiveTargetPhrase = (turn: DialogueTurn) => {
    if (
      selectedAltIndex >= 0 &&
      turn.alternatives &&
      turn.alternatives[selectedAltIndex]
    ) {
      const alt = turn.alternatives[selectedAltIndex];
      return {
        japanese: alt.japanese,
        furigana: alt.furigana,
        koreanPronunciation: alt.koreanPronunciation,
        koreanTranslation: alt.koreanTranslation,
      };
    }
    return {
      japanese: turn.japanese,
      furigana: turn.furigana,
      koreanPronunciation: turn.koreanPronunciation,
      koreanTranslation: turn.koreanTranslation,
    };
  };

  // 가이드 모드 마이크 음성 인식 시작/중지
  const handleToggleMicGuided = () => {
    if (!currentTurn) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    setSpokenTranscript('');
    setSpeechResult(null);
    setIsListening(true);

    const target = getActiveTargetPhrase(currentTurn);

    const handle = startJapaneseSpeechRecognition(
      (transcript, isFinal) => {
        setSpokenTranscript(transcript);
        if (isFinal || transcript.length >= 2) {
          const result = calculateSimilarityScore(
            transcript,
            target.japanese,
            target.furigana
          );
          setSpeechResult(result);
        }
      },
      (errMsg) => {
        setSpeechError(errMsg);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    recognitionRef.current = handle;
  };

  // 프리토킹 모드 마이크 입력
  const handleToggleMicFreeTalk = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    setIsListening(true);

    const handle = startJapaneseSpeechRecognition(
      (transcript) => {
        setFreeInput(transcript);
      },
      (errMsg) => {
        setSpeechError(errMsg);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    recognitionRef.current = handle;
  };

  // 프리토킹 메시지 전송
  const handleSendFreeTalk = async (textToSend?: string) => {
    const content = (textToSend ?? freeInput).trim();
    if (!content || isAiThinking) return;

    const userMsg: FreeTalkMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: userRole,
      japanese: content,
      furigana: japaneseToHiraganaReading(content),
      koreanPronunciation: kanaToKoreanPronunciation(content),
      koreanTranslation: '',
    };

    const nextHistory = [...freeMessages, userMsg];
    setFreeMessages(nextHistory);
    setFreeInput('');
    setIsAiThinking(true);

    const reply = await generatePartnerReply(
      scenario,
      userRole,
      nextHistory,
      content,
      aiConfig
    );

    // 직전 사용자 메시지에 교정 피드백 추가 및 파트너 응답 추가
    const partnerRole: RoleType = userRole === 'customer' ? 'staff' : 'customer';
    const partnerMsg: FreeTalkMessage = {
      id: `partner-${Date.now()}`,
      sender: 'partner',
      role: partnerRole,
      japanese: reply.japanese,
      furigana: reply.furigana,
      koreanPronunciation: reply.koreanPronunciation,
      koreanTranslation: reply.koreanTranslation,
      realLifeTip: reply.realLifeTip,
      correctionFeedback: reply.correctionFeedback,
      suggestedReplies: reply.suggestedReplies,
    };

    setFreeMessages((prev) => [...prev, partnerMsg]);
    setIsAiThinking(false);

    if (displaySettings.autoPlayPartnerAudio) {
      speakJapanese(reply.japanese, displaySettings.ttsSpeed);
    }

    if (nextHistory.filter((m) => m.sender === 'user').length >= 2) {
      onMarkCompleted(scenario.id, userRole);
    }
  };

  // 전체 대화 연속 듣기
  const handlePlayAllDialogue = () => {
    let idx = 0;
    const playNext = () => {
      if (idx >= scenario.turns.length) return;
      const t = scenario.turns[idx];
      idx++;
      speakJapanese(t.japanese, displaySettings.ttsSpeed, () => {
        setTimeout(playNext, 450);
      });
    };
    playNext();
  };

  const visibleTurns = scenario.turns.slice(0, currentTurnIndex + 1);
  const lastFreePartnerMsg = [...freeMessages]
    .reverse()
    .find((m) => m.sender === 'partner');

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] pb-28">
      {/* 1. 상단 컨트롤 헤더 */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 pb-3 pt-2 px-1 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              stopSpeaking();
              onBack();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> 목록으로
          </button>

          <div className="text-center flex-1 truncate">
            <h2 className="text-sm font-bold text-white truncate">{scenario.title}</h2>
            <p className="text-[11px] text-slate-400 truncate">{scenario.placeName}</p>
          </div>

          <button
            onClick={handlePlayAllDialogue}
            className="flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 py-1.5 px-2.5 rounded-xl cursor-pointer shrink-0"
            title="전체 대화 연속 듣기"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> 전체듣기
          </button>
        </div>

        {/* 역할 스왑 버튼 (손님 A ↔ 종업원 B) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setUserRole('customer')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              userRole === 'customer'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>내 역할: 손님 (A)</span>
            {completedRoles.customer && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
          </button>
          <button
            onClick={() => setUserRole('staff')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              userRole === 'staff'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>내 역할: 종업원 (B)</span>
            {completedRoles.staff && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />}
          </button>
        </div>

        {/* 학습 모드 스위치 & 표시 토글 칩 */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setMode('guided')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                mode === 'guided'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" /> 가이드 스크립트
            </button>
            <button
              onClick={() => setMode('freetalk')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                mode === 'freetalk'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3 h-3" /> 실전 AI 프리토킹
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  showFurigana: !displaySettings.showFurigana,
                })
              }
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                displaySettings.showFurigana
                  ? 'bg-slate-800 border-rose-500/50 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              히라가나
            </button>
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  showKoreanPronunciation: !displaySettings.showKoreanPronunciation,
                })
              }
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                displaySettings.showKoreanPronunciation
                  ? 'bg-slate-800 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              한글발음
            </button>
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  showTranslation: !displaySettings.showTranslation,
                })
              }
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                displaySettings.showTranslation
                  ? 'bg-slate-800 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              한국어뜻
            </button>
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  ttsSpeed: displaySettings.ttsSpeed < 0.9 ? 1.0 : 0.78,
                })
              }
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            >
              {displaySettings.ttsSpeed < 0.9 ? '🐢0.78x' : '⚡1.0x'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 상황 브리핑 & 왜 점원 말이 안 들리는지 핵심 팁 */}
      <div className="mt-3 rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-white">📍 상황:</span> {scenario.situationBrief}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/20 text-xs text-rose-200/90 leading-relaxed">
          <strong className="text-rose-300">🎧 실제 일본에서 안 들리는 이유:</strong>{' '}
          {scenario.whyHardToUnderstand}
        </div>
        {userRole === 'staff' && (
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
            🧑‍🍳 <strong>종업원(B) 역할 체험 중!</strong> 내가 직접 일본인 직원이 되어 접객 경어를 입으로 말해보면, 여행지에서 점원이 하는 말이 놀라울 정도로 선명하게 들립니다.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3-A. 가이드 스크립트 모드 화면 */}
      {/* ======================================================== */}
      {mode === 'guided' && (
        <div className="mt-4 space-y-4 flex-1">
          {/* 진행 완료된 턴 및 현재 턴 채팅 버블 */}
          <div className="space-y-3.5">
            {visibleTurns.map((turn, idx) => {
              const isMyRole = turn.speaker === userRole;
              const isCurrentActive = idx === currentTurnIndex && !isFinished;
              const isSaved = savedIds.has(turn.id);
              const isExpanded = expandedTurnId === turn.id;

              return (
                <div
                  key={turn.id}
                  className={`flex flex-col ${
                    isMyRole ? 'items-end' : 'items-start'
                  } animate-fadeIn`}
                >
                  {/* 발화자 배지 */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        turn.speaker === 'customer'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {turn.speaker === 'customer' ? '🙋‍♂️ 손님 (A)' : '🧑‍🍳 종업원 (B)'}
                      {isMyRole ? ' · 나의 대사' : ' · 상대방 대사'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Turn {idx + 1}/{scenario.turns.length}
                    </span>
                  </div>

                  {/* 말풍선 본체 */}
                  <div
                    className={`w-full max-w-[92%] rounded-2xl p-4 border transition shadow-md ${
                      isMyRole
                        ? isCurrentActive
                          ? 'bg-sky-950/80 border-2 border-sky-400'
                          : 'bg-slate-900 border-sky-500/30'
                        : isCurrentActive
                        ? 'bg-amber-950/70 border-2 border-amber-400'
                        : 'bg-slate-900/95 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1">
                        <div>
                          <FuriganaText
                            text={turn.japanese}
                            showFurigana={displaySettings.showFurigana}
                            className="text-base sm:text-lg font-bold text-white"
                            rtClassName="text-[10px] font-semibold text-rose-300"
                          />
                        </div>

                        {displaySettings.showKoreanPronunciation && (
                          <div className="text-xs font-semibold text-amber-300 leading-relaxed">
                            [{turn.koreanPronunciation}]
                          </div>
                        )}

                        {displaySettings.showTranslation && (
                          <div className="text-sm font-medium text-emerald-300 pt-1">
                            {turn.koreanTranslation}
                          </div>
                        )}
                      </div>

                      {/* 우측 스피커 & 북마크 버튼 */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => speakJapanese(turn.japanese, displaySettings.ttsSpeed)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition cursor-pointer"
                          title="원어민 발음 듣기"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            onToggleSave({
                              id: turn.id,
                              scenarioId: scenario.id,
                              scenarioTitle: scenario.title,
                              speaker: turn.speaker,
                              japanese: turn.japanese,
                              furigana: turn.furigana,
                              koreanPronunciation: turn.koreanPronunciation,
                              koreanTranslation: turn.koreanTranslation,
                              realLifeTip: turn.realLifeTip,
                              savedAt: new Date().toISOString(),
                            })
                          }
                          className={`p-2 rounded-xl transition cursor-pointer ${
                            isSaved
                              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="나만의 단어장에 저장"
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 실생활 표현 팁 & 단어장 토글 바 */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() =>
                          setExpandedTurnId(isExpanded ? null : turn.id)
                        }
                        className="text-xs font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>
                          실생활 원어민 뉘앙스 & 핵심 단어 ({turn.vocab.length}개)
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => speakJapanese(turn.japanese, 0.72)}
                        className="text-[11px] text-slate-400 hover:text-amber-300 font-medium cursor-pointer"
                      >
                        🐢 느리게 듣기
                      </button>
                    </div>

                    {/* 펼쳐진 상세 해설: 원어민 팁 + 접객 경어 포인트 + 단어장 */}
                    {(isExpanded || isCurrentActive) && (
                      <div className="mt-2.5 space-y-2 bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs">
                        <div className="text-slate-200 leading-relaxed">
                          <span className="font-bold text-amber-300">💡 현지 실전 팁: </span>
                          {turn.realLifeTip}
                        </div>

                        {turn.staffKeigoPoint && (
                          <div className="text-slate-200 leading-relaxed pt-1 border-t border-slate-800/80">
                            <span className="font-bold text-rose-400">
                              🛎️ 종업원 접객어 포인트:{' '}
                            </span>
                            {turn.staffKeigoPoint}
                          </div>
                        )}

                        {turn.vocab.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-800/80">
                            <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                              핵심 단어 콕콕:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {turn.vocab.map((v, vIdx) => (
                                <div
                                  key={vIdx}
                                  onClick={() => speakJapanese(v.word, 0.9)}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer"
                                >
                                  <div>
                                    <span className="font-bold text-white">{v.word}</span>{' '}
                                    <span className="text-[11px] text-amber-300">
                                      [{v.koreanPronunciation}]
                                    </span>
                                    <div className="text-[11px] text-emerald-300">
                                      {v.meaning}
                                    </div>
                                  </div>
                                  <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 현재 진행 컨트롤 패널 (상대방 차례 vs 내 차례 vs 대화 완료) */}
          {!isFinished && currentTurn && (
            <div className="rounded-2xl bg-slate-900 border-2 border-rose-500/40 p-4 shadow-xl space-y-3">
              {currentTurn.speaker !== userRole ? (
                // 상대방(점원 또는 손님) 차례일 때
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      🎧 상대방({currentTurn.speaker === 'staff' ? '종업원' : '손님'})의 말을 잘 들어보세요
                    </span>
                    <button
                      onClick={() =>
                        speakJapanese(currentTurn.japanese, displaySettings.ttsSpeed)
                      }
                      className="text-xs font-bold text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" /> 다시 듣기
                    </button>
                  </div>
                  <p className="text-xs text-slate-300">
                    상대방의 질문과 핵심 키워드를 이해했다면 아래 버튼을 눌러 내 대답 차례로 넘어가세요!
                  </p>
                  <button
                    onClick={() => setCurrentTurnIndex((prev) => prev + 1)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg cursor-pointer"
                  >
                    상대방 말 이해 완료! 내 차례로 진행 →
                  </button>
                </div>
              ) : (
                // 내 차례(My Turn)일 때: 대안 표현 선택 + 마이크 발화 연습
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      🎙️ 나의 발화 차례 ({userRole === 'customer' ? '손님 A' : '종업원 B'})
                    </span>
                    <button
                      onClick={() =>
                        speakJapanese(
                          getActiveTargetPhrase(currentTurn).japanese,
                          displaySettings.ttsSpeed
                        )
                      }
                      className="text-xs font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" /> 원어민 발음 먼저 듣기
                    </button>
                  </div>

                  {/* 상황에 맞는 다른 표현(Alternatives) 선택 탭 */}
                  {currentTurn.alternatives && currentTurn.alternatives.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400">
                        📌 내 스타일에 맞는 대답 표현 골라 말하기:
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => setSelectedAltIndex(-1)}
                          className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                            selectedAltIndex === -1
                              ? 'bg-sky-950/90 border-sky-400 text-white'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="font-bold">기본: {currentTurn.japanese}</div>
                          <div className="text-[11px] text-amber-300">
                            [{currentTurn.koreanPronunciation}]
                          </div>
                        </button>
                        {currentTurn.alternatives.map((alt, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => setSelectedAltIndex(aIdx)}
                            className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                              selectedAltIndex === aIdx
                                ? 'bg-sky-950/90 border-sky-400 text-white'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">응용 {aIdx + 1}: {alt.japanese}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                {alt.nuance}
                              </span>
                            </div>
                            <div className="text-[11px] text-amber-300">
                              [{alt.koreanPronunciation}] — {alt.koreanTranslation}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 내가 읽어야 할 타겟 문장 하이라이트 */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400">아래 문장을 소리 내어 말해보세요:</div>
                    <div>
                      <FuriganaText
                        text={getActiveTargetPhrase(currentTurn).japanese}
                        showFurigana={displaySettings.showFurigana}
                        className="text-base font-bold text-white"
                        rtClassName="text-[10px] font-semibold text-rose-300"
                      />
                    </div>
                    <div className="text-xs font-bold text-amber-300">
                      [{getActiveTargetPhrase(currentTurn).koreanPronunciation}]
                    </div>
                  </div>

                  {/* 음성 인식 결과 표시 */}
                  {(spokenTranscript || speechResult || speechError) && (
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
                      {spokenTranscript && (
                        <div>
                          <span className="text-slate-400">내 발음 인식 결과: </span>
                          <span className="font-bold text-white">{spokenTranscript}</span>
                        </div>
                      )}
                      {speechResult && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-emerald-300 font-semibold">
                            {speechResult.feedback}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold">
                            {speechResult.score}점
                          </span>
                        </div>
                      )}
                      {speechError && (
                        <div className="text-rose-400">{speechError}</div>
                      )}
                    </div>
                  )}

                  {/* 마이크 말하기 버튼 & 다음 턴 진행 버튼 */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleToggleMicGuided}
                      className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4" /> 듣는 중... (탭하여 완료)
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-rose-400" /> 마이크로 직접 말하기
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setCurrentTurnIndex((prev) => prev + 1)}
                      className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> 말하기 완료 · 다음 턴 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 시나리오 완료 축하 & 역할 바꾸기 유도 카드 */}
          {isFinished && (
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 border-2 border-rose-500/40 p-6 text-center space-y-4 shadow-2xl animate-fadeIn">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-300">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                🎉 [{userRole === 'customer' ? '손님(A)' : '종업원(B)'}] 역할 롤플레잉 완주!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                {userRole === 'customer'
                  ? '손님 입장에서 대화를 마쳤습니다! 이제 역할을 바꿔 [종업원(B)]이 되어 손님을 응대해 볼까요? 점원의 대사를 직접 입으로 말해보면 다음 일본 여행에서 점원의 말이 2배 더 잘 들립니다!'
                  : '종업원 역할까지 완벽하게 소화하셨네요! 이제 손님과 점원 양쪽의 대화 흐름과 접객 경어를 모두 마스터하셨습니다.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={handleSwapRole}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {userRole === 'customer'
                    ? '종업원(B)으로 역할 바꿔서 대화하기'
                    : '손님(A)으로 역할 바꿔서 대화하기'}
                </button>
                <button
                  onClick={() => setMode('freetalk')}
                  className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  대본 없이 실전 AI 프리토킹 도전!
                </button>
              </div>

              <button
                onClick={() => setCurrentTurnIndex(0)}
                className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 처음부터 다시 연습하기
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* ======================================================== */}
      {/* 3-B. 실전 AI 프리토킹 모드 화면 */}
      {/* ======================================================== */}
      {mode === 'freetalk' && (
        <div className="mt-4 space-y-4 flex-1 flex flex-col">
          {/* 프리토킹 미션 박스 */}
          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                🎯 실전 프리토킹 미션 ({userRole === 'customer' ? '손님 A 역할' : '종업원 B 역할'})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {aiConfig.provider === 'simulation'
                  ? '스마트 시뮬레이션 엔진'
                  : `${aiConfig.provider.toUpperCase()} 실시간 AI`}
              </span>
            </div>
            <ul className="space-y-1 text-xs text-slate-200">
              {(userRole === 'customer'
                ? scenario.freeTalkStarter.customerStarts.missions
                : scenario.freeTalkStarter.staffStarts.missions
              ).map((m, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 프리토킹 메시지 내역 */}
          <div className="space-y-3 flex-1">
            {freeMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[11px] text-slate-400 mb-1 px-1">
                    {msg.role === 'customer' ? '🙋‍♂️ 손님 (A)' : '🧑‍🍳 종업원 (B)'}
                    {isUser ? ' · 나' : ' · AI 파트너'}
                  </span>
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 border space-y-1.5 ${
                      isUser
                        ? 'bg-sky-950/80 border-sky-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <FuriganaText
                          text={msg.japanese}
                          showFurigana={displaySettings.showFurigana}
                          className="text-base font-bold text-white"
                          rtClassName="text-[10px] font-semibold text-rose-300"
                        />
                      </div>
                      <button
                        onClick={() => speakJapanese(msg.japanese, displaySettings.ttsSpeed)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-rose-600 cursor-pointer shrink-0"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    {displaySettings.showKoreanPronunciation && msg.koreanPronunciation && (
                      <div className="text-xs font-semibold text-amber-300">
                        [{msg.koreanPronunciation}]
                      </div>
                    )}
                    {displaySettings.showTranslation && msg.koreanTranslation && (
                      <div className="text-sm text-emerald-300">{msg.koreanTranslation}</div>
                    )}

                    {msg.correctionFeedback && (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200">
                        ✨ <strong>회화 코칭:</strong> {msg.correctionFeedback}
                      </div>
                    )}
                    {msg.realLifeTip && (
                      <div className="mt-1 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                        💡 <strong>현지 표현 팁:</strong> {msg.realLifeTip}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isAiThinking && (
              <div className="text-xs text-slate-400 animate-pulse px-2">
                상대방이 일본어로 답변을 준비하고 있습니다...
              </div>
            )}
          </div>

          {/* 프리토킹 추천 답변 칩 + 입력창 */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 space-y-2.5 sticky bottom-16">
            {lastFreePartnerMsg?.suggestedReplies &&
              lastFreePartnerMsg.suggestedReplies.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    💬 이렇게 대답해보세요 (탭하면 바로 발화/전송):
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {lastFreePartnerMsg.suggestedReplies.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendFreeTalk(sug.japanese)}
                        className="text-left p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs transition cursor-pointer"
                      >
                        <div className="font-bold text-white">{sug.japanese}</div>
                        <div className="text-[11px] text-amber-300">
                          [{sug.koreanPronunciation}] —{' '}
                          <span className="text-slate-300">{sug.koreanTranslation}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMicFreeTalk}
                className={`p-3 rounded-xl border transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700'
                }`}
                title="일본어 음성으로 말하기"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendFreeTalk();
                }}
                placeholder="일본어로 말하거나 직접 입력해보세요..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                onClick={() => handleSendFreeTalk()}
                disabled={!freeInput.trim() || isAiThinking}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={chatEndRef} />
        </div>
      )}
    </div>
  );
};

