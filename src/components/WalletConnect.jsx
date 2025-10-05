import { useState } from 'react';
  import { ethers } from 'ethers';
  import { Button, Typography, Box } from '@mui/material';

  function WalletConnect({ onConnect }) {
    const [account, setAccount] = useState(null);
    const [error, setError] = useState('');

    const connect = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await provider.send("eth_requestAccounts", []);
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setAccount(addr);

          // Check mainnet
          const network = await provider.getNetwork();
          if (network.chainId !== 1n) {  // 1 = mainnet
            setError('Please switch to Ethereum Mainnet in MetaMask');
            return;
          }

          onConnect(provider, signer);  // Pass to parent
        } catch (err) {
          setError('Connection failed: ' + err.message);
        }
      } else {
        setError('Please install MetaMask!');
      }
    };

    return (
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        {!account ? (
          <Button variant="contained" color="primary" onClick={connect}>
            Connect MetaMask
          </Button>
        ) : (
          <Typography>Connected: {account.slice(0, 6)}...{account.slice(-4)}</Typography>
        )}
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
    );
  }

  export default WalletConnect;