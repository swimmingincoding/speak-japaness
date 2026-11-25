/**
 * [Milestone 4] 아이폰 16 프로 온디바이스 신경망 번역(NMT) 클라이언트 매니저
 * - Web Worker 생명주기 관리 및 3분(180초) 유휴 시 메모리(RAM/WASM) 자동 슬립(해제)
 * - navigator.storage.persist() 영구 캐시 보호 및 원클릭 캐시 용량 삭제 지원
 */

import type { OnDeviceModelPreset } from '../workers/onDeviceNmtWorker';

export type { OnDeviceModelPreset };

export interface OnDeviceNmtStatus {
  enabled: boolean;
  isDownloaded: boolean;
  state: 'idle' | 'loading' | 'ready' | 'sleeping' | 'error';
  preset: OnDeviceModelPreset;
  progress: number;
  message: string;
}

const STORAGE_NMT_PREF_KEY = 'tabitalk_ondevice_nmt_pref_v1';
const IDLE_TIMEOUT_MS = 180_000; // 3분 미사용 시 아이폰 메모리 보호를 위해 워커 슬립

let workerInstance: Worker | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let reqCounter = 0;

const pendingResolvers = new Map<
  number,
  { resolve: (val: string) => void; reject: (err: Error) => void }
>();

const statusListeners = new Set<(status: OnDeviceNmtStatus) => void>();

function loadInitialPref(): { enabled: boolean; isDownloaded: boolean; preset: OnDeviceModelPreset } {
  if (typeof localStorage === 'undefined') {
    return { enabled: false, isDownloaded: false, preset: 'm2m100-418m' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_NMT_PREF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        isDownloaded: Boolean(parsed.isDownloaded),
        preset: parsed.preset === 'nllb-600m' ? 'nllb-600m' : 'm2m100-418m',
      };
    }
  } catch {
    // ignore
  }
  return { enabled: false, isDownloaded: false, preset: 'm2m100-418m' };
}

const initialPref = loadInitialPref();

let currentStatus: OnDeviceNmtStatus = {
  enabled: initialPref.enabled,
  isDownloaded: initialPref.isDownloaded,
  state: initialPref.enabled && initialPref.isDownloaded ? 'sleeping' : 'idle',
  preset: initialPref.preset,
  progress: initialPref.isDownloaded ? 100 : 0,
  message: initialPref.isDownloaded
    ? '아이폰 캐시에 설치됨 (번역 시 자동 깨어남)'
    : 'Wi-Fi에서 1회 다운로드하면 비행기 모드에서 작동합니다',
};

function savePref(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_NMT_PREF_KEY,
      JSON.stringify({
        enabled: currentStatus.enabled,
        isDownloaded: currentStatus.isDownloaded,
        preset: currentStatus.preset,
      })
    );
  } catch {
    // ignore
  }
}

function notifyListeners(): void {
  const snapshot = { ...currentStatus };
  statusListeners.forEach((fn) => fn(snapshot));
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    suspendOnDeviceWorker();
  }, IDLE_TIMEOUT_MS);
}

function getOrCreateWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/onDeviceNmtWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerInstance.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'status') {
        if (data.status === 'ready') {
          currentStatus = {
            ...currentStatus,
            enabled: true,
            isDownloaded: true,
            state: 'ready',
            preset: data.preset || currentStatus.preset,
            progress: 100,
            message: data.message,
          };
          savePref();
          resetIdleTimer();
        } else if (data.status === 'loading') {
          currentStatus = {
            ...currentStatus,
            state: 'loading',
            progress: data.progress ?? currentStatus.progress,
            message: data.message,
          };
        } else if (data.status === 'error') {
          currentStatus = {
            ...currentStatus,
            state: 'error',
            message: data.message,
          };
        }
        notifyListeners();
      } else if (data.type === 'result') {
        const pending = pendingResolvers.get(data.reqId);
        if (pending) {
          pendingResolvers.delete(data.reqId);
          pending.resolve(data.translatedText || '');
        }
        resetIdleTimer();
      } else if (data.type === 'error') {
        const pending = pendingResolvers.get(data.reqId);
        if (pending) {
          pendingResolvers.delete(data.reqId);
          pending.reject(new Error(data.error || 'Worker error'));
        }
      }
    };
  }
  return workerInstance;
}

export function subscribeOnDeviceNmtStatus(
  listener: (status: OnDeviceNmtStatus) => void
): () => void {
  statusListeners.add(listener);
  listener({ ...currentStatus });
  return () => {
    statusListeners.delete(listener);
  };
}

export function getOnDeviceNmtStatus(): OnDeviceNmtStatus {
  return { ...currentStatus };
}

export async function downloadAndActivateOnDeviceModel(
  preset: OnDeviceModelPreset = currentStatus.preset
): Promise<void> {
  // iOS Safari가 저장공간 부족 시 임의로 모델 캐시를 삭제하지 않도록 영구 저장소 권한 요청
  try {
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // ignore
  }

  currentStatus = {
    ...currentStatus,
    enabled: true,
    preset,
    state: 'loading',
    progress: 1,
    message: '신경망 번역 엔진 초기화 중...',
  };
  savePref();
  notifyListeners();

  const worker = getOrCreateWorker();
  worker.postMessage({ type: 'preload', preset });
}

export function setOnDeviceModelPreset(preset: OnDeviceModelPreset): void {
  if (currentStatus.preset === preset) return;
  suspendOnDeviceWorker();
  currentStatus = {
    ...currentStatus,
    preset,
    state: currentStatus.isDownloaded ? 'sleeping' : 'idle',
    progress: 0,
    message:
      preset === 'nllb-600m'
        ? 'NLLB-200 고정밀 아시아 특화 모델 선택됨'
        : 'M2M-100 경량 고속 다국어 모델 선택됨',
  };
  savePref();
  notifyListeners();
}

export function toggleOnDeviceNmtEnabled(enabled: boolean): void {
  currentStatus = {
    ...currentStatus,
    enabled,
    state: !enabled ? 'idle' : currentStatus.isDownloaded ? 'sleeping' : 'idle',
    message: !enabled
      ? '온디바이스 신경망 엔진 비활성화됨 (배터리 절약)'
      : currentStatus.isDownloaded
      ? '활성화됨 (번역 시 캐시에서 즉시 구동)'
      : '모델 다운로드가 필요합니다',
  };
  if (!enabled) {
    suspendOnDeviceWorker();
  }
  savePref();
  notifyListeners();
}

/**
 * 아이폰 Safari RAM 반환을 위해 백그라운드 워커만 종료 (다운로드된 디스크 캐시는 그대로 유지!)
 */
export function suspendOnDeviceWorker(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  for (const pending of pendingResolvers.values()) {
    pending.reject(new Error('Worker suspended'));
  }
  pendingResolvers.clear();

  if (currentStatus.state === 'ready') {
    currentStatus = {
      ...currentStatus,
      state: 'sleeping',
      message: '메모리 절전 대기 중 (입력 시 자동 깨어남)',
    };
    notifyListeners();
  }
}

/**
 * 브라우저 Cache Storage에서 다운로드된 모델 가중치 파일을 완전히 제거하여 저장공간 확보
 */
export async function clearOnDeviceModelCache(): Promise<void> {
  suspendOnDeviceWorker();
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete('transformers-cache');
    }
  } catch {
    // ignore
  }
  currentStatus = {
    ...currentStatus,
    enabled: false,
    isDownloaded: false,
    state: 'idle',
    progress: 0,
    message: '모델 캐시가 완전히 삭제되었습니다.',
  };
  savePref();
  notifyListeners();
}

export function translateWithOnDeviceNmt(
  text: string,
  direction: 'ko-to-jp' | 'jp-to-ko'
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!currentStatus.enabled) {
      reject(new Error('On-device NMT not enabled'));
      return;
    }
    const worker = getOrCreateWorker();
    const reqId = ++reqCounter;
    pendingResolvers.set(reqId, { resolve, reject });
    worker.postMessage({
      type: 'translate',
      reqId,
      text,
      direction,
      preset: currentStatus.preset,
    });
  });
}

