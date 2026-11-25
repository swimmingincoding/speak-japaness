/**
 * [Milestone 4] Tier 3: 아이폰 16 프로 전용 온디바이스 신경망 번역(NMT) Web Worker
 * - 메인 UI 스레드 블로킹 0% (전용 백그라운드 워커에서 토크나이징 및 ONNX 추론 수행)
 * - 첫 1회 Wi-Fi 다운로드 후 브라우저 Cache Storage('transformers-cache')에 영구 보관되어
 *   완전 비행기 모드(데이터 0바이트)에서도 한↔일 자유 문장을 신경망으로 직접 번역합니다.
 */

import { pipeline, env } from '@huggingface/transformers';

// 브라우저 Cache API 사용 강제 (로컬 서버 불필요 파일 탐색 비활성화)
env.allowLocalModels = false;
env.useBrowserCache = true;

export type OnDeviceModelPreset = 'nllb-600m' | 'm2m100-418m';

const MODEL_ID_MAP: Record<OnDeviceModelPreset, { repo: string; koCode: string; jaCode: string }> = {
  'nllb-600m': {
    repo: 'Xenova/nllb-200-distilled-600M',
    koCode: 'kor_Hang',
    jaCode: 'jpn_Jpan',
  },
  'm2m100-418m': {
    repo: 'Xenova/m2m100_418M',
    koCode: 'ko',
    jaCode: 'ja',
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeTranslator: any = null;
let loadedPreset: OnDeviceModelPreset | null = null;
let loadingPromise: Promise<void> | null = null;

const fileProgressMap = new Map<string, { loaded: number; total: number }>();

function calcOverallProgress(): number {
  let totalLoaded = 0;
  let totalBytes = 0;
  for (const val of fileProgressMap.values()) {
    totalLoaded += val.loaded;
    totalBytes += val.total;
  }
  if (totalBytes <= 0) return 0;
  return Math.min(99, Math.round((totalLoaded / totalBytes) * 100));
}

async function ensurePipeline(preset: OnDeviceModelPreset): Promise<void> {
  if (activeTranslator && loadedPreset === preset) return;
  if (loadingPromise && loadedPreset === preset) {
    await loadingPromise;
    return;
  }

  loadedPreset = preset;
  fileProgressMap.clear();
  const meta = MODEL_ID_MAP[preset];

  // 오프라인(비행기 모드) 상태일 때는 원격 체크를 건너뛰고 로컬 브라우저 캐시에서 즉시 로드
  env.allowRemoteModels = typeof navigator !== 'undefined' ? navigator.onLine : true;

  loadingPromise = (async () => {
    self.postMessage({
      type: 'status',
      status: 'loading',
      preset,
      progress: 1,
      message: env.allowRemoteModels
        ? '온디바이스 신경망 모델 준비 및 캐시 확인 중...'
        : '비행기 모드: 아이폰 로컬 캐시에서 신경망 모델 불러오는 중...',
    });

    activeTranslator = await pipeline('translation', meta.repo, {
      dtype: 'q8',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (info: any) => {
        if (info?.status === 'progress' && info.file) {
          fileProgressMap.set(info.file, {
            loaded: Number(info.loaded) || 0,
            total: Number(info.total) || 1,
          });
          const pct = calcOverallProgress() || Math.round(Number(info.progress) || 0);
          self.postMessage({
            type: 'status',
            status: 'loading',
            preset,
            progress: pct,
            message: `모델 가중치 다운로드/로딩 중 (${pct}%)`,
          });
        } else if (info?.status === 'ready') {
          self.postMessage({
            type: 'status',
            status: 'ready',
            preset,
            progress: 100,
            message: '온디바이스 신경망 엔진 준비 완료 (오프라인 작동 가능)',
          });
        }
      },
    });

    self.postMessage({
      type: 'status',
      status: 'ready',
      preset,
      progress: 100,
      message: '온디바이스 신경망 엔진 활성화됨 (비행기 모드 지원)',
    });
  })();

  try {
    await loadingPromise;
  } catch (err) {
    activeTranslator = null;
    loadedPreset = null;
    loadingPromise = null;
    throw err;
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'preload') {
    const preset: OnDeviceModelPreset = data.preset || 'm2m100-418m';
    try {
      await ensurePipeline(preset);
    } catch (err) {
      self.postMessage({
        type: 'status',
        status: 'error',
        preset,
        progress: 0,
        message:
          !navigator.onLine
            ? '아직 다운로드된 모델 캐시가 없습니다. Wi-Fi 환경에서 먼저 1회 다운로드해 주세요.'
            : `모델 로드 실패: ${err instanceof Error ? err.message : '네트워크 확인 필요'}`,
      });
    }
    return;
  }

  if (data.type === 'translate') {
    const { reqId, text, direction, preset = 'm2m100-418m' } = data as {
      reqId: number;
      text: string;
      direction: 'ko-to-jp' | 'jp-to-ko';
      preset?: OnDeviceModelPreset;
    };

    try {
      await ensurePipeline(preset);
      const meta = MODEL_ID_MAP[preset];
      const src_lang = direction === 'ko-to-jp' ? meta.koCode : meta.jaCode;
      const tgt_lang = direction === 'ko-to-jp' ? meta.jaCode : meta.koCode;

      const output = await activeTranslator(text, {
        src_lang,
        tgt_lang,
        max_new_tokens: 128,
      });

      const translatedText = Array.isArray(output)
        ? output[0]?.translation_text || ''
        : output?.translation_text || '';

      self.postMessage({
        type: 'result',
        reqId,
        translatedText: String(translatedText).trim(),
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        reqId,
        error: err instanceof Error ? err.message : 'On-device translation failed',
      });
    }
  }
});

