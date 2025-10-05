import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, TextField, Card, CardContent, Typography, CircularProgress, Grid, Switch, FormControlLabel } from '@mui/material';

// Contract addresses (raw, validated at runtime)
const TOKEN_ADDRESS_RAW = '0x11157da1fc6dcfd58b50ed79082183b2c6176245';  // PHANDS
const LP_TOKEN_ADDRESS_RAW = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';  // Temporary: WETH (replace with correct PHANDS/WETH pair)
const STAKING_ADDRESS_RAW = '0x0f4e761F2DcFD509eccd18004b89e329D25903B7';  // Staking contract
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
  "function unstakePHAND()",
  "function stakeLP(uint256 amount)",
  "function unstakeLP()",
  "function claimRewards()",
  "function toggleAutoClaim()",
  "function phandStakes(address) view returns (uint256 amount, uint256 startTime, uint256 lastClaimed, bool autoClaimEnabled)",
  "function lpStakes(address) view returns (uint256 amount, uint256 startTime, uint256 lastClaimed, bool autoClaimEnabled)",
  "function phandRewards(address) view returns (uint256)",
  "function totalStakedPHAND() view returns (uint256)",
  "function totalStakedLP() view returns (uint256)"
];

function Staking({ signer, provider }) {
  const [phandsBalance, setPhandsBalance] = useState(0n);
  const [lpBalance, setLpBalance] = useState(0n);
  const [stakedPhands, setStakedPhands] = useState(0n);
  const [stakedLp, setStakedLp] = useState(0n);
  const [rewards, setRewards] = useState(0n);
  const [phandsAmount, setPhandsAmount] = useState('');
  const [lpAmount, setLpAmount] = useState('');
  const [phandsAllowance, setPhandsAllowance] = useState(0n);
  const [lpAllowance, setLpAllowance] = useState(0n);
  const [autoClaim, setAutoClaim] = useState(false);
  const [phandsLockEnd, setPhandsLockEnd] = useState(0);
  const [lpLockEnd, setLpLockEnd] = useState(0);
  const [tokenName, setTokenName] = useState('');
  const [lpName, setLpName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  useEffect(() => {
    if (!signer || !provider) {
      setError('Signer or provider not available. Please connect MetaMask.');
      console.error('Missing signer or provider');
      return;
    }

    const fetchData = async () => {
      try {
        // Check network
        const network = await provider.getNetwork();
        console.log('Network chainId:', network.chainId.toString());
        if (network.chainId !== 1n && network.chainId !== 31337n) {
          setError('Please switch to Ethereum Mainnet or Hardhat fork in MetaMask');
          return;
        }

        // Validate addresses
        let TOKEN_ADDRESS, LP_TOKEN_ADDRESS, STAKING_ADDRESS;
        try {
          TOKEN_ADDRESS = ethers.getAddress(TOKEN_ADDRESS_RAW);
          LP_TOKEN_ADDRESS = ethers.getAddress(LP_TOKEN_ADDRESS_RAW);
          STAKING_ADDRESS = ethers.getAddress(STAKING_ADDRESS_RAW);
          console.log('Addresses validated:', { TOKEN_ADDRESS, LP_TOKEN_ADDRESS, STAKING_ADDRESS });
        } catch (err) {
          setError('Invalid contract address: ' + err.message);
          console.error('Address validation error:', err);
          return;
        }

        // Fetch current block timestamp
        const block = await provider.getBlock('latest').catch(err => {
          console.error('Block fetch error:', err);
          throw err;
        });
        setCurrentTimestamp(Number(block.timestamp));
        console.log('Current block timestamp:', Number(block.timestamp));

        const phands = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
        const lpToken = new ethers.Contract(LP_TOKEN_ADDRESS, LP_TOKEN_ABI, signer);
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
        const addr = await signer.getAddress();
        console.log('Fetching data for address:', addr);

        // Fetch PHANDS data
        let pBal = 0n, pAllw = 0n, pName = 'PHANDS', pStake = { amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false };
        try {
          [pBal, pAllw, pName, pStake] = await Promise.all([
            phands.balanceOf(addr).catch(err => { console.error('PHANDS balanceOf error:', err); return 0n; }),
            phands.allowance(addr, STAKING_ADDRESS).catch(err => { console.error('PHANDS allowance error:', err); return 0n; }),
            phands.name().catch(err => { console.error('PHANDS name error:', err); return 'PHANDS'; }),
            staking.phandStakes(addr).catch(err => { console.error('PHAND stakes error:', err); return { amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false }; })
          ]);
          console.log('PHANDS data:', { balance: pBal.toString(), allowance: pAllw.toString(), name: pName });
        } catch (err) {
          console.error('PHANDS fetch error:', err);
          setError('Failed to fetch PHANDS data: ' + err.message);
        }

        // Fetch LP data
        let lpBal = 0n, lpAllw = 0n, lpName = 'LP', lpStake = { amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false };
        try {
          [lpBal, lpAllw, lpName, lpStake] = await Promise.all([
            lpToken.balanceOf(addr).catch(err => { console.error('LP balanceOf error:', err); return 0n; }),
            lpToken.allowance(addr, STAKING_ADDRESS).catch(err => { console.error('LP allowance error:', err); return 0n; }),
            lpToken.name().catch(err => { console.error('LP name error:', err); return 'LP'; }),
            staking.lpStakes(addr).catch(err => { console.error('LP stakes error:', err); return { amount: 0n, startTime: 0n, lastClaimed: 0n, autoClaimEnabled: false }; })
          ]);
          console.log('LP data:', { balance: lpBal.toString(), allowance: lpAllw.toString(), name: lpName });
        } catch (err) {
          console.error('LP fetch error:', err);
          setError(prev => prev ? prev + '; LP data failed: ' + err.message : 'LP data failed: ' + err.message);
        }

        // Fetch remaining data
        const [rew, totalPhand, totalLp] = await Promise.all([
          staking.phandRewards(addr).catch(err => { console.error('Rewards error:', err); return 0n; }),
          staking.totalStakedPHAND().catch(err => { console.error('Total staked PHAND error:', err); return 0n; }),
          staking.totalStakedLP().catch(err => { console.error('Total staked LP error:', err); return 0n; })
        ]);

        // Update state
        setPhandsBalance(pBal);
        setLpBalance(lpBal);
        setPhandsAllowance(pAllw);
        setLpAllowance(lpAllw);
        setTokenName(pName);
        setLpName(lpName);
        setStakedPhands(pStake.amount);
        setPhandsLockEnd(Number(pStake.startTime) + 30 * 24 * 60 * 60);
        setStakedLp(lpStake.amount);
        setLpLockEnd(Number(lpStake.startTime) + 30 * 24 * 60 * 60);
        setAutoClaim(pStake.autoClaimEnabled || lpStake.autoClaimEnabled);
        setRewards(rew);
        console.log('State updated successfully:', { totalPhand: totalPhand.toString(), totalLp: totalLp.toString() });
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        console.error('Fetch data error:', err);
      }
    };

    fetchData();
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
        console.error(`Approval error for ${tokenType}:`, err);
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
      // Refresh balances
      const addr = await signer.getAddress();
      contract.balanceOf(addr).then(balance => {
        console.log(`Updated ${isLp ? 'LP' : 'PHANDS'} balance:`, balance.toString());
        isLp ? setLpBalance(balance) : setPhandsBalance(balance);
      });
      staking[isLp ? 'lpStakes' : 'phandStakes'](addr).then(data => {
        console.log(`Updated ${isLp ? 'LP' : 'PHANDS'} stake:`, data.amount.toString());
        if (isLp) setStakedLp(data.amount); else setStakedPhands(data.amount);
        (isLp ? setLpLockEnd : setPhandsLockEnd)(Number(data.startTime) + 30 * 24 * 60 * 60);
        setAutoClaim(data.autoClaimEnabled);
      });
      staking.phandRewards(addr).then(rew => {
        console.log('Updated rewards:', rew.toString());
        setRewards(rew);
      });
      // Update timestamp
      const block = await provider.getBlock('latest');
      setCurrentTimestamp(Number(block.timestamp));
    } catch (err) {
      setError(`Stake failed: ${err.message}. Check balance or gas.`);
      console.error('Stake error:', err);
    }
    setLoading(false);
  };

  const handleUnstake = async (isLp = false) => {
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
      const tx = isLp 
        ? await staking.unstakeLP({ gasLimit: 300000 })
        : await staking.unstakePHAND({ gasLimit: 300000 });
      await tx.wait();
      alert(`Unstaked all ${isLp ? 'LP tokens' : 'PHANDS'} and claimed rewards!`);
      // Refresh balances
      const addr = await signer.getAddress();
      (isLp 
        ? new ethers.Contract(LP_TOKEN_ADDRESS_RAW, LP_TOKEN_ABI, signer)
        : new ethers.Contract(TOKEN_ADDRESS_RAW, TOKEN_ABI, signer)
      ).balanceOf(addr).then(balance => {
        console.log(`Updated ${isLp ? 'LP' : 'PHANDS'} balance:`, balance.toString());
        isLp ? setLpBalance(balance) : setPhandsBalance(balance);
      });
      staking[isLp ? 'lpStakes' : 'phandStakes'](addr).then(data => {
        console.log(`Updated ${isLp ? 'LP' : 'PHANDS'} stake:`, data.amount.toString());
        if (isLp) setStakedLp(data.amount); else setStakedPhands(data.amount);
        (isLp ? setLpLockEnd : setPhandsLockEnd)(Number(data.startTime) + 30 * 24 * 60 * 60);
        setAutoClaim(data.autoClaimEnabled);
      });
      staking.phandRewards(addr).then(rew => {
        console.log('Updated rewards:', rew.toString());
        setRewards(rew);
      });
      // Update timestamp
      setCurrentTimestamp(currentTime);
    } catch (err) {
      setError(`Unstake failed: ${err.message}. Check lock period or gas.`);
      console.error('Unstake error:', err);
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
      staking.phandRewards(await signer.getAddress()).then(rew => {
        console.log('Updated rewards:', rew.toString());
        setRewards(rew);
      });
      const block = await provider.getBlock('latest');
      setCurrentTimestamp(Number(block.timestamp));
    } catch (err) {
      setError('Claim failed: ' + err.message);
      console.error('Claim error:', err);
    }
    setLoading(false);
  };

  const handleToggleAutoClaim = async () => {
    setLoading(true);
    setError('');
    try {
      const staking = new ethers.Contract(STAKING_ADDRESS_RAW, STAKING_ABI, signer);
      const tx = await staking.toggleAutoClaim({ gasLimit: 150000 });
      await tx.wait();
      setAutoClaim(!autoClaim);
      alert(`Auto-claim ${autoClaim ? 'disabled' : 'enabled'}!`);
      const block = await provider.getBlock('latest');
      setCurrentTimestamp(Number(block.timestamp));
    } catch (err) {
      setError('Toggle failed: ' + err.message);
      console.error('Toggle error:', err);
    }
    setLoading(false);
  };

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
            <Typography>Rewards: {ethers.formatEther(rewards)} PHANDS</Typography>
            <FormControlLabel
              control={<Switch checked={autoClaim} onChange={handleToggleAutoClaim} disabled={loading} />}
              label="Auto-Claim Rewards"
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
              onClick={() => handleUnstake(false)}
              disabled={loading || currentTimestamp < phandsLockEnd}
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
              onClick={() => handleUnstake(true)}
              disabled={loading || currentTimestamp < lpLockEnd}
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
              disabled={loading || rewards === 0n}
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