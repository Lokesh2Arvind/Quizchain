#!/usr/bin/env node

/**
 * Simple helper script to credit unified ledger balances on a local Yellow stack.
 *
 * Example:
 *   node scripts/local-ledger-credit.js \
 *     --key 0x<broker_private_key> \
 *     --destination 0x<session_address> \
 *     --amount 150 \
 *     --token 0xbD24c53072b9693A35642412227043Ffa5fac382 \
 *     --chain 31337
 *
 * The script signs a transfer RPC with the supplied broker key and sends it to
 * the ClearNode instance (default ws://localhost:8000/ws). Use --help to see
 * the full list of options.
 */

const path = require('path')
const fs = require('fs')
const WebSocket = require('ws')
const {
  createECDSAMessageSigner,
  createTransferMessage,
  createGetAssetsMessage,
  createGetLedgerBalancesMessage,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  parseAnyRPCResponse,
  RPCMethod,
  EIP712AuthTypes,
} = require('@erc7824/nitrolite')

const DEFAULT_WS = 'ws://localhost:8000/ws'
const DEFAULT_TOKEN = '0xbD24c53072b9693A35642412227043Ffa5fac382'
const DEFAULT_CHAIN = 31337
const DEFAULT_DECIMALS = 6
const DEFAULT_AMOUNT = '100'
const DEFAULT_TIMEOUT = 10000
const DEFAULT_SCOPE = 'console'
const DEFAULT_APPLICATION = '0x0000000000000000000000000000000000000000'
const DEFAULT_APP_NAME = 'BrokerScript'

function printHelp() {
  console.log(`Usage: node scripts/local-ledger-credit.js [options]\n\n` +
    `Options:\n` +
    `  --key <hex>            Broker/faucet private key (0x-prefixed, required)\n` +
    `  --destination <addr>   Destination ledger participant address\n` +
    `  --tag <value>          Alternative to destination: destination user tag\n` +
    `  --amount <value>       Human amount to credit (default ${DEFAULT_AMOUNT})\n` +
    `  --units <value>        Amount in base units (overrides --amount)\n` +
    `  --decimals <value>     Token decimals (default ${DEFAULT_DECIMALS})\n` +
    `  --token <addr>         Token address (default local USDC)\n` +
    `  --chain <id>           Chain ID (default ${DEFAULT_CHAIN})\n` +
    `  --asset <id>           Override asset identifier (chainId:tokenAddress)\n` +
    `  --ws <url>             ClearNode WebSocket URL (default ${DEFAULT_WS})\n` +
    `  --timeout <ms>         RPC timeout in ms (default ${DEFAULT_TIMEOUT})\n`)
}

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const result = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const valueRaw = trimmed.slice(eq + 1).trim()
      const unquoted = valueRaw.replace(/^['"]/, '').replace(/['"]$/, '')
      result[key] = unquoted
    }
    return result
  } catch (err) {
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
  let value = String(input).trim()
  if (!value.startsWith('0x')) value = `0x${value}`
  if (value.length !== 66) {
    throw new Error(`Expected 32-byte private key, received "${input}"`)
  }
  return value.toLowerCase()
}

function normalizeAddress(input, label) {
  let value = String(input).trim()
  if (!value.startsWith('0x')) value = `0x${value}`
  if (value.length !== 42) {
    throw new Error(`Invalid ${label} address "${input}"`)
  }
  return value.toLowerCase()
}

function parseAmount(amountStr, decimals) {
  const str = String(amountStr).trim()
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid amount format "${amountStr}"`)
  }
  const [whole, frac = ''] = str.split('.')
  const fracClean = frac.replace(/[^0-9]/g, '')
  if (fracClean.length > decimals) {
    console.warn(`[warn] Truncating fractional part to ${decimals} decimals`)
  }
  const fracPadded = fracClean.slice(0, decimals).padEnd(decimals, '0')
  const wholeBig = BigInt(whole || '0')
  const fracBig = fracPadded ? BigInt(fracPadded) : 0n
  const base = 10n ** BigInt(decimals)
  return wholeBig * base + fracBig
}

function formatUnits(value, decimals) {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const frac = value % base
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fracStr}`
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return [value]
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const opts = {}
  let helpRequested = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    if (key === 'help' || key === 'h') {
      helpRequested = true
      continue
    }
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      opts[key] = next
      i += 1
    } else {
      opts[key] = 'true'
    }
  }

  if (helpRequested) {
    printHelp()
    process.exit(0)
  }

  const envLocal = loadEnvFile(path.join(__dirname, '..', '.env.local'))
  const envExample = loadEnvFile(path.join(__dirname, '..', '.env'))
  const env = { ...envExample, ...envLocal }

  const wsUrl = pick(
    opts.ws,
    opts.url,
    process.env.CLEARNODE_WS_URL,
    env.CLEARNODE_WS_URL,
    process.env.NEXT_PUBLIC_CLEARNODE_URL,
    env.NEXT_PUBLIC_CLEARNODE_URL,
    DEFAULT_WS,
  )

  const privateKeyRaw = pick(
    opts.key,
    opts.privateKey,
    process.env.BROKER_PRIVATE_KEY,
    process.env.LEDGER_FUND_PRIVATE_KEY,
    env.BROKER_PRIVATE_KEY,
    env.LEDGER_FUND_PRIVATE_KEY,
  )
  if (!privateKeyRaw) {
    throw new Error('Missing broker private key. Provide via --key or set BROKER_PRIVATE_KEY.')
  }

  const destinationRaw = pick(
    opts.destination,
    opts.dest,
    process.env.TRANSFER_DESTINATION,
    env.TRANSFER_DESTINATION,
  )

  const destinationTag = pick(
    opts.tag,
    opts.destinationTag,
    process.env.TRANSFER_DESTINATION_TAG,
    env.TRANSFER_DESTINATION_TAG,
  )

  if (!destinationRaw && !destinationTag) {
    throw new Error('Missing destination. Provide --destination (address) or --tag (user tag).')
  }

  const tokenRaw = pick(
    opts.token,
    process.env.TRANSFER_TOKEN_ADDRESS,
    env.TRANSFER_TOKEN_ADDRESS,
    process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
    env.NEXT_PUBLIC_TOKEN_ADDRESS,
    DEFAULT_TOKEN,
  )

  const chainIdStr = pick(
    opts.chain,
    opts.chainId,
    process.env.TRANSFER_CHAIN_ID,
    env.TRANSFER_CHAIN_ID,
    process.env.NEXT_PUBLIC_CHAIN_ID,
    env.NEXT_PUBLIC_CHAIN_ID,
    DEFAULT_CHAIN.toString(),
  )
  const chainId = Number(chainIdStr)
  if (!Number.isFinite(chainId)) throw new Error(`Invalid chain id "${chainIdStr}"`)

  const decimalsStr = pick(
    opts.decimals,
    process.env.TRANSFER_DECIMALS,
    env.TRANSFER_DECIMALS,
    DEFAULT_DECIMALS.toString(),
  )
  const decimals = Number(decimalsStr)
  if (!Number.isFinite(decimals)) throw new Error(`Invalid decimals "${decimalsStr}"`)

  const amountHuman = pick(
    opts.amount,
    process.env.TRANSFER_AMOUNT,
    env.TRANSFER_AMOUNT,
    DEFAULT_AMOUNT,
  )

  const unitsOverride = pick(
    opts.units,
    process.env.TRANSFER_UNITS,
    env.TRANSFER_UNITS,
  )

  const assetOverride = pick(
    opts.asset,
    process.env.TRANSFER_ASSET,
    env.TRANSFER_ASSET,
  )

  const timeoutStr = pick(
    opts.timeout,
    process.env.TRANSFER_TIMEOUT_MS,
    env.TRANSFER_TIMEOUT_MS,
    DEFAULT_TIMEOUT.toString(),
  )
  const timeoutMs = Number(timeoutStr)
  if (!Number.isFinite(timeoutMs)) throw new Error(`Invalid timeout "${timeoutStr}"`)

  return {
    wsUrl,
    privateKey: normalizePrivateKey(privateKeyRaw),
    destination: destinationRaw ? normalizeAddress(destinationRaw, 'destination') : undefined,
    destinationTag,
    tokenAddress: tokenRaw ? normalizeAddress(tokenRaw, 'token') : normalizeAddress(DEFAULT_TOKEN, 'token'),
    chainId,
    decimals,
    amountHuman,
    unitsOverride,
    assetOverride,
    timeoutMs,
  }
}

async function main() {
  const config = parseArgs()
  console.log(`[info] Connecting to ${config.wsUrl} (chain ${config.chainId})`)

  const ws = new WebSocket(config.wsUrl)
  const waiters = new Map()
  let closed = false

  function removeWaiter(method, entry) {
    const list = waiters.get(method)
    if (!list) return
    const idx = list.indexOf(entry)
    if (idx >= 0) {
      list.splice(idx, 1)
      waiters.set(method, list)
    }
  }

  function waitFor(method, timeoutMs = config.timeoutMs) {
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, timeout: undefined }
      const list = waiters.get(method) || []
      list.push(entry)
      waiters.set(method, list)
      entry.timeout = setTimeout(() => {
        removeWaiter(method, entry)
        reject(new Error(`Timed out waiting for ${method}`))
      }, timeoutMs)
    })
  }

  function fulfill(method, payload) {
    const list = waiters.get(method)
    if (!list || list.length === 0) return false
    const entry = list.shift()
    waiters.set(method, list)
    if (entry.timeout) clearTimeout(entry.timeout)
    entry.resolve(payload)
    return true
  }

  function rejectAll(error) {
    for (const [method, list] of waiters.entries()) {
      waiters.delete(method)
      for (const entry of list) {
        if (entry.timeout) clearTimeout(entry.timeout)
        entry.reject(error)
      }
    }
  }

  ws.on('message', (data) => {
    let parsed
    try {
      parsed = parseAnyRPCResponse(data.toString())
    } catch (err) {
      console.warn('[warn] Failed to parse message from node:', data.toString())
      return
    }
    const method = parsed?.method
    if (!method) return

    if (method === RPCMethod.Error) {
      const errMsg = parsed?.params?.error || parsed?.params?.message || JSON.stringify(parsed)
      console.error('[error] Node responded with error:', errMsg)
      rejectAll(new Error(errMsg))
      return
    }

    if (!fulfill(method, parsed)) {
      if (method === RPCMethod.TransferNotification) {
        console.log('[info] Transfer notification:', JSON.stringify(parsed?.params ?? parsed, null, 2))
      } else if (method !== RPCMethod.Pong) {
        console.log('[debug] Unhandled message:', method)
      }
    }
  })

  ws.on('close', (code, reason) => {
    closed = true
    const text = reason ? reason.toString() : ''
    if (code !== 1000) {
      console.warn(`[warn] WebSocket closed (${code}) ${text}`)
    }
    rejectAll(new Error(`WebSocket closed (${code}) ${text}`))
  })

  ws.on('error', (err) => {
    if (!closed) {
      console.error('[error] WebSocket error:', err.message || err)
    }
  })

  await new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

  const { privateKeyToAccount } = await import('viem/accounts')
  const account = privateKeyToAccount(config.privateKey)
  const sessionAddress = account.address
  const signer = createECDSAMessageSigner(config.privateKey)

  async function authenticate() {
    console.log('[info] Authenticating session before transfer')
    const expire = Math.floor(Date.now() / 1000) + 3600
    const authRequest = await createAuthRequestMessage({
      address: sessionAddress,
      session_key: sessionAddress,
      app_name: DEFAULT_APP_NAME,
      expire: String(expire),
      scope: DEFAULT_SCOPE,
      application: DEFAULT_APPLICATION,
      allowances: [],
    })

    const challengePromise = waitFor(RPCMethod.AuthChallenge)
    ws.send(authRequest)
    const challengeResponse = await challengePromise
    const challengePayload =
      challengeResponse?.params?.challengeMessage ||
      challengeResponse?.params?.challenge_message ||
      challengeResponse?.params ||
      challengeResponse

    const challengeId = typeof challengePayload === 'string'
      ? challengePayload
      : challengePayload?.challenge || challengePayload?.challenge_id || challengePayload?.challengeId

    if (!challengeId) {
      throw new Error('Auth challenge missing identifier')
    }

    const appName = String(challengePayload?.app_name ?? DEFAULT_APP_NAME)
    const scope = String(challengePayload?.scope ?? DEFAULT_SCOPE)
    const application = String(challengePayload?.application ?? DEFAULT_APPLICATION)
    const participant = String(challengePayload?.participant ?? challengePayload?.session_key ?? sessionAddress)
    const expireValue = String(challengePayload?.expire ?? expire)
    const allowancesRaw = Array.isArray(challengePayload?.allowances) ? challengePayload.allowances : []
    const allowances = allowancesRaw.map((entry) => ({
      asset: String(entry?.asset ?? ''),
      amount: String(entry?.amount ?? '0'),
    }))

    const authSigner = async (payload) => {
      const method = payload?.[1]
      if (method !== RPCMethod.AuthVerify) {
        throw new Error('Auth signer invoked for non-auth payload')
      }
      const params = payload?.[2] || {}
      const challengeValue = params.challenge
      if (typeof challengeValue !== 'string') {
        throw new Error('Auth payload missing challenge string')
      }
      const message = {
        scope,
        application,
        participant,
        expire: expireValue,
        allowances,
        challenge: challengeValue,
        wallet: sessionAddress,
      }
      return await account.signTypedData({
        domain: { name: appName },
        types: EIP712AuthTypes,
        primaryType: 'Policy',
        message,
      })
    }

    const authVerifyMessage = await createAuthVerifyMessageFromChallenge(authSigner, challengeId)
    const verifyPromise = waitFor(RPCMethod.AuthVerify)
    ws.send(authVerifyMessage)
    const verifyResponse = await verifyPromise
    const ok = Boolean(verifyResponse?.params?.success ?? verifyResponse?.params?.ok)
    if (!ok) {
      throw new Error('Authentication rejected by node')
    }
    console.log('[info] Authentication successful')
  }

  await authenticate()

  async function fetchLedgerBalance(participant) {
    const msg = await createGetLedgerBalancesMessage(signer, participant)
    const wait = waitFor(RPCMethod.GetLedgerBalances)
    ws.send(msg)
    const res = await wait
    const list = res?.params?.ledgerBalances ?? res?.params ?? []
    return Array.isArray(list) ? list : [list]
  }

  const brokerBalances = await fetchLedgerBalance(sessionAddress)
  const brokerAsset = brokerBalances.find((entry) => {
    const assetId = entry?.asset || `${entry?.chain_id ?? entry?.chainId}:${(entry?.token || entry?.address || '').toLowerCase()}`
    return assetId.toLowerCase() === `${config.chainId}:${config.tokenAddress}`.toLowerCase()
  })
  const brokerAmount = BigInt(brokerAsset?.amount ?? brokerAsset?.balance ?? 0)
  console.log(`[info] Broker ledger balance for ${config.chainId}:${config.tokenAddress} = ${brokerAmount}`)

  let assetId = config.assetOverride
  let decimals = config.decimals
  try {
  const msg = await createGetAssetsMessage(signer, config.chainId)
    const assetPromise = waitFor(RPCMethod.GetAssets)
    ws.send(msg)
    const assetsResponse = await assetPromise
    const payload = assetsResponse?.params?.assets ?? assetsResponse?.params ?? []
    const assets = toArray(payload)
    if (assets.length) {
      console.log(`[info] Node returned ${assets.length} asset(s) for chain ${config.chainId}`)
      assets.forEach((asset) => {
        const assetToken = (asset?.token || asset?.address || '').toLowerCase()
        const assetLabel = asset?.symbol || asset?.asset_symbol || ''
        const identifier = asset?.asset || `${asset?.chainId ?? config.chainId}:${assetToken}`
        console.log(`       • ${assetLabel || '(unknown symbol)'} -> ${identifier} (decimals ${asset?.decimals ?? '?'})`)
        if (!assetId && assetToken && assetToken === config.tokenAddress.toLowerCase()) {
          assetId = asset?.asset || identifier
          if (Number.isFinite(Number(asset?.decimals))) {
            decimals = Number(asset.decimals)
          }
        }
      })
    } else {
      console.warn('[warn] No assets reported by node; falling back to defaults')
    }
  } catch (err) {
    console.warn('[warn] Failed to fetch assets from node:', err.message || err)
  }

  if (!assetId) {
    assetId = `${config.chainId}:${config.tokenAddress}`
    console.log(`[info] Using fallback asset identifier ${assetId}`)
  }

  const amountUnits = config.unitsOverride ? BigInt(config.unitsOverride) : parseAmount(config.amountHuman, decimals)
  if (brokerAmount < amountUnits) {
    ws.close(1000)
    throw new Error(`Ledger balance too low (${brokerAmount}) for requested transfer of ${amountUnits}. Wait for the deposit watcher to credit the broker account.`)
  }
  const amountHuman = config.unitsOverride ? formatUnits(amountUnits, decimals) : config.amountHuman

  const targetDescriptor = config.destinationTag ? `tag ${config.destinationTag}` : `address ${config.destination}`
  console.log(`[info] Preparing transfer of ${amountHuman} ${decimals ? `(decimals ${decimals})` : ''}`)
  console.log(`[info] Asset identifier: ${assetId}`)
  console.log(`[info] Destination: ${targetDescriptor}`)

  const transferPayload = {
    allocations: [
      {
        asset: assetId,
        amount: amountUnits.toString(),
      },
    ],
  }

  if (config.destinationTag) {
    transferPayload.destination_user_tag = config.destinationTag
  } else {
    transferPayload.destination = config.destination
  }

  const transferMessage = await createTransferMessage(signer, transferPayload)
  const ackPromise = waitFor(RPCMethod.Transfer)
  ws.send(transferMessage)

  const ack = await ackPromise
  console.log('[info] Transfer accepted by node:')
  console.log(JSON.stringify(ack?.params ?? ack, null, 2))

  try {
    const notification = await waitFor(RPCMethod.TransferNotification, 5000)
    console.log('[info] Transfer notification received:')
    console.log(JSON.stringify(notification?.params ?? notification, null, 2))
  } catch (err) {
    console.log('[info] No transfer notification within 5s (this is safe to ignore if balances update later).')
  }

  ws.close(1000)
  await new Promise((resolve) => setTimeout(resolve, 250))
  console.log('[info] Done. Refresh the dApp balances to confirm the credit.')
}

main().catch((err) => {
  console.error('[fatal] Transfer script failed:', err.message || err)
  process.exit(1)
})
