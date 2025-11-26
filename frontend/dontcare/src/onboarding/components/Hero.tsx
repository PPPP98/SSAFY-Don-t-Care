import { Link } from 'react-router-dom';
import { useSwiper } from 'swiper/react';
import { ONBOARDING_TEXT } from '@/onboarding/constants/ONBOARDING_TEXT';
import { Button } from '@/shared/components/ui/button';

export function Hero() {
  const swiper = useSwiper();

  const goService = () => {
    try {
      swiper?.slideTo?.(1, 700);
    } catch {
      window.location.hash = '#service';
    }
  };

  return (
    <section aria-label={ONBOARDING_TEXT.LABEL} className="relative z-10">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="overflow-hidden">
          <h1 className="font-head gradient-text text-soft-glow animate-fadeup text-[clamp(40px,9vw,132px)] font-extrabold leading-[0.95] tracking-tight">
            Don&apos;t Care 돈케어
            <span className="relative mx-auto block h-[2px] w-1/3 overflow-hidden">
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 animate-shine bg-white/60 blur-sm"
              />
            </span>
          </h1>
        </div>

        <p className="gradient-text text-glow mt-5 animate-fadeup text-lg text-white/90 sm:text-2xl md:text-3xl">
          당신을 위한 주식 투자 비서
        </p>
        <p className="mt-2 max-w-2xl animate-fadeup text-sm text-white/70 sm:text-base">
          복잡한 투자 분석은 AI 비서에게 맡기고, 당신은 현명한 투자만 하세요.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Button
            asChild
            className="btn-cta-primary h-12 rounded-full px-8 text-base hover:brightness-110 focus-visible:ring-2 active:translate-y-0 active:scale-[0.99] sm:h-14 sm:px-10 sm:text-lg"
          >
            <Link to="/login" aria-label="시작하기">
              대화하기
            </Link>
          </Button>
          <Button
            onClick={goService}
            className="btn-cta h-12 rounded-full border-white/20 bg-transparent px-6 text-base text-white/90 hover:bg-white/10 sm:h-14 sm:px-8 sm:text-lg"
            aria-label="자세히 보기"
          >
            서비스 소개 보기
          </Button>
        </div>
      </div>
    </section>
  );
}
