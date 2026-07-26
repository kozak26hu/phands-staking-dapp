import { createTheme } from '@mui/material/styles';

// PaperHands theme v2 - igazitva az uj, glassmorphism honlap-designhoz:
// sotet #060b18 hatter, kek->lila gradiens akcentus, Inter + JetBrains Mono tipografia,
// "glass card" panelek (finom hatter, blur, vekony gradiens szegely).
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#060b18',
      paper: 'rgba(255,255,255,0.03)',
    },
    primary: {
      main: '#60a5fa',
      contrastText: '#060b18',
    },
    secondary: {
      main: '#7c3aed',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4ade80',
    },
    warning: {
      main: '#fbbf24',
    },
    error: {
      main: '#f87171',
    },
    text: {
      primary: '#eef2f8',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    h3: {
      fontWeight: 900,
      letterSpacing: '-0.03em',
      backgroundImage: 'linear-gradient(135deg, #f0f4ff 0%, #60a5fa 40%, #a78bfa 70%, #60a5fa 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    h5: { fontWeight: 700, color: '#eef2f8' },
    h6: { fontWeight: 700, color: '#eef2f8' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        code, .mono { font-family: 'JetBrains Mono', monospace; }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          boxShadow: 'none',
          transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 60,
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          '&:hover': { transform: 'translateY(-2px)' },
        },
        containedPrimary: {
          backgroundImage: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
          '&:hover': { boxShadow: '0 8px 40px rgba(59,130,246,0.45)' },
        },
        outlined: {
          borderColor: 'rgba(96,165,250,0.3)',
          color: '#60a5fa',
          '&:hover': { borderColor: '#60a5fa', background: 'rgba(59,130,246,0.1)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
            '&:hover fieldset': { borderColor: 'rgba(96,165,250,0.4)' },
            '&.Mui-focused fieldset': { borderColor: '#60a5fa' },
          },
          '& .MuiInputLabel-root': { color: '#94a3b8' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: 'linear-gradient(90deg, #3b82f6, #7c3aed)',
          height: 2,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
