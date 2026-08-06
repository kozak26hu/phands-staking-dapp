import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Card, CardContent, Typography, CircularProgress, Grid, Switch, FormControlLabel, Box } from '@mui/material';

// Contract addresses (raw, validated at runtime)
const TOKEN_ADDRESS_RAW = '0x11157da1fc6dcfd58b50ed79082183b2c6176245'; // PHANDS
const LP_TOKEN_ADDRESS_RAW = '0x29b2b1450dfe8d856fA42250437B1e827435f82E'; // PHANDS/WETH Uniswap V2 pair
const STAKING_ADDRESS_RAW = '0x62fe22a9b954bc84fc6a74d889324fb40d13dce4'; // Vegleges (v4) staking kontraktus

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

const STAKING_ABI = [
  "function stakePHAND(uint256 amount)",
  "function stakePHANDFor(address beneficiary, uint256 amount)",
  "function unstakePHAND(uint256 amount)",
  "function stakeLP(uint256 amount)",
  "function stakeLPFor(address beneficiary, uint256 amount)",
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

const REFERRAL_ABI = [
  "function setReferrer(address ref)",
  "function referrers(address) view returns (address)"
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
  const [referrerInput, setReferrerInput] = useState('');
  const [currentReferrer, setCurrentReferrer] = useState(null);
  const [beneficiary, setBeneficiary] = useState(''); // uj: masnak stakeles

  const PHAND_LOCK_PERIOD_SECONDS = 30 * 24 * 60 * 60;
  const LP_LOCK_PERIOD_SECONDS = 90 * 24 * 60 * 60;

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

      const [phandPending, lpPending] = await staking.pendingRewards(addr).catch(() => [0n, 0n]);

      const refContract = new ethers.Contract(TOKEN_ADDRESS, REFERRAL_ABI, signer);
      const refAddr = await refContract.referrers(addr).catch(() => ethers.ZeroAddress);
      setCurrentReferrer(refAddr === ethers.ZeroAddress ? null : refAddr);

      setPhandsBalance(pBal);
      setLpBalance(lpBal);
      setPhandsAllowance(pAllw);
      setLpAllowance(lpAllw);
      setTokenName(pName);
      setLpName(lpNm);
      setStakedPhands(pStake.amount);
      setPhandsLockEnd(pStake.amount > 0n ? Number(pStake.startTime) + PHAND_LOCK_PERIOD_SECONDS : 0);
      setStakedLp(lpStake.amount);
      setLpLockEnd(lpStake.amount > 0n ? Number(lpStake.startTime) + LP_LOCK_PERIOD_SECONDS : 0);
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

    // Ha van beneficiary megadva, validáljuk
    let target = null;
    if (beneficiary.trim()) {
      try {
        target = ethers.getAddress(beneficiary.trim());
      } catch {
        setError('Invalid beneficiary address');
        return;
      }
    }

    const contract = isLp
      ? new ethers.Contract(LP_TOKEN_ADDRESS_RAW, LP_TOKEN_ABI, signer)
      : new ethers.Contract(TOKEN_ADDRESS_RAW, TOKEN_ABI, signer);

    if (!(await approveIfNeeded(contract, amount, isLp ? 'lp' : 'phands'))) return;

    setLoading(true);
    setError('');
    try {
      const staking = new ethers.Contract(STAKING_ADDRESS_RAW, STAKING_ABI, signer);
      const parsedAmount = ethers.parseEther(amount);

      let tx;
      if (target) {
        // Masnak stakelunk
        tx = isLp
          ? await staking.stakeLPFor(target, parsedAmount, { gasLimit: 350000 })
          : await staking.stakePHANDFor(target, parsedAmount, { gasLimit: 350000 });
      } else {
        // Sajat magunknak
        tx = isLp
          ? await staking.stakeLP(parsedAmount, { gasLimit: 300000 })
          : await staking.stakePHAND(parsedAmount, { gasLimit: 300000 });
      }

      await tx.wait();

      if (target) {
        alert(`Staked ${amount} ${isLp ? 'LP tokens' : 'PHANDS'} for ${target.slice(0, 6)}...${target.slice(-4)}!`);
      } else {
        alert(`Staked ${amount} ${isLp ? 'LP tokens' : 'PHANDS'}!`);
      }

      setPhandsAmount('');
      setLpAmount('');
      setBeneficiary('');
      await refreshAll();
    } catch (err) {
      setError(`Stake failed: ${err.message}. Check balance or gas.`);
    }
    setLoading(false);
  };

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

  const handleSetReferrer = async () => {
    if (!referrerInput || !ethers.isAddress(referrerInput)) {
      setError('Enter a valid referrer wallet address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const refContract = new ethers.Contract(TOKEN_ADDRESS_RAW, REFERRAL_ABI, signer);
      const tx = await refContract.setReferrer(referrerInput, { gasLimit: 100000 });
      await tx.wait();
      alert('Referrer set! This is permanent and recorded on-chain.');
      setReferrerInput('');
      await refreshAll();
    } catch (err) {
      setError('Failed to set referrer: ' + err.message);
    }
    setLoading(false);
  };

  const totalRewards = phandRewards + lpRewards;

  const StatBox = ({ label, value, accent }) => (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 3,
        p: 1.5,
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: accent || '#eef2f8', fontSize: '0.95rem', mt: 0.3 }}>
        {value}
      </Typography>
    </Box>
  );

  const SectionLabel = ({ children }) => (
    <Typography
      variant="caption"
      sx={{
        display: 'inline-block',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#60a5fa',
        backgroundColor: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 100,
        px: 1.5,
        py: 0.3,
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', p: 1 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
          Stake {tokenName || 'PHANDS'}
        </Typography>

        <Grid container spacing={1.2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatBox label="PHANDS" value={Number(ethers.formatEther(phandsBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox label="Staked" value={Number(ethers.formatEther(stakedPhands)).toLocaleString(undefined, { maximumFractionDigits: 2 })} accent="#60a5fa" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox label={lpName || 'LP'} value={Number(ethers.formatEther(lpBalance)).toLocaleString(undefined, { maximumFractionDigits: 4 })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox label="LP Staked" value={Number(ethers.formatEther(stakedLp)).toLocaleString(undefined, { maximumFractionDigits: 4 })} accent="#a78bfa" />
          </Grid>
          <Grid item xs={6}>
            <StatBox label="PHAND Reward" value={Number(ethers.formatEther(phandRewards)).toFixed(4)} accent="#4ade80" />
          </Grid>
          <Grid item xs={6}>
            <StatBox label="LP Reward" value={Number(ethers.formatEther(lpRewards)).toFixed(4)} accent="#4ade80" />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={autoClaimPhand} onChange={() => handleToggleAutoClaim(false)} disabled={loading} />}
              label={<Typography variant="body2">Auto-Claim PHAND Rewards</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={autoClaimLp} onChange={() => handleToggleAutoClaim(true)} disabled={loading} />}
              label={<Typography variant="body2">Auto-Claim LP Rewards</Typography>}
            />
          </Grid>

          {/* UJ: Beneficiary mezo - masnak stakeleshez */}
          <Grid item xs={12}>
            <SectionLabel>Stake for someone else (optional)</SectionLabel>
            <TextField
              label="Beneficiary wallet address"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              fullWidth
              size="small"
              margin="dense"
              placeholder="0x... (leave empty to stake for yourself)"
              helperText="If filled, the stake will be credited to this address instead of yours"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <SectionLabel>PHAND · 30-day lock</SectionLabel>
            <TextField
              label="Amount (PHANDS)"
              value={phandsAmount}
              onChange={(e) => setPhandsAmount(e.target.value)}
              type="number"
              fullWidth
              size="small"
              margin="dense"
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              <Button variant="contained" size="small" onClick={() => handleStake(false)} disabled={loading}>
                {beneficiary.trim() ? 'Stake for other' : 'Stake'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleUnstake(false, phandsAmount)}
                disabled={loading || currentTimestamp < phandsLockEnd || stakedPhands === 0n}
              >
                Unstake amount
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={() => handleUnstake(false, '')}
                disabled={loading || currentTimestamp < phandsLockEnd || stakedPhands === 0n}
              >
                Unstake all
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <SectionLabel>LP · 90-day lock</SectionLabel>
            <TextField
              label="Amount (LP Tokens)"
              value={lpAmount}
              onChange={(e) => setLpAmount(e.target.value)}
              type="number"
              fullWidth
              size="small"
              margin="dense"
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              <Button variant="contained" size="small" onClick={() => handleStake(true)} disabled={loading}>
                {beneficiary.trim() ? 'Stake for other' : 'Stake'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleUnstake(true, lpAmount)}
                disabled={loading || currentTimestamp < lpLockEnd || stakedLp === 0n}
              >
                Unstake amount
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={() => handleUnstake(true, '')}
                disabled={loading || currentTimestamp < lpLockEnd || stakedLp === 0n}
              >
                Unstake all
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleClaimRewards}
              disabled={loading || totalRewards === 0n}
              fullWidth
            >
              Claim Rewards
            </Button>
          </Grid>

          <Grid item xs={12}>
            <SectionLabel>Referral</SectionLabel>
            {currentReferrer ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>
                Referrer set: {currentReferrer.slice(0, 6)}...{currentReferrer.slice(-4)} (permanent)
              </Typography>
            ) : (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  If someone referred you, enter their wallet address. This is permanent and can only be set once.
                </Typography>
                <TextField
                  label="Referrer wallet address"
                  value={referrerInput}
                  onChange={(e) => setReferrerInput(e.target.value)}
                  fullWidth
                  size="small"
                  margin="dense"
                  placeholder="0x..."
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSetReferrer}
                  disabled={loading || !referrerInput}
                  sx={{ mt: 1 }}
                >
                  Set Referrer
                </Button>
              </>
            )}
          </Grid>

          <Grid item xs={12}>
            {loading && <CircularProgress size={24} sx={{ mt: 1 }} />}
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            {phandsLockEnd > currentTimestamp && stakedPhands > 0 && (
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                PHANDS unlock: {new Date(phandsLockEnd * 1000).toLocaleString()}
              </Typography>
            )}
            {lpLockEnd > currentTimestamp && stakedLp > 0 && (
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                LP unlock: {new Date(lpLockEnd * 1000).toLocaleString()}
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default Staking;
