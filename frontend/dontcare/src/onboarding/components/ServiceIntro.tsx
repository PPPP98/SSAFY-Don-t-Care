// ServiceIntro.tsx
import { useState, useCallback } from 'react';

type Feature = {
  id: 'news' | 'finance' | 'tech' | 'backtest';
  title: string;
  shortDesc: string;
  longDesc: string;
  img: string;
  imgAlt: string;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    id: 'news',
    title: '뉴스 비서',
    shortDesc: '의도를 파악해 관련 뉴스를 실시간 수집·요약합니다.',
    longDesc:
      '사용자 질문 의도(종목/섹터/이슈)를 추출해 신뢰 가능한 소스에서 뉴스를 실시간 수집·랭킹하고, 핵심 포인트와 출처 링크를 함께 제공합니다. 중복·루머·낚시성 기사를 필터링하며, 같은 이슈의 흐름(전후 맥락)까지 요약합니다.',
    img: '/agents/NewsAnalyst.png',
    imgAlt: '신문을 들고 있는 귀여운 3D 뉴스 비서 캐릭터',
  },
  {
    id: 'finance',
    title: '재무 비서',
    shortDesc: '재무제표·밸류에이션을 구조화해 지표를 비교합니다.',
    longDesc:
      '손익계산서/대차대조표/현금흐름표를 표준 스키마로 정규화하고, 성장성·수익성·안정성 지표를 동종업계/시장과 비교합니다. PER/EV/EBITDA/FCF 등 밸류에이션 멀티플과 컨센서스 대비 괴리를 함께 제시합니다.',
    img: '/agents/FinanceAssistant.png',
    imgAlt: '계산기를 든 귀여운 3D 재무 비서 캐릭터',
  },
  {
    id: 'tech',
    title: '기술 비서',
    shortDesc: '추세·변동성·거래대금 신호로 리스크/기회를 포착합니다.',
    longDesc:
      '가격·거래대금·파생 신호를 결합해 추세 강도, 변동성 레짐, 수급 전환을 평가합니다. 과매수/과매도 구간, 지지/저항 근처 반응, 이벤트 구간 변동성 확대를 탐지하고 경보 레벨을 산출합니다.',
    img: '/agents/ChartAssistant.png',
    imgAlt: '차트를 보는 귀여운 3D 기술 비서 캐릭터',
  },
  {
    id: 'backtest',
    title: '백테스트 비서',
    shortDesc: '전략을 시뮬레이션해 성과와 한계를 검증합니다.',
    longDesc:
      '룰 기반/지표 조합/리밸런싱 주기를 설정해 수익률, MDD, 샤프지수, 드로우다운 구간을 검증합니다. 과최적화 방지(워크포워드/롤링 윈도), 거래비용/슬리피지 반영, 리스크 파리티/익절·손절 규칙 테스트를 지원합니다.',
    img: '/agents/BacktestingAssistant.png',
    imgAlt: '시뮬레이션 레버를 잡고 있는 귀여운 3D 백테스트 비서 캐릭터',
  },
];

export function ServiceIntro() {
  const [openId, setOpenId] = useState<Feature['id'] | null>(null);
  const active = FEATURES.find((f) => f.id === openId) ?? null;

  const open = useCallback((id: Feature['id']) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);

  return (
    <section className="relative z-10">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 sm:py-12 md:min-h-[100dvh]">
        <div className="grid w-full items-center gap-8 sm:gap-12 lg:grid-cols-2">
          {/* Left: Big statement */}
          <div>
            <span className="font-head text-xm text-white/120 inline-flex items-center rounded-full border border-white/15 px-3 py-1">
              에이전트 소개
            </span>
            <h2 className="text-glow gradient-text mt-4 text-[clamp(24px,4vw,42px)] font-semibold leading-tight tracking-tight">
              투자 질문의 의도를 파악하고, 전문 비서로 라우팅합니다.
            </h2>
            <p className="mb-16 mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
              돈케어는 뉴스·재무·기술·백테스트 4개의 에이전트가 협업해
              <span className="whitespace-nowrap"> 실시간 수집 → 분석/검증 → 요약/시뮬레이션</span>
              을 한 번에 제공합니다. ‘감’이 아닌, 근거 있는 투자 결정을 돕습니다.
            </p>
          </div>

          {/* Right: Feature cards */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {FEATURES.map((f) => (
              <Card key={f.id} feature={f} onOpen={() => open(f.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal with big character + details */}
      {active && (
        <Modal onClose={close} title={active.title}>
          <div className="grid gap-4 sm:grid-cols-[1fr,1.2fr]">
            <div className="overflow-hidden rounded-xl bg-white/5">
              <img
                src={active.img}
                alt={active.imgAlt}
                className="h-full w-full object-cover object-center"
                loading="eager"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-white">{active.title}</h4>
              <p className="text-sm leading-relaxed text-white/80">{active.longDesc}</p>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/** 카드 전체 클릭 + 호버 인터랙션 */
function Card({ feature, onOpen }: { feature: Feature; onOpen: () => void }) {
  const { title, shortDesc, img, imgAlt } = feature;

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`${title} 자세히 보기`}
      className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft-2xl backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:p-6 lg:p-7"
    >
      {/* 캐릭터 썸네일 */}
      <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-white/5">
        <img
          src={img}
          alt={imgAlt}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      {/* 텍스트 */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <p className="text-sm text-white/75 sm:text-base">{shortDesc}</p>
      </div>
    </div>
  );
}

/** 접근성 고려한 경량 모달 */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/15 bg-zinc-900/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="agent-modal-title" className="text-base font-semibold text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
