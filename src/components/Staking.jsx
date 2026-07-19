import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Card, CardContent, Typography, CircularProgress, Grid, Switch, FormControlLabel } from '@mui/material';

// Contract addresses (raw, validated at runtime)
const TOKEN_ADDRESS_RAW = '0x11157da1fc6dcfd58b50ed79082183b2c6176245';  // PHANDS
const LP_TOKEN_ADDRESS_RAW = '0x29b2b1450dfe8d856fA42250437B1e827435f82E';  // PHANDS/WETH Uniswap V2 pair (javitva)
const STAKING_ADDRESS_RAW = '0xea2b0eebb56020ff6eb9dba6277fb47be8773b92';  // Uj, javitott staking kontraktus

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];
const LP_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];
// Frissitett ABI az uj MyStaking.sol-hoz
const STAKING_ABI = [
  "function stakePHAND(uint256 amount)",
  "function unstakePHAND(uint256 amount)",
  "function stakeLP(uint256 amount)",
  "function unstakeLP(uint256 amount)",
  "function claimRewards()",
  "function toggleAutoClaim(bool isLp)",
  "function phandStakes(address) view returns (uint256 amount, uint256 startTime, uint256 lastClaimed, bool autoClaimEnabled)",
  "function lpStakes(address) view returns (uint256 amount, uint256 startTime, uint256 lastClaimed, bool autoClaimEnabled)",
  "function phandRewardBalance(address) view returns (uint256)",
  "function lpRewardBalance(address) view returns (uint256)",
  "function pendingRewards(address user) view returns (uint256 phandPending, uint256 lpPending)",
  "function getCurrentAPY() view returns (uint256 phandAPYBps, uint256 lpAPYBps)",
  "function totalStakedPHAND() view returns (uint256)",
  "function totalStakedLP() view returns (uint256)"
];

function Staking({ signer, provider }) {
  const [phandsBalance, setPhandsBalance] = useState(0n);
  const [lpBalance, setLpBalance] = useState(0n);
  const [stakedPhands, setStakedPhands] = useState(0n);
  const [stakedLp, setStakedLp] = useState(0n);
  const [phandRewards, setPhandRewards] = useState(0n);
  const [lpRewards, setLpRewards] = useState(0n);
  const [phandsAmount, setPhandsAmount] = useState('');
  const [lpAmount, setLpAmount] = useState('');
  const [phandsAllowance, setPhandsAllowance] = useState(0n);
  const [lpAllowance, setLpAllowance] = useState(0n);
  const [autoClaimPhand, setAutoClaimPhand] = useState(false);
  const [autoClaimLp, setAutoClaimLp] = useState(false);
  const [phandsLockEnd, setPhandsLockEnd] = useState(0);
  const [lpLockEnd, setLpLockEnd] = useState(0);
  const [tokenName, setTokenName] = useState('');
  const [lpName, setLpName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  const LOCK_PERIOD_SECONDS = 30 * 24 * 60 * 60;

  const refreshAll = async () => {
    if (!signer || !provider) return;
    try {
      const network = await provider.getNetwork();
      if (network.chainId !== 1n && network.chainId !== 31337n) {
        setError('Please switch to Ethereum Mainnet or Hardhat fork in MetaMask');
        return;
      }

      let TOKEN_ADDRESS, LP_TOKEN_ADDRESS, STAKING_ADDRESS;
      try {
        TOKEN_ADDRESS = ethers.getAddress(TOKEN_ADDRESS_RAW);
        LP_TOKEN_ADDRESS = ethers.getAddress(LP_TOKEN_ADDRESS_RAW);
        STAKING_ADDRESS = ethers.getAddress(STAKING_ADDRESS_RAW);
      } catch (err) {
        setError('Invalid contract address: ' + err.message);
        return;
      }

      const block = await provider.getBlock('latest');
      setCurrentTimestamp(Number(block.timestamp));

      const phands = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const lpToken = new ethers.Contract(LP_TOKEN_ADDRESS, LP_TOKEN_ABI, signer);
      const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
      const addr = await signer.getAddress();

      // PHANDS + stake adatok
      let pBal = 0n, pAllw = 0n, pName = 'PHANDS', pStake = { amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false };
      try {
        [pBal, pAllw, pName, pStake] = await Promise.all([
          phands.balanceOf(addr).catch(() => 0n),
          phands.allowance(addr, STAKING_ADDRESS).catch(() => 0n),
          phands.name().catch(() => 'PHANDS'),
          staking.phandStakes(addr).catch(() => ({ amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false }))
        ]);
      } catch (err) {
        setError('Failed to fetch PHANDS data: ' + err.message);
      }

      // LP + stake adatok
      let lpBal = 0n, lpAllw = 0n, lpNm = 'LP', lpStake = { amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false };
      try {
        [lpBal, lpAllw, lpNm, lpStake] = await Promise.all([
          lpToken.balanceOf(addr).catch(() => 0n),
          lpToken.allowance(addr, STAKING_ADDRESS).catch(() => 0n),
          lpToken.name().catch(() => 'LP'),
          staking.lpStakes(addr).catch(() => ({ amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false }))
        ]);
      } catch (err) {
        setError(prev => prev ? prev + '; LP data failed: ' + err.message : 'LP data failed: ' + err.message);
      }

      // Pending rewards - kulon PHAND es LP
      const [phandPending, lpPending] = await staking.pendingRewards(addr).catch(() => [0n, 0n]);

      setPhandsBalance(pBal);
      setLpBalance(lpBal);
      setPhandsAllowance(pAllw);
      setLpAllowance(lpAllw);
      setTokenName(pName);
      setLpName(lpNm);
      setStakedPhands(pStake.amount);
      setPhandsLockEnd(pStake.amount > 0n ? Number(pStake.startTime) + LOCK_PERIOD_SECONDS : 0);
      setStakedLp(lpStake.amount);
      setLpLockEnd(lpStake.amount > 0n ? Number(lpStake.startTime) + LOCK_PERIOD_SECONDS : 0);
      setAutoClaimPhand(pStake.autoClaimEnabled);
      setAutoClaimLp(lpStake.autoClaimEnabled);
      setPhandRewards(phandPending);
      setLpRewards(lpPending);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, provider]);

  const approveIfNeeded = async (contract, amount, tokenType) => {
    const allowance = tokenType === 'phands' ? phandsAllowance : lpAllowance;
    if (allowance < ethers.parseEther(amount || '0')) {
      setLoading(true);
      try {
        const tx = await contract.approve(STAKING_ADDRESS_RAW, ethers.MaxUint256);
        await tx.wait();
        if (tokenType === 'phands') setPhandsAllowance(ethers.MaxUint256);
        else setLpAllowance(ethers.MaxUint256);
        alert(`Approved ${tokenType === 'phands' ? 'PHANDS' : 'LP tokens'} for staking!`);
      } catch (err) {
        setError(`Approval failed for ${tokenType}: ` + err.message);
        setLoading(false);
        return false;
      }
      setLoading(false);
      return true;
    }
    return true;
  };

  const handleStake = async (isLp = false) => {
    const amount = isLp ? lpAmount : phandsAmount;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    const contract = isLp
      ? new ethers.Contract(LP_TOKEN_ADDRESS_RAW, LP_TOKEN_ABI, signer)
      : new ethers.Contract(TOKEN_ADDRESS_RAW, TOKEN_ABI, signer);
    if (!(await approveIfNeeded(contract, amount, isLp ? 'lp' : 'phands'))) return;
    setLoading(true);
    setError('');
    try {
      const staking = new ethers.Contract(STAKING_ADDRESS_RAW, STAKING_ABI, signer);
      const tx = isLp
        ? await staking.stakeLP(ethers.parseEther(amount), { gasLimit: 300000 })
        : await staking.stakePHAND(ethers.parseEther(amount), { gasLimit: 300000 });
      await tx.wait();
      alert(`Staked ${amount} ${isLp ? 'LP tokens' : 'PHANDS'}!`);
      await refreshAll();
    } catch (err) {
      setError(`Stake failed: ${err.message}. Check balance or gas.`);
    }
    setLoading(false);
  };

  // amount = '' vagy '0' eseten a teljes stake-et vonja ki (a kontraktus 0-t ertelmezi "mindent kivesz"-kent)
  const handleUnstake = async (isLp = false, amount = '') => {
    const lockEnd = isLp ? lpLockEnd : phandsLockEnd;
    const block = await provider.getBlock('latest');
    const currentTime = Number(block.timestamp);
    if (currentTime < lockEnd) {
      setError(`Stake locked until ${new Date(lockEnd * 1000).toLocaleString()}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const staking = new ethers.Contract(STAKING_ADDRESS_RAW, STAKING_ABI, signer);
      const parsedAmount = amount && Number(amount) > 0 ? ethers.parseEther(amount) : 0n;
      const tx = isLp
        ? await staking.unstakeLP(parsedAmount, { gasLimit: 300000 })
        : await staking.unstakePHAND(parsedAmount, { gasLimit: 300000 });
      await tx.wait();
      alert(`Unstaked ${isLp ? 'LP tokens' : 'PHANDS'} and claimed related rewards!`);
      await refreshAll();
    } catch (err) {
      setError(`Unstake failed: ${err.message}. Check lock period or gas.`);
    }
    setLoading(false);
  };

  const handleClaimRewards = async () => {
    setLoading(true);
    setError('');
    try {
      const staking = new ethers.Contract(STAKING_ADDRESS_RAW, STAKING_ABI, signer);
      const tx = await staking.claimRewards({ gasLimit: 200000 });
      await tx.wait();
      alert('Rewards claimed!');
      await refreshAll();
    } catch (err) {
      setError('Claim failed: ' + err.message);
    }
    setLoading(false);
  };

  // isLp: melyik auto-claim kapcsolot billentjuk (kulon PHAND es LP)
  const handleToggleAutoClaim = async (isLp) => {
    setLoading(true);
    setError('');
    try {
      const staking = new ethers.Contract(STAKING_ADDRESS_RAW, STAKING_ABI, signer);
      const tx = await staking.toggleAutoClaim(isLp, { gasLimit: 150000 });
      await tx.wait();
      if (isLp) setAutoClaimLp(prev => !prev);
      else setAutoClaimPhand(prev => !prev);
      alert(`Auto-claim ${isLp ? 'LP' : 'PHAND'} toggled!`);
    } catch (err) {
      setError('Toggle failed: ' + err.message);
    }
    setLoading(false);
  };

  const totalRewards = phandRewards + lpRewards;

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4, p: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Stake {tokenName || 'PHANDS'}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography>PHANDS Available: {ethers.formatEther(phandsBalance)} PHANDS</Typography>
            <Typography>PHANDS Staked: {ethers.formatEther(stakedPhands)} PHANDS</Typography>
            <Typography>LP Tokens Available: {ethers.formatEther(lpBalance)} {lpName || 'LP'}</Typography>
            <Typography>LP Tokens Staked: {ethers.formatEther(stakedLp)} {lpName || 'LP'}</Typography>
            <Typography>PHAND Pending Reward: {ethers.formatEther(phandRewards)} PHANDS</Typography>
            <Typography>LP Pending Reward: {ethers.formatEther(lpRewards)} PHANDS</Typography>
            <FormControlLabel
              control={<Switch checked={autoClaimPhand} onChange={() => handleToggleAutoClaim(false)} disabled={loading} />}
              label="Auto-Claim PHAND Rewards"
            />
            <FormControlLabel
              control={<Switch checked={autoClaimLp} onChange={() => handleToggleAutoClaim(true)} disabled={loading} />}
              label="Auto-Claim LP Rewards"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">Normal Staking</Typography>
            <TextField
              label="Amount (PHANDS)"
              value={phandsAmount}
              onChange={(e) => setPhandsAmount(e.target.value)}
              type="number"
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              onClick={() => handleStake(false)}
              disabled={loading}
              sx={{ mt: 1, mr: 1 }}
            >
              Stake PHANDS
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleUnstake(false, phandsAmount)}
              disabled={loading || currentTimestamp < phandsLockEnd || stakedPhands === 0n}
              sx={{ mt: 1, mr: 1 }}
            >
              Unstake PHANDS (amount)
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleUnstake(false, '')}
              disabled={loading || currentTimestamp < phandsLockEnd || stakedPhands === 0n}
              sx={{ mt: 1 }}
            >
              Unstake All PHANDS
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">LP Staking</Typography>
            <TextField
              label="Amount (LP Tokens)"
              value={lpAmount}
              onChange={(e) => setLpAmount(e.target.value)}
              type="number"
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              onClick={() => handleStake(true)}
              disabled={loading}
              sx={{ mt: 1, mr: 1 }}
            >
              Stake LP
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleUnstake(true, lpAmount)}
              disabled={loading || currentTimestamp < lpLockEnd || stakedLp === 0n}
              sx={{ mt: 1, mr: 1 }}
            >
              Unstake LP (amount)
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleUnstake(true, '')}
              disabled={loading || currentTimestamp < lpLockEnd || stakedLp === 0n}
              sx={{ mt: 1 }}
            >
              Unstake All LP
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClaimRewards}
              disabled={loading || totalRewards === 0n}
              sx={{ mt: 2 }}
            >
              Claim Rewards
            </Button>
          </Grid>
          <Grid item xs={12}>
            {loading && <CircularProgress sx={{ mt: 2 }} />}
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            {phandsLockEnd > currentTimestamp && stakedPhands > 0 && (
              <Typography sx={{ mt: 2 }}>
                PHANDS Unlock: {new Date(phandsLockEnd * 1000).toLocaleString()}
              </Typography>
            )}
            {lpLockEnd > currentTimestamp && stakedLp > 0 && (
              <Typography sx={{ mt: 1 }}>
                LP Unlock: {new Date(lpLockEnd * 1000).toLocaleString()}
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default Staking;
