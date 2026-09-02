import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Button, TextField, Card, CardContent, Typography,
  CircularProgress, Grid, Box
} from '@mui/material';

const TOKEN_ADDRESS = '0x11157da1fc6dcfd58b50ed79082183b2c6176245'; // PHANDS

const TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
];

function Transfer({ signer }) {
  const [balance, setBalance] = useState(0n);
  const [symbol, setSymbol] = useState('PHANDS');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastTx, setLastTx] = useState('');

  const refreshBalance = async () => {
    if (!signer) return;
    try {
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const addr = await signer.getAddress();
      const [bal, sym] = await Promise.all([
        token.balanceOf(addr),
        token.symbol().catch(() => 'PHANDS'),
      ]);
      setBalance(bal);
      setSymbol(sym);
    } catch (err) {
      setError('Failed to load balance: ' + err.message);
    }
  };

  useEffect(() => {
    refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer]);

  const handleTransfer = async () => {
    setError('');
    setLastTx('');

    if (!to.trim() || !amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Enter a valid address and amount');
      return;
    }

    let target;
    try {
      target = ethers.getAddress(to.trim());
    } catch {
      setError('Invalid recipient address');
      return;
    }

    const parsed = ethers.parseEther(amount);
    if (parsed > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const tx = await token.transfer(target, parsed, { gasLimit: 100000 });
      setLastTx(tx.hash);
      await tx.wait();
      alert(`Sent ${amount} ${symbol} to ${target.slice(0, 6)}...${target.slice(-4)}`);
      setAmount('');
      setTo('');
      await refreshBalance();
    } catch (err) {
      setError('Transfer failed: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', p: 1 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
          Transfer {symbol}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Send PHANDS to any wallet. No approve needed.
        </Typography>

        <Box
          sx={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 3,
            p: 1.5,
            mb: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your balance
          </Typography>
          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#60a5fa' }}>
            {Number(ethers.formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {symbol}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Recipient address"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              fullWidth
              size="small"
              margin="dense"
              placeholder="0x..."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label={`Amount (${symbol})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              fullWidth
              size="small"
              margin="dense"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleTransfer}
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send'}
            </Button>
          </Grid>
          {loading && (
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Grid>
          )}
          {error && (
            <Grid item xs={12}>
              <Typography color="error" variant="body2">{error}</Typography>
            </Grid>
          )}
          {lastTx && (
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                Tx:{' '}
                <a
                  href={`https://etherscan.io/tx/${lastTx}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#60a5fa' }}
                >
                  {lastTx}
                </a>
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default Transfer;
