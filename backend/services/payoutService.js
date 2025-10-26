const { ethers } = require('ethers');

// Minimal ERC-20 ABI for transfer operations
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

/**
 * Safely parse a numeric value to string, defaults to "0" when invalid.
 * @param {number|string|undefined|null} value
 * @returns {string}
 */
function toNumericString(value) {
  if (value === undefined || value === null) return '0';
  const numberValue = typeof value === 'string' ? value.trim() : String(value);
  if (numberValue.length === 0 || numberValue === 'NaN') return '0';
  return numberValue;
}

/**
 * Resolve the token address for a given asset symbol using environment variables.
 * Falls back to PAYOUT_TOKEN_ADDRESS when asset-specific mapping is absent.
 * @param {string} asset
 * @returns {string|undefined}
 */
function resolveTokenAddress(asset) {
  const upper = asset.toUpperCase();
  return process.env[`PAYOUT_TOKEN_ADDRESS_${upper}`] || process.env.PAYOUT_TOKEN_ADDRESS;
}

/**
 * Resolve token decimals for a given asset symbol using environment variables.
 * Falls back to PAYOUT_TOKEN_DECIMALS (default 6) when undefined.
 * @param {string} asset
 * @returns {number}
 */
function resolveTokenDecimals(asset) {
  const upper = asset.toUpperCase();
  const configured = process.env[`PAYOUT_TOKEN_DECIMALS_${upper}`] || process.env.PAYOUT_TOKEN_DECIMALS;
  const parsed = configured !== undefined ? Number(configured) : undefined;
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  // Common stablecoin default
  return upper === 'ETH' ? 18 : 6;
}

/**
 * Build a common receipt payload that the frontend can render consistently.
 * @param {Object} params
 * @returns {Object}
 */
function buildReceipt({
  status,
  asset,
  amount,
  totalPlayers,
  winner,
  transactionHash,
  network,
  message,
  simulated,
}) {
  return {
    status,
    asset,
    amount,
    totalPlayers,
    winner,
    transactionHash: transactionHash || null,
    network: network || process.env.PAYOUT_NETWORK_NAME || null,
    message: message || null,
    simulated: simulated || false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Attempt to payout the full prize pool to the winner instantly.
 * When RPC credentials are not provided, the function falls back to a simulated
 * receipt so the UX can still announce the winner without breaking.
 *
 * Required environment variables for live payouts:
 *   - PAYOUT_RPC_URL: JSON-RPC endpoint to broadcast the transaction
 *   - PAYOUT_PRIVATE_KEY: Private key controlling the escrow/pot funds
 *   - PAYOUT_TOKEN_ADDRESS[_SYMBOL] (only for ERC-20 assets)
 *   - PAYOUT_TOKEN_DECIMALS[_SYMBOL] (optional override for ERC-20)
 *
 * @param {Object} room - Active room state when the game finishes
 * @param {Array} rankings - Sorted rankings array (highest score first)
 * @returns {Promise<Object>} - Payout receipt shared with frontend
 */
async function processPayout(room, rankings) {
  const winner = rankings?.[0];
  const entryFee = Number(room?.config?.entryFee || 0);
  const totalPlayers = 1 + (room?.participants?.length || 0);
  const asset = String(room?.config?.asset || 'USDC').toUpperCase();
  const totalPot = toNumericString(entryFee * totalPlayers);

  if (!winner || !winner.walletAddress) {
    return buildReceipt({
      status: 'skipped',
      asset,
      amount: '0',
      totalPlayers,
      winner: null,
      message: 'No eligible winner found when game ended',
      simulated: true,
    });
  }

  const payoutWinner = {
    walletAddress: winner.walletAddress,
    username: winner.username,
  };

  const rpcUrl = process.env.PAYOUT_RPC_URL;
  const privateKey = process.env.PAYOUT_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    return buildReceipt({
      status: 'simulated',
      asset,
      amount: totalPot,
      totalPlayers,
      winner: payoutWinner,
      message: 'Payout RPC or private key not configured. Broadcasting simulation only.',
      simulated: true,
    });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    if (asset === 'ETH') {
      const value = ethers.parseEther(totalPot);
      const tx = await signer.sendTransaction({
        to: payoutWinner.walletAddress,
        value,
      });
      await tx.wait();

      return buildReceipt({
        status: 'paid',
        asset,
        amount: totalPot,
        totalPlayers,
        winner: payoutWinner,
        transactionHash: tx.hash,
      });
    }

    const tokenAddress = resolveTokenAddress(asset);
    if (!tokenAddress) {
      return buildReceipt({
        status: 'simulated',
        asset,
        amount: totalPot,
        totalPlayers,
        winner: payoutWinner,
        message: `Token address not configured for asset ${asset}. Sent simulated payout receipt.`,
        simulated: true,
      });
    }

    const decimals = resolveTokenDecimals(asset);
    const units = ethers.parseUnits(totalPot, decimals);
    const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tx = await erc20.transfer(payoutWinner.walletAddress, units);
    await tx.wait();

    return buildReceipt({
      status: 'paid',
      asset,
      amount: totalPot,
      totalPlayers,
      winner: payoutWinner,
      transactionHash: tx.hash,
    });
  } catch (error) {
    console.error('❌ Payout processing failed:', error);
    return buildReceipt({
      status: 'failed',
      asset,
      amount: totalPot,
      totalPlayers,
      winner: payoutWinner,
      message: error?.message || 'Unexpected payout error',
      simulated: true,
    });
  }
}

module.exports = {
  processPayout,
};
