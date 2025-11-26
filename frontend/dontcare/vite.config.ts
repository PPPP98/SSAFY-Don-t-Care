import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
  build: {
    // 롤업 최적화 설정
    rollupOptions: {
      output: {
        // 청크 분할 전략 - 캐싱 최적화를 위한 라이브러리별 분리
        manualChunks: {
          // React 관련 라이브러리들 (변경 빈도 낮음 - 장기간 캐싱)
          'react-vendor': ['react', 'react-dom'],

          // 라우팅 관련 (변경 빈도 낮음)
          'router-vendor': ['react-router-dom'],

          // 폼 관련 라이브러리들 (인증 페이지에서 공통 사용)
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // UI 컴포넌트 라이브러리 (변경 빈도 낮음)
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-icons',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],

          // 온보딩 전용 라이브러리 (Swiper - 큰 라이브러리이므로 분리)
          'swiper-vendor': ['swiper'],

          // 상태 관리 (전역적으로 사용)
          'state-vendor': ['zustand', 'jotai', '@tanstack/react-query'],

          // HTTP 클라이언트
          'http-vendor': ['axios'],

          // 마크다운 관련 (특정 페이지에서만 사용될 가능성)
          'markdown-vendor': ['react-markdown'],

          // 기타 유틸리티
          'util-vendor': ['lucide-react', 'react-resizable-panels']
        },

        // 캐시 무효화를 위한 해시 포함 파일명 설정
        chunkFileNames: (chunkInfo) => {
          // vendor 청크들은 별도 폴더로 구성하여 관리 용이성 향상
          if (chunkInfo.name?.endsWith('-vendor')) {
            return 'assets/vendors/[name]-[hash].js';
          }
          return 'assets/chunks/[name]-[hash].js';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },

    // 청크 크기 경고 임계값 조정 (vendor 청크는 클 수 있음)
    chunkSizeWarningLimit: 1000,

    // 프로덕션에서는 소스맵 비활성화로 파일 크기 최적화
    sourcemap: false,

    // CSS 코드 분할 활성화
    cssCodeSplit: true,

    // 압축 최적화
    minify: 'esbuild',

    // ES2020 타겟으로 최신 브라우저 최적화
    target: 'es2020',

    // 동적 import 폴리필 비활성화 (최신 브라우저만 지원)
    dynamicImportVarsOptions: {
      warnOnError: true
    }
  },

  // 개발 서버 최적화
  optimizeDeps: {
    // 미리 번들링할 의존성들 명시 (개발 시 빠른 로딩)
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'zustand',
      'jotai',
      '@tanstack/react-query',
      'axios'
    ],
    // 사전 번들링에서 제외할 항목들
    exclude: ['swiper']
  },

  server: {
    allowedHosts: ['j13e107.p.ssafy.io']
  }
});
