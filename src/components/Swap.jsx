import { useState } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Card, CardContent, Typography, CircularProgress, Grid } from '@mui/material';

const ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';  // Uniswap V2 Router (mainnet)
const TOKEN_ADDRESS = '0x11157da1fc6dcfd58b50ed79082183b2c6176245';  // PHANDS
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) external payable returns (uint[] memory amounts)"
];

function Swap({ signer }) {
  const [quote, setQuote] = useState(0);
  const [amountIn, setAmountIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getQuote = async () => {
    if (!amountIn || !signer) return;
    try {
      const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
      const path = [WETH_ADDRESS, TOKEN_ADDRESS];  // ETH → PHANDS
      const amounts = await router.getAmountsOut(ethers.parseEther(amountIn), path);
      setQuote(ethers.formatEther(amounts[1]));  // Output amount
    } catch (err) {
      setError('Quote failed: ' + err.message + '. Check liquidity in pool.');
    }
  };

  const executeSwap = async () => {
    if (!quote || loading) return;
    setLoading(true);
    setError('');
    try {
      const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;  // 20 min
      const path = [WETH_ADDRESS, TOKEN_ADDRESS];
      const amountOutMin = (ethers.parseEther(quote) * 99n) / 100n;  // 1% slippage
      const tx = await router.swapExactETHForTokens(
        amountOutMin,
        path,
        await signer.getAddress(),
        deadline,
        { value: ethers.parseEther(amountIn) }
      );
      await tx.wait();
      alert('Swapped ' + amountIn + ' ETH for ~' + quote + ' PHANDS!');
    } catch (err) {
      setError('Swap failed: ' + err.message + '. Low liquidity?');
    }
    setLoading(false);
  };

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4, p: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Swap ETH for PHANDS (via Uniswap V2)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="ETH Amount"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              type="number"
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              onClick={getQuote}
              disabled={loading}
              sx={{ mt: 1, mr: 1 }}
            >
              Get Quote
            </Button>
            <Typography>Expected PHANDS: {quote}</Typography>
            <Button
              variant="contained"
              onClick={executeSwap}
              disabled={loading || !quote}
              sx={{ mt: 2 }}
            >
              Swap
            </Button>
            {loading && <CircularProgress sx={{ mt: 2 }} />}
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default Swap;