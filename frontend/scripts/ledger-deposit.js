#!/usr/bin/env node

/**
 * Deposit on-chain funds from a local Anvil wallet into the Nitrolite custody contract.
 *
 * Example:
 *   node scripts/ledger-deposit.js \
 *     --rpc http://localhost:8545 \
 *     --private-key 0x<broker_private_key> \
 *     --custody 0x8658501c98C3738026c4e5c361c6C3fa95DfB255 \
 *     --token 0xbD24c53072b9693A35642412227043Ffa5fac382 \
 *     --amount 1000 \
 *     --decimals 6 \
 *     --chain-id 31337
 */

const path = require('path')
const fs = require('fs')
const { CustodyAbi, Erc20Abi } = require('@erc7824/nitrolite/dist/abis')

const DEFAULT_RPC = 'http://localhost:8545'
const DEFAULT_CHAIN_ID = 31337
const DEFAULT_TOKEN = '0xbD24c53072b9693A35642412227043Ffa5fac382'
const DEFAULT_CUSTODY = '0x8658501c98C3738026c4e5c361c6C3fa95DfB255'
const DEFAULT_AMOUNT = '1000'
const DEFAULT_DECIMALS = 6

function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const out = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]/, '').replace(/['"]$/, '')
      out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

function pick(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string') {
      if (value.trim() === '') continue
      return value
    }
    return value
  }
  return undefined
}

function normalizePrivateKey(input) {
  let value = String(input || '').trim()
  if (!value.startsWith('0x')) value = `0x${value}`
  if (value.length !== 66) {
    throw new Error(`Invalid private key provided (${input})`)
  }
  return value.toLowerCase()
}

function normalizeAddress(input, label) {
  let value = String(input || '').trim()
  if (!value.startsWith('0x')) value = `0x${value}`
  if (value.length !== 42) {
    throw new Error(`Invalid ${label} address (${input})`)
  }
  return value.toLowerCase()
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const opts = {}

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      opts[key] = next
      i += 1
    } else {
      opts[key] = 'true'
    }
  }

  const envLocal = loadEnv(path.join(__dirname, '..', '.env.local'))
  const envExample = loadEnv(path.join(__dirname, '..', '.env'))
  const env = { ...envExample, ...envLocal }

  const rpcUrl = pick(opts.rpc, process.env.RPC_URL, env.RPC_URL, DEFAULT_RPC)
  const privateKeyRaw = pick(opts['private-key'], env.BROKER_PRIVATE_KEY, process.env.BROKER_PRIVATE_KEY)
  if (!privateKeyRaw) throw new Error('Missing --private-key (or BROKER_PRIVATE_KEY)')

  const custodyRaw = pick(opts.custody, env.NEXT_PUBLIC_CUSTODY_ADDRESS, process.env.NEXT_PUBLIC_CUSTODY_ADDRESS, DEFAULT_CUSTODY)
  const tokenRaw = pick(opts.token, env.NEXT_PUBLIC_TOKEN_ADDRESS, process.env.NEXT_PUBLIC_TOKEN_ADDRESS, DEFAULT_TOKEN)
  const chainIdStr = pick(opts['chain-id'], env.NEXT_PUBLIC_CHAIN_ID, process.env.NEXT_PUBLIC_CHAIN_ID, DEFAULT_CHAIN_ID)
  const amountHuman = pick(opts.amount, process.env.DEPOSIT_AMOUNT, env.DEPOSIT_AMOUNT, DEFAULT_AMOUNT)
  const unitsOverride = pick(opts.units, process.env.DEPOSIT_UNITS, env.DEPOSIT_UNITS)
  const decimalsStr = pick(opts.decimals, process.env.DEPOSIT_DECIMALS, env.DEPOSIT_DECIMALS, DEFAULT_DECIMALS)

  const chainId = Number(chainIdStr)
  if (!Number.isFinite(chainId)) throw new Error(`Invalid chain id (${chainIdStr})`)
  const decimals = Number(decimalsStr)
  if (!Number.isFinite(decimals)) throw new Error(`Invalid decimals (${decimalsStr})`)

  return {
    rpcUrl,
    privateKey: normalizePrivateKey(privateKeyRaw),
    custodyAddress: normalizeAddress(custodyRaw, 'custody'),
    tokenAddress: normalizeAddress(tokenRaw, 'token'),
    chainId,
    decimals,
    amountHuman: String(amountHuman),
    unitsOverride: unitsOverride ? BigInt(unitsOverride) : null,
  }
}

async function main() {
  const { createPublicClient, createWalletClient, http, parseUnits, zeroAddress, formatUnits } = await import('viem')
  const { privateKeyToAccount } = await import('viem/accounts')

  const config = parseArgs()
  const account = privateKeyToAccount(config.privateKey)

  const chain = {
    id: config.chainId,
    name: 'local-anvil',
    network: 'anvil-local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] },
    },
  }

  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) })
  const walletClient = createWalletClient({ chain, transport: http(config.rpcUrl), account })

  const amountUnits = config.unitsOverride ?? parseUnits(config.amountHuman, config.decimals)
  const amountFormatted = formatUnits(amountUnits, config.decimals)

  console.log(`[info] Depositing ${amountFormatted} (=${amountUnits} units) of ${config.tokenAddress} into custody ${config.custodyAddress}`)
  console.log(`[info] Using account ${account.address}`)

  if (config.tokenAddress !== zeroAddress) {
    const allowance = await publicClient.readContract({
      address: config.tokenAddress,
      abi: Erc20Abi,
      functionName: 'allowance',
      args: [account.address, config.custodyAddress],
    })
    if (allowance < amountUnits) {
      console.log('[info] Allowance insufficient; sending approve transaction')
      const approveHash = await walletClient.writeContract({
        address: config.tokenAddress,
        abi: Erc20Abi,
        functionName: 'approve',
        args: [config.custodyAddress, amountUnits],
      })
      console.log(`[info] Approve tx hash: ${approveHash}`)
      await publicClient.waitForTransactionReceipt({ hash: approveHash })
      console.log('[info] Approve confirmed')
    } else {
      console.log('[info] Current allowance sufficient; skipping approve')
    }
  }

  const depositHash = await walletClient.writeContract({
    address: config.custodyAddress,
    abi: CustodyAbi,
    functionName: 'deposit',
    args: [account.address, config.tokenAddress, amountUnits],
    value: config.tokenAddress === zeroAddress ? amountUnits : 0n,
  })
  console.log(`[info] Deposit tx hash: ${depositHash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash })
  console.log(`[info] Deposit included in block ${receipt.blockNumber}`)
  console.log('[info] Done. You can now distribute ledger funds from the broker account.')
}

main().catch((err) => {
  console.error('[fatal] Ledger deposit failed:', err.message || err)
  process.exit(1)
})
