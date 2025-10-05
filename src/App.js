import { useState } from 'react';
  import { Container, Typography } from '@mui/material';
  import WalletConnect from './components/WalletConnect';
  import Staking from './components/Staking';
  import Swap from './components/Swap';

  function App() {
    const [signer, setSigner] = useState(null);
    const [provider, setProvider] = useState(null);

    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h3" align="center" gutterBottom>PaperHands Staking dApp</Typography>
        <WalletConnect
          onConnect={(provider, signer) => {
            setProvider(provider);
            setSigner(signer);
          }}
        />
        {signer && provider && (
          <>
            <Staking signer={signer} provider={provider} />
            <Swap signer={signer} />
          </>
        )}
      </Container>
    );
  }

  export default App;