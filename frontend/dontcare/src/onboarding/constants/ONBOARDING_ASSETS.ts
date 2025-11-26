export type OnboardingAssets = {
  readonly BG: {
    readonly SHAPE: string;
    readonly ARCH: string;
    readonly DECO1: string;
    readonly DECO2: string;
    readonly DECO3: string;
    readonly DECO4: string;
  };
  readonly LOGO: string;
};

export const ONBOARDING_ASSETS = {
  BG: {
    SHAPE:
      'https://cdn.prod.website-files.com/65893ddcf1b468de2a8ef5eb/6664ad467cefa2d9c91350f0_Shape.svg',
    ARCH: 'https://cdn.prod.website-files.com/65893ddcf1b468de2a8ef5eb/66b66cab184848e23debc4aa_111.svg',
    DECO1:
      'https://cdn.prod.website-files.com/65893ddcf1b468de2a8ef5eb/65893dddf1b468de2a8ef767_Group%201184.svg',
    DECO2:
      'https://cdn.prod.website-files.com/65893ddcf1b468de2a8ef5eb/66b66cab184848e23debc4da_Group%201171274470.avif',
    DECO3:
      'https://cdn.prod.website-files.com/65893ddcf1b468de2a8ef5eb/66b66cab184848e23debc4d4_Vector.avif',
    DECO4: 'https://cdn.prod.website-files.com/65893dddf1b468de2a8ef769_Group%201190.svg',
  },
  LOGO: 'https://cdn.prod.website-files.com/65893ddcf1b468de2a8ef5eb/66419089b26190442f82946e_company-logo.svg',
} as const satisfies OnboardingAssets;
