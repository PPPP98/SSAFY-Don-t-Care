import html2pdf from 'html2pdf.js';
import type { PDFExportOptions, PDFExportResult } from '@/main/types/htmlCodeBlock.types';

/**
 * html2pdf.js 기반 간소화된 PDF 생성
 * iframe 제거, 직접 DOM 렌더링으로 스타일 완벽 보존
 */
export async function exportToPDF(
  htmlContent: string,
  options: PDFExportOptions = {},
): Promise<PDFExportResult> {
  try {
    // 기본 옵션 설정
    const {
      filename = `ai-report-${Date.now()}.pdf`,
      margin = 1,
      image = { type: 'jpeg', quality: 0.98 },
      html2canvas = { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF = { unit: 'in', format: 'letter', orientation: 'portrait' },
      enableLinks = true,
      pagebreak = { mode: ['css', 'legacy'] },

      // 레거시 옵션 호환성
      scale,
      quality,
    } = options;

    // 레거시 옵션 변환 및 타입 안전성 보장
    const finalOptions = {
      margin,
      filename,
      image: {
        type: image.type || 'jpeg',
        quality: quality !== undefined ? quality : image.quality || 0.98,
      },
      html2canvas: {
        scale: scale !== undefined ? scale : html2canvas.scale || 2,
        useCORS: html2canvas.useCORS !== undefined ? html2canvas.useCORS : true,
        backgroundColor: html2canvas.backgroundColor || '#ffffff',
        allowTaint: html2canvas.allowTaint || false,
      },
      jsPDF,
      pagebreak,
      enableLinks,
    };

    // 완전한 HTML 문서인지 확인
    const isCompleteDocument =
      htmlContent.includes('<!DOCTYPE') ||
      htmlContent.includes('<html') ||
      htmlContent.includes('<HTML');

    if (isCompleteDocument) {
      // 완전한 HTML 문서의 경우 그대로 html2pdf에 전달
      try {
        await html2pdf().set(finalOptions).from(htmlContent).save();
        return {
          success: true,
          filename: filename,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'PDF 생성에 실패했습니다.',
        };
      }
    }

    // HTML 프래그먼트인 경우 임시 컨테이너 사용
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';

    // HTML 프래그먼트를 직접 삽입
    container.innerHTML = htmlContent;

    document.body.appendChild(container);

    try {
      // html2pdf.js를 사용한 PDF 생성
      await html2pdf().set(finalOptions).from(container).save();
      return {
        success: true,
        filename: filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 생성에 실패했습니다.',
      };
    } finally {
      // 임시 컨테이너 정리
      document.body.removeChild(container);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF 생성에 실패했습니다.',
    };
  }
}

/**
 * PDF 내보내기 진행 상황을 추적하는 유틸리티
 */
export class PDFExportTracker {
  private listeners: Set<(progress: number, stage?: string) => void> = new Set();

  addListener(callback: (progress: number, stage?: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  updateProgress(progress: number, stage?: string): void {
    this.listeners.forEach((callback) => {
      try {
        callback(progress, stage);
      } catch {
        // 콜백 에러 시 무시
      }
    });
  }
}

/**
 * 진행 상황 추적 기능이 포함된 PDF 내보내기
 */
export async function exportToPDFAdvanced(
  htmlContent: string,
  options: PDFExportOptions = {},
  tracker?: PDFExportTracker,
): Promise<PDFExportResult> {
  const updateProgress = (progress: number, stage?: string) => {
    tracker?.updateProgress(progress, stage);
  };

  try {
    updateProgress(10, '콘텐츠 준비 중...');

    // 기본 옵션 설정
    const finalOptions = {
      margin: 1,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const },
      ...options,
    };

    updateProgress(25, '렌더링 준비 중...');

    const result = await exportToPDF(htmlContent, finalOptions);

    if (result.success) {
      updateProgress(100, '완료!');
    } else {
      updateProgress(0, '실패');
    }

    return result;
  } catch (error) {
    updateProgress(0, '오류 발생');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF 생성 중 오류가 발생했습니다.',
    };
  }
}

/**
 * PDF 내보내기가 지원되는 환경인지 확인합니다.
 */
export function isPDFExportSupported(): boolean {
  try {
    // Canvas 지원 확인
    const canvas = document.createElement('canvas');
    const canvasSupported = !!(canvas.getContext && canvas.getContext('2d'));

    // Blob 지원 확인
    const blobSupported = typeof Blob !== 'undefined';

    // 파일 다운로드 지원 확인
    const downloadSupported = 'download' in document.createElement('a');

    // html2pdf.js 모듈 확인
    const html2pdfSupported = typeof html2pdf !== 'undefined';

    return canvasSupported && blobSupported && downloadSupported && html2pdfSupported;
  } catch {
    return false;
  }
}

/**
 * HTML 요소에서 직접 PDF 생성 (컴포넌트 내부 사용)
 */
export async function exportElementToPDF(
  element: HTMLElement,
  options: PDFExportOptions = {},
): Promise<PDFExportResult> {
  try {
    const {
      filename = `ai-content-${Date.now()}.pdf`,
      margin = 1,
      image = { type: 'jpeg', quality: 0.98 },
      html2canvas = { scale: 2, useCORS: true },
      jsPDF = { unit: 'in', format: 'letter', orientation: 'portrait' },
      enableLinks = true,
    } = options;

    const finalOptions = {
      margin,
      filename,
      image: {
        type: image.type || 'jpeg',
        quality: image.quality || 0.98,
      },
      html2canvas: {
        scale: html2canvas.scale || 2,
        useCORS: html2canvas.useCORS !== undefined ? html2canvas.useCORS : true,
        allowTaint: html2canvas.allowTaint || false,
        backgroundColor: html2canvas.backgroundColor || '#ffffff',
      },
      jsPDF,
      enableLinks,
    };

    await html2pdf().set(finalOptions).from(element).save();

    return {
      success: true,
      filename: filename,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF 생성에 실패했습니다.',
    };
  }
}
