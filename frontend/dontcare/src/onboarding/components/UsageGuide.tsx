// UsageGuide.tsx
export function UsageGuide() {
  return (
    <section className="relative z-10">
      {/* 배경 라디얼 글로우 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            width: 780,
            height: 780,
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(147,197,253,0.35) 0%, rgba(147,197,253,0.05) 60%, transparent 70%)',
          }}
        />
      </div>

      <div className="mx-auto -mt-6 flex min-h-screen max-w-7xl items-center px-6 pb-24 pt-12 supports-[height:100dvh]:min-h-[100dvh] sm:-mt-10">
        <div className="w-full">
          {/* 헤더 */}
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-head text-glow gradient-text mt-3 text-[clamp(24px,3.5vw,44px)] font-semibold tracking-tight">
              이렇게 사용하세요
            </h2>
            <p className="mt-2 text-sm text-white/100 sm:text-base">
              질문 → 에이전트 협업 분석 → 실행 가능한 인사이트
            </p>
          </div>

          {/* 스텝 카드 */}
          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            <Step
              n={1}
              title="질문하기"
              desc="투자에 대한 궁금증을 질문하면 의도를 파악해 알맞은 AI 비서를 호출합니다."
            />
            <Step
              n={2}
              title="에이전트 분석"
              desc="뉴스·재무·기술·백테스트 비서가 협업해 실시간 정보와 분석 정보를 종합합니다."
            />
            <Step
              n={3}
              title="인사이트 받기"
              desc="핵심 요약·시뮬레이션 결과·제안 액션에 대한 답변과 리포트를 통해 투자 결정을 빠르게 내릴 수 있습니다."
            />
          </ol>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft-2xl backdrop-blur-md transition focus-within:ring-2 focus-within:ring-white/40 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg sm:p-7">
      {/* 그라데이션 링(아주 약하게) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(120% 120% at 10% -10%, rgba(180,180,255,0.15) 0%, transparent 40%)',
        }}
      />

      <div className="flex items-start gap-4">
        {/* 숫자 배지 + 펄스 */}
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm text-white/90">
          {n}
          <span
            aria-hidden
            className="absolute inset-0 -z-10 animate-[pulse_2.2s_ease-in-out_infinite] rounded-full opacity-30 group-hover:opacity-60 motion-reduce:animate-none"
            style={{
              boxShadow: '0 0 0 8px rgba(255,255,255,0.06)',
            }}
          />
        </span>

        <div className="space-y-1.5">
          <p className="text-lg font-medium text-white">{title}</p>
          <p className="text-sm text-white/75 sm:text-base">{desc}</p>
        </div>
      </div>

      {/* 하이라이트 섬광(미세한 쉰 효과) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rotate-45 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </li>
  );
}
