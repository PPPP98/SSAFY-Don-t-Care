import { ONBOARDING_ASSETS } from '@/onboarding/constants/ONBOARDING_ASSETS';

export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* 1) Gradient mesh base */}
      <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_6%,rgba(124,58,237,0.18),transparent_60%),radial-gradient(1000px_600px_at_88%_10%,rgba(34,211,238,0.08),transparent_48%),radial-gradient(800px_620px_at_50%_90%,rgba(59,130,246,0.12),transparent_55%),linear-gradient(180deg,#05060f_0%,#0b0f2a_45%,#06080f_100%)]" />

      {/* 2) Animated aurora sweep */}
      <div className="bg-aurora/35 absolute inset-0 bg-[length:200%_200%] mix-blend-screen motion-safe:animate-aurora motion-reduce:animate-none" />

      {/* 3) Subtle grid overlay with center fade */}
      <div className="mask-fade absolute inset-[-1px] bg-grid opacity-[0.09] mix-blend-overlay [background-size:200%_100%] motion-safe:animate-gridpan" />

      {/* 4) Grain for texture */}
      <div className="bg-noise absolute inset-0 opacity-[.035] mix-blend-soft-light" />

      {/* 5) Vignette to focus center */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_55%_at_50%_30%,transparent,rgba(0,0,0,0.55))]" />

      {/* 6) Soft color glows */}
      <div className="absolute -left-24 -top-24 h-[460px] w-[460px] rounded-full bg-[#7c3aed]/30 blur-[120px]" />
      <div className="bg-[#22d3ee]/12 absolute -right-16 -top-24 h-[360px] w-[360px] rounded-full blur-[110px]" />
      <div className="absolute bottom-[-10%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#3b82f6]/20 blur-[140px]" />

      {/* 7) Concentric arch and floating accents (kept, now pop over new base) */}
      <img
        src={ONBOARDING_ASSETS.BG.ARCH}
        alt=""
        className="pointer-events-none absolute left-1/2 top-[12%] h-[420px] -translate-x-1/2 transform-gpu opacity-80 motion-safe:animate-float-slow motion-reduce:transform-none sm:h-[500px]"
      />
      <img
        src={ONBOARDING_ASSETS.BG.SHAPE}
        alt=""
        className="pointer-events-none absolute left-[10%] top-[10%] h-10 transform-gpu opacity-80 motion-safe:animate-float-mid motion-reduce:transform-none"
      />
      <img
        src={ONBOARDING_ASSETS.BG.DECO2}
        alt=""
        className="pointer-events-none absolute right-[8%] top-[18%] h-24 -rotate-[12deg] transform-gpu opacity-90 motion-safe:animate-float-fast motion-reduce:transform-none"
      />
      <img
        src={ONBOARDING_ASSETS.BG.DECO3}
        alt=""
        className="pointer-events-none absolute left-[8%] top-[38%] h-10 transform-gpu opacity-80 motion-safe:animate-float-mid motion-reduce:transform-none"
      />
      <img
        src={ONBOARDING_ASSETS.BG.DECO4}
        alt=""
        className="pointer-events-none absolute right-[18%] top-[42%] h-16 -rotate-6 transform-gpu opacity-80 motion-safe:animate-float-slow motion-reduce:transform-none"
      />
      <img
        src={ONBOARDING_ASSETS.BG.DECO1}
        alt=""
        className="pointer-events-none absolute left-[22%] top-[22%] h-20 -rotate-90 transform-gpu opacity-80 motion-safe:animate-float-slow motion-reduce:transform-none"
      />
    </div>
  );
}
