import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * 코드 스플리팅된 UI/데이터 청크(`assets`)와 대용량 온디바이스 AI 런타임(`aiRuntimeAssets`)을 분리 기록하여:
 * 1) 첫 앱 설치는 가볍고 빠르게 유지하면서도 모든 탭/모달이 100% 오프라인 동작하고,
 * 2) 사용자가 온디바이스 AI 다운로드 시 워커 및 WASM 런타임은 영구 전용 캐시에 안전히 보관됩니다.
 */
function offlineAssetManifestPlugin(): Plugin {
  return {
    name: 'tabitalk-offline-asset-manifest',
    generateBundle(_options, bundle) {
      const allKeys = Object.keys(bundle);
      const isAiRuntime = (name: string) =>
        /onDeviceNmtWorker/i.test(name) || /\.wasm$/i.test(name);

      const assets = allKeys
        .filter(
          (fileName) =>
            /\.(js|css|svg|png|webp|woff2?)$/i.test(fileName) && !isAiRuntime(fileName)
        )
        .map((fileName) => `./${fileName}`);

      const aiRuntimeAssets = allKeys
        .filter((fileName) => isAiRuntime(fileName))
        .map((fileName) => `./${fileName}`);

      this.emitFile({
        type: 'asset',
        fileName: 'offline-assets.json',
        source: JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            assets,
            aiRuntimeAssets,
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), offlineAssetManifestPlugin()],
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('geminiPrebuiltCorpus')) {
            return 'data-gemini-corpus';
          }
          if (id.includes('offlineTranslatorData')) {
            return 'data-offline-sos';
          }
          if (id.includes('src/data/scenarios') || id.includes('src\\data\\scenarios')) {
            return 'data-scenarios';
          }
        },
      },
    },
  },
});
