import React, { useRef, useState } from 'react';
import { AIConfig, DisplaySettings } from '../types/conversation';
import { X, Cpu, Volume2, Eye, Check, Download, Upload, Database } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displaySettings: DisplaySettings;
  onUpdateDisplay: (next: DisplaySettings) => void;
  aiConfig: AIConfig;
  onUpdateAI: (next: AIConfig) => void;
  onDataRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  displaySettings,
  onUpdateDisplay,
  aiConfig,
  onUpdateAI,
  onDataRestored,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // 내 단어장 · 커스텀 시나리오 · 망각곡선 · 스트릭 전체 데이터 JSON 백업 내보내기
  const handleExportBackup = () => {
    try {
      const backupPayload: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // API Key를 제외한 개인 학습 기록만 안전하게 백업
        if (key && key.startsWith('tabitalk_') && key !== 'tabitalk_ai_config_v1') {
          const val = localStorage.getItem(key);
          if (val !== null) backupPayload[key] = val;
        }
      }
      const jsonStr = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          app: 'TabiTalk',
          data: backupPayload,
        },
        null,
        2
      );
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TabiTalk_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setBackupMessage('✅ 단어장·학습 기록 백업 파일이 저장되었습니다.');
    } catch {
      setBackupMessage('⚠️ 백업 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // JSON 백업 파일 불러오기 및 복원
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const dataMap = parsed?.data;
        if (!dataMap || typeof dataMap !== 'object') {
          setBackupMessage('⚠️ 올바른 TabiTalk 백업 파일이 아닙니다.');
          return;
        }
        let count = 0;
        Object.entries(dataMap).forEach(([k, v]) => {
          if (k.startsWith('tabitalk_') && typeof v === 'string') {
            localStorage.setItem(k, v);
            count++;
          }
        });
        setBackupMessage(`🎉 ${count}개 학습 항목이 성공적으로 복원되었습니다!`);
        onDataRestored?.();
      } catch {
        setBackupMessage('⚠️ 백업 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white border border-slate-200 px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,16px)+1.25rem)] sm:p-6 space-y-5 max-h-[calc(100dvh-1.5rem)] overflow-y-auto smooth-scroll shadow-2xl animate-fadeIn">
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
                  ✨ Google AI Studio의 <strong>Gemini 3.8 Flash</strong> 모델이 최우선 작동하여 [AI 프리토킹], [자유 주제 대화], [실시간 번역], [메뉴판 스캔] 모두 원어민 수준의 자연스러움을 제공합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. 학습 기록 및 단어장 백업/복원 (아이폰 Safari 데이터 초기화 대비) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
            <Database className="w-4 h-4 text-indigo-600" /> 단어장 · 학습 진도 · 스트릭 백업
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>백업 파일 저장</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>백업 불러오기</span>
            </button>
          </div>
          {backupMessage && (
            <p className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-xl">
              {backupMessage}
            </p>
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
