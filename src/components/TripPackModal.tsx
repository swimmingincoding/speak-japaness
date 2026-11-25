import React, { useState, useEffect } from 'react';
import { AIConfig } from '../types/conversation';
import {
  BUILTIN_TRIP_EXPANSION_PACKS,
  TripLanguagePack,
  TripPackSentence,
  hydrateInstalledTripPacks,
  installBuiltInTripPack,
  removeTripLanguagePack,
  generateCustomTripPackWithAI,
} from '../utils/tripLanguagePackStore';
import { FuriganaText } from './FuriganaText';
import { speakJapanese } from '../utils/speech';
import {
  X,
  Sparkles,
  Download,
  Check,
  Trash2,
  Volume2,
  Loader2,
  Briefcase,
  PackageCheck,
  Send,
} from 'lucide-react';

interface TripPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiConfig?: AIConfig;
  ttsSpeed?: number;
  onPacksChanged?: () => void;
  onSelectSentenceToTranslate?: (sentence: TripPackSentence) => void;
}

const EXAMPLE_PROMPTS = [
  '후쿠오카·유후인 3박 4일, 료칸 1박, 갑각류 알레르기 있음',
  '오사카·교토 맛집 투어, 고수랑 오이 못 먹음, 위스키 면세 쇼핑',
  '삿포로 겨울 가족여행, 부모님 무릎 배려 & 소도시 렌터카 운전',
  '도쿄 시부야·아키하바라 굿즈 쇼핑, 이자카야 혼술 투어',
];

export const TripPackModal: React.FC<TripPackModalProps> = ({
  isOpen,
  onClose,
  aiConfig,
  ttsSpeed = 1.0,
  onPacksChanged,
  onSelectSentenceToTranslate,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'installed'>('presets');
  const [installedPacks, setInstalledPacks] = useState<TripLanguagePack[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    hydrateInstalledTripPacks().then((packs) => {
      setInstalledPacks(packs);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const installedIds = new Set(installedPacks.map((p) => p.id));
  const totalInstalledSentences = installedPacks.reduce(
    (acc, p) => acc + p.sentences.length,
    0
  );

  const handleTogglePreset = async (presetId: string) => {
    if (installedIds.has(presetId)) {
      const next = await removeTripLanguagePack(presetId);
      setInstalledPacks(next);
      setStatusNotice('언어팩이 기기 저장소에서 제거되었습니다.');
    } else {
      const next = await installBuiltInTripPack(presetId);
      setInstalledPacks(next);
      setStatusNotice('아이폰 IndexedDB 영구 저장소에 즉시 설치되었습니다! (비행기 모드 작동)');
    }
    onPacksChanged?.();
  };

  const handleGenerateCustom = async () => {
    if (!customPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setStatusNotice('');
    try {
      const created = await generateCustomTripPackWithAI(customPrompt, aiConfig);
      const latest = await hydrateInstalledTripPacks();
      setInstalledPacks(latest);
      setCustomPrompt('');
      setActiveTab('installed');
      setStatusNotice(
        `✨ [${created.title}] (${created.sentences.length}문장) 생성 및 오프라인 영구 저장 완료!`
      );
      onPacksChanged?.();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePack = async (packId: string) => {
    const next = await removeTripLanguagePack(packId);
    setInstalledPacks(next);
    onPacksChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[88vh] bg-white sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-black">🎒 출국 전 맞춤 여행 언어팩</h2>
              <p className="text-[11px] text-indigo-200">
                IndexedDB 영구 보관 · 설치된 맞춤 문장 {totalInstalledSentences}개
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 바 */}
        <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-200/80 grid grid-cols-3 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📦 테마 확장팩
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            ✨ AI 일정 맞춤팩
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'installed'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📚 내 설치팩 ({installedPacks.length})
          </button>
        </div>

        {statusNotice && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11.5px] font-bold text-emerald-800 flex items-center gap-1.5 shrink-0">
            <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'presets' && (
            <>
              <p className="text-xs text-slate-500 font-medium px-1">
                API 키 없이도 탭 한 번으로 내 아이폰에 즉시 설치되며, 비행기 모드에서 0.001초 만에 번역·발음됩니다.
              </p>
              {BUILTIN_TRIP_EXPANSION_PACKS.map((preset) => {
                const isInstalled = installedIds.has(preset.id);
                return (
                  <div
                    key={preset.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{preset.emoji}</span>
                        <div>
                          <h3 className="text-xs font-black text-slate-900">{preset.title}</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            핵심 {preset.sentences.length}문장 · 전문 어휘 {preset.vocabPairs.length}개
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTogglePreset(preset.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition cursor-pointer ${
                          isInstalled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isInstalled ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> 설치됨
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" /> 즉시 설치
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{preset.description}</p>
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>내 여행 일정·알레르기·방문지 맞춤 사전 굽기</span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  출국 전 여행 코스와 특이사항을 적어주시면, 현장에서 꼭 쓰게 될 질문과 점원 예상 답변을 미리 생성해 아이폰 IndexedDB에 영구 저장합니다.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 block">
                  여행 일정 및 특이사항 입력
                </label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="예: 오사카 3박 4일, 부모님 동반, 갑각류 알레르기 있음, 가이세키 료칸 1박 예정"
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-[16px] font-medium text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">빠른 예시 선택:</span>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomPrompt(ex)}
                      className="text-left text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition cursor-pointer"
                    >
                      + {ex}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!customPrompt.trim() || isGenerating}
                onClick={handleGenerateCustom}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>맞춤 여행 언어팩 생성 및 오프라인 저장 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>내 맞춤 오프라인 언어팩 생성하기</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'installed' && (
            <div className="space-y-4">
              {installedPacks.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-slate-400">
                  <Briefcase className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">
                    아직 설치된 맞춤 여행 언어팩이 없습니다.
                  </p>
                  <p className="text-[11px]">
                    [테마 확장팩] 또는 [AI 일정 맞춤팩]에서 필요한 팩을 담아보세요!
                  </p>
                </div>
              ) : (
                installedPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                  >
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{pack.emoji}</span>
                        <div>
                          <div className="text-xs font-black text-slate-900">{pack.title}</div>
                          <div className="text-[10.5px] text-slate-500">
                            {pack.sentences.length}문장 · 오프라인 활성화됨
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePack(pack.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="이 언어팩 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {pack.sentences.map((sent, idx) => (
                        <div key={idx} className="p-3.5 space-y-1.5 hover:bg-slate-50/70">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800">
                              {sent.ko}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {onSelectSentenceToTranslate && (
                                <button
                                  onClick={() => {
                                    onSelectSentenceToTranslate(sent);
                                    onClose();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10.5px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Send className="w-3 h-3" /> 번역기로
                                </button>
                              )}
                              <button
                                onClick={() => speakJapanese(sent.jp, ttsSpeed)}
                                className="p-1.5 rounded-lg bg-indigo-600 text-white cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <FuriganaText
                            text={sent.jp}
                            showFurigana={true}
                            className="text-sm font-black text-indigo-950"
                            rtClassName="text-[9.5px] font-bold text-indigo-600"
                          />
                          <div className="text-[11px] font-bold text-indigo-600">
                            [{sent.koreanPronunciation}]
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
