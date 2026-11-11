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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">나만의 학습 스타일 & AI 설정</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 화면 표시 설정 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" /> 대화문 표시 옵션
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-200">후리가나 (히라가나 읽기) 표시</div>
              <div className="text-[11px] text-slate-400">한자 아래에 히라가나 독음을 함께 표시합니다</div>
            </div>
            <input
              type="checkbox"
              checked={displaySettings.showFurigana}
              onChange={(e) =>
                onUpdateDisplay({ ...displaySettings, showFurigana: e.target.checked })
              }
              className="w-4 h-4 accent-rose-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-200">한국어 발음 가이드 표시</div>
              <div className="text-[11px] text-slate-400">예: [이랏샤이마세! 난메-사마데스카?]</div>
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
              className="w-4 h-4 accent-rose-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-200">한국어 의미 번역 표시</div>
              <div className="text-[11px] text-slate-400">끄면 순수 일본어 듣기/독해 훈련이 가능합니다</div>
            </div>
            <input
              type="checkbox"
              checked={displaySettings.showTranslation}
              onChange={(e) =>
                onUpdateDisplay({ ...displaySettings, showTranslation: e.target.checked })
              }
              className="w-4 h-4 accent-rose-500"
            />
          </label>
        </div>

        {/* 2. 음성(TTS) 속도 및 자동 재생 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Volume2 className="w-4 h-4" /> 원어민 음성(TTS) 설정
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateDisplay({ ...displaySettings, ttsSpeed: 0.78 })}
              className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                displaySettings.ttsSpeed < 0.9
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              🐢 천천히 명확하게 (0.78x)
            </button>
            <button
              onClick={() => onUpdateDisplay({ ...displaySettings, ttsSpeed: 1.0 })}
              className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                displaySettings.ttsSpeed >= 0.9
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              ⚡ 실제 현지 속도 (1.0x)
            </button>
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-200">상대방 대사 자동 음성 재생</div>
              <div className="text-[11px] text-slate-400">상대방 턴이 되면 자동으로 일본어 음성을 들려줍니다</div>
            </div>
            <input
              type="checkbox"
              checked={displaySettings.autoPlayPartnerAudio}
              onChange={(e) =>
                onUpdateDisplay({
                  ...displaySettings,
                  autoPlayPartnerAudio: e.target.checked,
                })
              }
              className="w-4 h-4 accent-amber-500"
            />
          </label>
        </div>

        {/* 3. 실전 AI 프리토킹 엔진 설정 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Cpu className="w-4 h-4" /> 실전 AI 프리토킹 엔진 설정
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'simulation', label: '스마트 시뮬레이션 (무료 기본)' },
                { id: 'gemini', label: 'Google Gemini API' },
                { id: 'openai', label: 'OpenAI GPT API' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => onUpdateAI({ ...aiConfig, provider: opt.id })}
                className={`p-2.5 rounded-xl border text-[11px] font-bold leading-tight transition cursor-pointer ${
                  aiConfig.provider === opt.id
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {aiConfig.provider === 'simulation' ? (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              ✅ <strong>API 키 없이도 바로 사용 가능!</strong> 내장된 시나리오 문맥 엔진이 손님/종업원 역할에 맞춰 자연스럽게 대화를 이어가고 추천 답변과 교정 팁을 제공합니다.
            </div>
          ) : (
            <div className="space-y-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {aiConfig.provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => onUpdateAI({ ...aiConfig, apiKey: e.target.value })}
                  placeholder={
                    aiConfig.provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  모델 이름 (선택사항)
                </label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={(e) => onUpdateAI({ ...aiConfig, model: e.target.value })}
                  placeholder={
                    aiConfig.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                * 입력하신 API 키는 외부 서버로 전송되지 않고 현재 기기 브라우저(localStorage)에만 안전하게 저장됩니다.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
        >
          <Check className="w-4 h-4" /> 설정 저장 및 닫기
        </button>
      </div>
    </div>
  );
};

