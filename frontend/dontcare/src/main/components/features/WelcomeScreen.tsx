import { MarketWidget } from '@/main/components/features/MarketWidget';
import { NewsSection } from '@/main/components/features/NewsSection';

export function WelcomeScreen() {
  return (
    <div className="flex min-h-full animate-fade-in-up flex-col items-center justify-start overflow-y-auto py-6 text-center md:py-8 lg:py-10">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-accent-gradient text-2xl font-black shadow-lg shadow-accent-primary/20 md:mb-6 md:h-20 md:w-20 md:text-3xl lg:text-4xl">
        DC
      </div>
      <h1 className="mb-2 bg-accent-gradient bg-clip-text text-xl font-bold text-transparent md:mb-3 md:text-2xl lg:text-3xl xl:text-4xl">
        Multi-Agent Investment Platform
      </h1>

      {/* 시장 위젯 */}
      <MarketWidget />

      {/* 뉴스 헤드라인 섹션 - 항상 렌더링하여 레이아웃 안정화 */}
      <NewsSection />
    </div>
  );
}
