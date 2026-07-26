import { createTheme } from '@mui/material/styles';

// PaperHands theme - igazitva a hivatalos honlap (kozak26hu.github.io/Webpage) stilusahoz:
// sotet gray-900 hatter, kek metallic gradient, "glow" fenyeffektus a szoveg korul.
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#111827',   // tailwind gray-900, mint a honlapon
      paper: '#1f2937',     // tailwind gray-800, kartya-hatter
    },
    primary: {
      main: '#60a5fa',      // tailwind blue-400 - a honlap fo akcentus szine
      contrastText: '#0a1e3b',
    },
    secondary: {
      main: '#a855f7',      // lila akcentus, a roadmap szekciohoz hasonloan (purple-300/400)
      contrastText: '#ffffff',
    },
    success: {
      main: '#22c55e',      // zold, a "Trade on Uniswap" gombhoz hasonloan
    },
    warning: {
      main: '#f97316',      // narancs, a "Trade on Balancer" gombhoz hasonloan
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.7)',
    },
    divider: 'rgba(96, 165, 250, 0.2)',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h3: {
      fontWeight: 700,
      textShadow: '0 0 15px rgba(59,130,246,0.8), 0 0 25px rgba(59,130,246,0.4)',
    },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(145deg, rgba(17,24,39,0.85), rgba(31,41,55,0.85))',
          border: '1px solid rgba(96,165,250,0.15)',
          boxShadow: 'inset 0 0 20px rgba(59,130,246,0.15), 0 4px 20px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'scale(1.03)',
          },
        },
        containedPrimary: {
          boxShadow: '0 0 12px rgba(96,165,250,0.5)',
          '&:hover': { boxShadow: '0 0 18px rgba(96,165,250,0.7)' },
        },
        outlined: {
          borderColor: 'rgba(96,165,250,0.5)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(96,165,250,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(96,165,250,0.6)' },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#60a5fa',
          boxShadow: '0 0 8px rgba(96,165,250,0.8)',
        },
      },
    },
  },
});

export default theme;
