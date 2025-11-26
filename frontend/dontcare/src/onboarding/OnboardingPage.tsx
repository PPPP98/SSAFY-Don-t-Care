import { useAuthStore } from '@/auth/stores/authStore';
import { Background } from '@/onboarding/components/Background';
import { Hero } from '@/onboarding/components/Hero';
import { Footer } from '@/onboarding/components/Footer';
import { ServiceIntro } from '@/onboarding/components/ServiceIntro';
import { UsageGuide } from '@/onboarding/components/UsageGuide';
import '@/onboarding/styles/onboarding.css';
import { Navigate } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/pagination';
import { HashNavigation, Mousewheel, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

export function OnboardingPage() {
  const { isAuthenticated, user } = useAuthStore();

  // 인증된 사용자는 홈페이지로 리다이렉트
  if (isAuthenticated && user) {
    return <Navigate to="/main" replace />;
  }
  return (
    <main className="onboarding relative min-h-screen bg-black text-white">
      <div className="relative isolate">
        <Background />

        {/* Vertical fullpage swiper */}
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel={{ forceToAxis: true, releaseOnEdges: false }}
          allowTouchMove={false}
          speed={700}
          pagination={{ clickable: true }}
          hashNavigation={{ watchState: true }}
          modules={[Mousewheel, Pagination, HashNavigation]}
          className="relative z-10 h-dvh"
          preventClicks={false}
          preventClicksPropagation={false}
        >
          <SwiperSlide data-hash="hero">
            <section id="hero" className="flex min-h-dvh items-center justify-center">
              <Hero />
            </section>
          </SwiperSlide>
          <SwiperSlide data-hash="service">
            <section id="service" className="flex min-h-dvh items-center justify-center">
              <ServiceIntro />
            </section>
          </SwiperSlide>
          <SwiperSlide data-hash="usage">
            <section id="usage" className="flex min-h-dvh items-center justify-center">
              <UsageGuide />
            </section>
          </SwiperSlide>
          <SwiperSlide data-hash="legal">
            <section id="legal" className="flex min-h-dvh items-center justify-center">
              <Footer />
            </section>
          </SwiperSlide>
        </Swiper>
      </div>
    </main>
  );
}
