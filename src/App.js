import { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import theme from './theme';
import WalletConnect from './components/WalletConnect';
import Staking from './components/Staking';
import Swap from './components/Swap';
import AddLiquidity from './components/AddLiquidity';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ mt: 2 }}>{children}</Box> : null;
}

function App() {
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [tab, setTab] = useState(0);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        {/* Header - a honlap kek metallic gradientjenek megfeleloen */}
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0a1e3b, #1e40af, #60a5fa)',
            backgroundSize: '200% 200%',
            animation: 'metallicShine 6s ease-in-out infinite',
            '@keyframes metallicShine': {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' },
            },
          }}
        >
          <Typography variant="h3" sx={{ color: '#fff' }}>
            PaperHands
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.85, color: '#fff' }}>
            The Weak Hands Revolution on Ethereum &mdash; Trade / Stake / Liquidity, egy helyen
          </Typography>
        </Box>

        <Container maxWidth="md" sx={{ pt: 4, pb: 8 }}>
          <WalletConnect
            onConnect={(provider, signer) => {
              setProvider(provider);
              setSigner(signer);
            }}
          />

          {signer && provider && (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  textColor="primary"
                  indicatorColor="primary"
                >
                  <Tab label="Swap" />
                  <Tab label="Stake" />
                  <Tab label="Liquidity hozzaadasa" />
                </Tabs>
              </Box>

              <TabPanel value={tab} index={0}>
                <Swap signer={signer} />
              </TabPanel>

              <TabPanel value={tab} index={1}>
                <Staking signer={signer} provider={provider} />
              </TabPanel>

              <TabPanel value={tab} index={2}>
                <AddLiquidity signer={signer} />
              </TabPanel>
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
