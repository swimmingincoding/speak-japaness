import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * 코드 스플리팅된 모든 JS/CSS 청크 목록을 dist/offline-assets.json으로 생성하여
 * 앱 첫 설치 직후 비행기 모드로 전환해도 미방문 탭/모달이 100% 오프라인 동작하도록 지원합니다.
 */
function offlineAssetManifestPlugin(): Plugin {
  return {
    name: 'tabitalk-offline-asset-manifest',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((fileName) => /\.(js|css|svg|png|webp|woff2?)$/i.test(fileName))
        .map((fileName) => `./${fileName}`);

      this.emitFile({
        type: 'asset',
        fileName: 'offline-assets.json',
        source: JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            assets,
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
        },
      },
    },
  },
});
