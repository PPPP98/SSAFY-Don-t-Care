// Footer.tsx
type LinkItem = { label: string; href: string; external?: boolean };
type Section = { title: string; links: LinkItem[] };

export function Footer() {
  const year = new Date().getFullYear();

  const sections: Section[] = [
    {
      title: '제품',
      links: [
        { label: '핵심 기능', href: '/#features' },
        { label: '요금제', href: '/#pricing' },
        { label: '로드맵', href: '/#roadmap' },
      ],
    },
    {
      title: '에이전트',
      links: [
        { label: '뉴스 비서', href: '/agents/news' },
        { label: '재무 비서', href: '/agents/finance' },
        { label: '기술 비서', href: '/agents/tech' },
        { label: '백테스트 비서', href: '/agents/backtest' },
      ],
    },
    {
      title: '리소스',
      links: [
        { label: '가이드', href: '/docs' },
        { label: 'API', href: '/api' },
        { label: '시스템 상태', href: '/status' },
      ],
    },
    {
      title: '정책',
      links: [
        { label: '개인정보 처리방침', href: '/legal/privacy' },
        { label: '이용약관', href: '/legal/terms' },
        { label: '보안', href: '/legal/security' },
        { label: '쿠키 설정', href: '/legal/cookies' },
      ],
    },
  ];

  return (
    <footer className="relative z-10" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        사이트 푸터
      </h2>
      <div className="divider-line" />

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Top: brand + micro copy + CTA */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">Don’t Care</div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
              질문으로 시작하는 투자 비서. 4개 에이전트 협업으로 근거 기반 인사이트를 제공합니다.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/signup"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white/90"
            >
              무료로 시작하기
            </a>
            <a
              href="/#features"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              기능 보기
            </a>
          </div>
        </div>

        {/* Middle: sections (틀 유지, 내용은 점진적으로 채우기) */}
        <nav
          aria-label="푸터 내비게이션"
          className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4"
        >
          {sections.map((s) => (
            <div key={s.title}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
                {s.title}
              </h3>
              <ul className="space-y-2 text-sm">
                {s.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.external ? '_blank' : undefined}
                      rel={l.external ? 'noopener noreferrer' : undefined}
                      className="text-white/80 underline-offset-4 hover:text-white hover:underline"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Minimal trust strip (선택) */}
        <div className="mt-10 grid gap-3 text-[13px] text-white/55 md:grid-cols-2">
          <p>
            ※ 본 서비스는 정보 제공을 목적으로 하며 투자 권유가 아닙니다. 데이터 지연·오류가 발생할
            수 있으며 최종 투자 판단과 책임은 이용자에게 있습니다.
          </p>
          <p>※ 백테스트/시뮬레이션 결과는 과거 데이터에 기반하며 미래 수익을 보장하지 않습니다.</p>
        </div>

        {/* Bottom: copy + contact + socials */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center">
          <p>© {year} Don’t Care. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a className="hover:text-white" href="mailto:contact@dontcare.app" aria-label="이메일">
              contact@dontcare.app
            </a>
            <span className="text-white/20">/</span>
            <a
              className="hover:text-white"
              href="https://github.com/dontcare-app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              GitHub
            </a>
            <span className="text-white/20">/</span>
            <a
              className="hover:text-white"
              href="https://x.com/dontcare_app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
            >
              X
            </a>
            <span className="text-white/20">/</span>
            <a
              className="hover:text-white"
              href="https://discord.gg/dontcare"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
