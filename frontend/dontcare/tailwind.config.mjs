/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Dynamic viewport units 지원 (모바일 브라우저 호환)
      height: {
        dvh: '100dvh',
        svh: '100svh',
        lvh: '100lvh',
      },
      minHeight: {
        dvh: '100dvh',
        svh: '100svh',
        lvh: '100lvh',
      },
      maxHeight: {
        dvh: '100dvh',
        svh: '100svh',
        lvh: '100lvh',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // AI Platform specific colors
        'bg-primary': '#0a0b0d',
        'bg-secondary': '#141518',
        'bg-tertiary': '#1a1b1f',
        'bg-chat': '#1e1f24',
        'bg-user-message': '#7c3aed',
        'text-primary': '#ffffff',
        'text-secondary': '#9ca3af',
        'text-muted': '#6b7280',
        'accent-primary': '#7c3aed',
        'accent-secondary': '#a855f7',
        'border-color': '#2d2e33',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      //  ++++++++++++++++++++++++++++

      backgroundImage: {
        grid: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 120px), repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 120px)',
        aurora:
          'linear-gradient(120deg, rgba(124,58,237,.35), rgba(34,211,238,.35), rgba(16,185,129,.35))',
        'accent-gradient': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
      },
      boxShadow: {
        'soft-2xl': '0 10px 40px rgba(0,0,0,.25)',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translate3d(0,0,0) rotate(0)' },
          '50%': { transform: 'translate3d(4px,-6px,0) rotate(-6deg)' },
          '100%': { transform: 'translate3d(0,0,0) rotate(0)' },
        },
        gridpan: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '200% 0' } },
        aurora: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        fadeup: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // AI Platform specific animations
        borderFlow: {
          '0%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'gradient-text': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        // Chat loader specific animations
        'gentle-emerge': {
          '0%': {
            opacity: '0',
            transform: 'translateY(8px) scale(0.98)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'float-slow': 'float 9s ease-in-out infinite',
        'float-mid': 'float 6s ease-in-out infinite',
        'float-fast': 'float 4s ease-in-out infinite',
        aurora: 'aurora 30s ease-in-out infinite',
        gridpan: 'gridpan 18s linear infinite',
        shine: 'shine 1.8s cubic-bezier(.2,.7,.3,1) forwards',
        fadeup: 'fadeup .6s cubic-bezier(.2,.8,.2,1) both',
        // AI Platform specific animations
        'border-flow': 'borderFlow 2s linear infinite',
        typing: 'typing 1.4s infinite',
        'fade-in-up': 'fadeInUp 0.6s ease',
        'slide-up': 'slideUp 0.4s ease',
        pulse: 'pulse 1.5s ease-in-out infinite',
        blink: 'blink 1s infinite',
        'gradient-text': 'gradient-text 2.5s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        // Chat loader specific animations
        'gentle-emerge': 'gentle-emerge 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
