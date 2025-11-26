import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

function NotFoundPage() {
  return (
    <main className="relative isolate flex min-h-[calc(100dvh-0px)] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Subtle brand-style backgrounds (same utilities as onboarding) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 animate-gridpan bg-grid opacity-[.08]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-24 -bottom-48 -top-32 -z-10 bg-aurora opacity-[.25] blur-3xl"
      />

      <div className="mx-auto w-full max-w-2xl">
        {/* Big 404 in brand gradient */}
        <div className="gradient-text text-glow mb-2 text-[clamp(64px,12vw,160px)] font-black leading-none tracking-tight">
          404
        </div>

        {/* Title a bit smaller for hierarchy */}
        <h1 className="text-[clamp(18px,4vw,28px)] font-semibold tracking-tight text-foreground">
          페이지를 찾을 수 없어요
        </h1>

        {/* Description with good contrast */}
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          요청하신 페이지가 이동되었거나 삭제되었을 수 있어요.
          <br />
          입력하신 주소가 정확한지 다시 확인해 주세요.
        </p>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center">
          <Button asChild className="h-11 rounded-full px-6 sm:h-12 sm:px-8">
            <Link to="/" aria-label="홈으로 이동">
              홈으로 이동
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          문제가 지속된다면 잠시 후 다시 시도해 주세요.
        </p>
      </div>
    </main>
  );
}

export { NotFoundPage };
