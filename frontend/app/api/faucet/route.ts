import { NextRequest } from 'next/server'

const FAUCET_URL = process.env.NEXT_PUBLIC_YELLOW_FAUCET_URL || 'https://clearnet-sandbox.yellow.com/faucet/requestTokens'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body?.userAddress || typeof body.userAddress !== 'string') {
      return new Response(JSON.stringify({ error: 'userAddress required' }), { status: 400 })
    }
    const res = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: body.userAddress }),
      // no-cache to avoid any proxies caching faucet responses
      cache: 'no-store',
    })
    const text = await res.text()
    // Best-effort JSON parse, fallback to text
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    return new Response(JSON.stringify(data), { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Faucet proxy failed' }), { status: 500 })
  }
}
