import React from 'react';
import { AIConfig, DisplaySettings } from '../types/conversation';
import { X, Cpu, Volume2, Eye, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displaySettings: DisplaySettings;
  onUpdateDisplay: (next: DisplaySettings) => void;
  aiConfig: AIConfig;
  onUpdateAI: (next: AIConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  displaySettings,
  onUpdateDisplay,
  aiConfig,
  onUpdateAI,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h3 className="text-base font-extrabold text-slate-900">
            학습 스타일 & AI 엔진 설정
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 화면 표시 설정 */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600">
            <Eye className="w-4 h-4" /> 대화문 표시 옵션
          </div>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-slate-900">한자 위 후리가나 표시</div>
              <div className="text-[11px] text-slate-500">
                한자 바로 위에 히라가나 읽기를 표시합니다
              </div>
            </div>
            <input
              type="checkbox"
              checked={displaySettings.showFurigana}
              onChange={(e) =>
                onUpdateDisplay({ ...displaySettings, showFurigana: e.target.checked })
              }
              className="w-4 h-4 accent-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-slate-900">한국어 발음 가이드 표시</div>
              <div className="text-[11px] text-slate-500">
                예: [이랏샤이마세! 난메-사마데스카?]
              </div>
            </div>
            <input
              type="checkbox"
              checked={displaySettings.showKoreanPronunciation}
              onChange={(e) =>
                onUpdateDisplay({
                  ...displaySettings,
                  showKoreanPronunciation: e.target.checked,
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer">
            <div>
              <div className="text-sm font-bold text-slate-900">한국어 의미 번역 표시</div>
              <div className="text-[11px] text-slate-500">
                끄면 순수 일본어 듣기·독해 훈련이 가능합니다
              </div>
            </div>
            <input
              type="checkbox"
              checked={displaySettings.showTranslation}
              onChange={(e) =>
                onUpdateDisplay({ ...displaySettings, showTranslation: e.target.checked })
              }
              className="w-4 h-4 accent-indigo-600"
            />
          </label>
        </div>

        {/* 2. 음성(TTS) 속도 */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600">
            <Volume2 className="w-4 h-4" /> 원어민 음성(TTS) 속도
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateDisplay({ ...displaySettings, ttsSpeed: 0.78 })}
              className={`p-3 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                displaySettings.ttsSpeed < 0.9
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              🐢 천천히 명확하게 (0.78x)
            </button>
            <button
              onClick={() => onUpdateDisplay({ ...displaySettings, ttsSpeed: 1.0 })}
              className={`p-3 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                displaySettings.ttsSpeed >= 0.9
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              ⚡ 실제 현지 속도 (1.0x)
            </button>
          </div>
        </div>

        {/* 3. 실전 AI 프리토킹 & 실시간 AI 번역 엔진 설정 */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600">
            <Cpu className="w-4 h-4" /> AI 프리토킹 & 실시간 번역 엔진 (Gemini / GPT)
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'simulation', label: '내장 오프라인' },
                { id: 'gemini', label: 'Gemini 3.8 Flash' },
                { id: 'openai', label: 'OpenAI GPT' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => onUpdateAI({ ...aiConfig, provider: opt.id })}
                className={`p-2.5 rounded-2xl border text-[11px] font-extrabold leading-tight transition cursor-pointer ${
                  aiConfig.provider === opt.id
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(aiConfig.provider !== 'simulation' || aiConfig.apiKey.trim() !== '') && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {aiConfig.provider === 'openai' ? 'OpenAI API Key' : 'Gemini 3.8 Flash API Key'}
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    const nextProvider =
                      nextKey.trim().startsWith('AIza')
                        ? 'gemini'
                        : nextKey.trim().startsWith('sk-')
                        ? 'openai'
                        : aiConfig.provider === 'simulation' && nextKey.trim()
                        ? 'gemini'
                        : aiConfig.provider;
                    onUpdateAI({ ...aiConfig, provider: nextProvider, apiKey: nextKey });
                  }}
                  placeholder={
                    aiConfig.provider === 'openai' ? 'sk-proj-...' : 'AIzaSy...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 leading-relaxed">
                  ✨ Google AI Studio의 <strong>Gemini 3.8 Flash</strong> 모델이 최우선 작동하여 [AI 프리토킹], [자유 주제 대화], [실시간 번역] 모두 원어민 수준의 자연스러움을 제공합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <Check className="w-4 h-4" /> 저장 및 닫기
        </button>
      </div>
    </div>
  );
};
