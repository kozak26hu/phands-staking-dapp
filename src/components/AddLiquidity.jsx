import { useState } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Card, CardContent, Typography, CircularProgress, Grid, Alert } from '@mui/material';

const TOKEN_ADDRESS_RAW = '0x11157da1fc6dcfd58b50ed79082183b2c6176245'; // PHANDS
const ROUTER_ADDRESS_RAW = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Uniswap V2 Router02 (mainnet)

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const ROUTER_ABI = [
  "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)"
];

// Fixed slippage tolerance - min amounts are calculated against this
const SLIPPAGE_BPS = 300n; // 3%

function AddLiquidity({ signer }) {
  const [phandAmount, setPhandAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddLiquidity = async () => {
    setError('');
    setSuccess('');

    if (!phandAmount || !ethAmount || Number(phandAmount) <= 0 || Number(ethAmount) <= 0) {
      setError('Enter valid PHANDS and ETH amounts');
      return;
    }

    setLoading(true);
    try {
      const addr = await signer.getAddress();
      const token = new ethers.Contract(TOKEN_ADDRESS_RAW, TOKEN_ABI, signer);
      const router = new ethers.Contract(ROUTER_ADDRESS_RAW, ROUTER_ABI, signer);

      const phandWei = ethers.parseEther(phandAmount);
      const ethWei = ethers.parseEther(ethAmount);

      // 1. Approve if needed
      const currentAllowance = await token.allowance(addr, ROUTER_ADDRESS_RAW);
      if (currentAllowance < phandWei) {
        const approveTx = await token.approve(ROUTER_ADDRESS_RAW, ethers.MaxUint256);
        await approveTx.wait();
      }

      // 2. Calculate min amounts (slippage protection)
      const phandMin = (phandWei * (10000n - SLIPPAGE_BPS)) / 10000n;
      const ethMin = (ethWei * (10000n - SLIPPAGE_BPS)) / 10000n;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // 3. Call addLiquidityETH
      const tx = await router.addLiquidityETH(
        TOKEN_ADDRESS_RAW,
        phandWei,
        phandMin,
        ethMin,
        addr,
        deadline,
        { value: ethWei, gasLimit: 400000 }
      );
      const receipt = await tx.wait();

      setSuccess(`Liquidity added! Tx: ${receipt.hash}`);
      setPhandAmount('');
      setEthAmount('');
    } catch (err) {
      setError('Failed to add liquidity: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4, p: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Add Liquidity (PHANDS / WETH)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This adds PHANDS and ETH directly to the Uniswap V2 pool. In return you receive LP tokens,
          which you can then stake on the Stake tab to earn rewards.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="PHANDS amount"
              value={phandAmount}
              onChange={(e) => setPhandAmount(e.target.value)}
              type="number"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="ETH amount"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              type="number"
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAddLiquidity}
              disabled={loading}
              fullWidth
            >
              Add Liquidity
            </Button>
          </Grid>
          {loading && (
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Grid>
          )}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success">{success}</Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Note: enter amounts close to the current PHANDS/WETH ratio, otherwise Uniswap will
              refund the excess and it will remain unused in your wallet. The transaction uses
              roughly 3% slippage protection.
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default AddLiquidity;
