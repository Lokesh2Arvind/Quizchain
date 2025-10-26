# QuizChain

QuizChain is a multiplayer quiz battle dApp that lets players stake tokens, compete in real-time trivia rounds, and collect instant payouts when the game ends. The project is composed of a Next.js + Wagmi frontend, an Express + Socket.IO game coordinator, and deep integration with Yellow Network for custody, ledger crediting, and state-channel messaging.

## Key Features
- ⚡ **Instant three-question matches** with live scoreboards and animated feedback.
- 🧠 **Dynamic question sourcing** from the Aptitude API (topics like Age, Profit & Loss, and more).
- 🛰️ **Yellow Network connectivity** for custody deposits, faucet credits, and authenticated WebSocket sessions.
- 💸 **On-chain prize settlement**: winner payouts are attempted immediately via configurable RPC credentials.
- 🔌 **Resilient dev experience**: backend auto-selects an open port; frontend discovers it at runtime.

## Repository Structure
```
Quizchain/
├── backend/                # Express + Socket.IO server
├── frontend/               # Next.js 14 (App Router) client
├── scripts/                # Yellow helper scripts (deposit/ledger credit)
├── README.md               # Usage guide (this file)
└── README-yellow.md        # Yellow-centric project overview
```

## Prerequisites
- Node.js **18.x or newer** (tested with v18 and v20)
- npm **9+** (or a compatible package manager such as pnpm)
- A browser wallet (RainbowKit defaults to Metamask)
- Optional: access to the Yellow Clearnode sandbox or a locally running Yellow stack

## 1. Install Dependencies
Install packages for both backend and frontend:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install --legacy-peer-deps
```
> The frontend currently uses React 19 RC; `--legacy-peer-deps` avoids peer-resolution conflicts with Wagmi.

## 2. Configure Environment Variables
### Frontend (`frontend/.env.local`)
Create a `.env.local` file and supply your Yellow and custody configuration:
```
NEXT_PUBLIC_CLEARNODE_URL=wss://clearnet-sandbox.yellow.com/ws
NEXT_PUBLIC_CUSTODY_ADDRESS=<custody_contract_address>
NEXT_PUBLIC_ADJUDICATOR_ADDRESS=<adjudicator_contract_address>
NEXT_PUBLIC_TOKEN_ADDRESS=<ytest_usd_token_address>
```
Optional extras (picked up by helper scripts):
```
BROKER_PRIVATE_KEY=<broker_key_from_yellow_stack>
TRANSFER_DESTINATION=<default_destination_address>
TRANSFER_TOKEN_ADDRESS=<token_address>
TRANSFER_CHAIN_ID=11155111
```

### Backend (`backend/.env`)
```
PORT=5000
FRONTEND_URL=http://localhost:3000
APTITUDE_API_BASE=https://aptitude-api.vercel.app

# Payout configuration (set to enable real transfers)
PAYOUT_RPC_URL=https://sepolia.infura.io/v3/<project_id>
PAYOUT_PRIVATE_KEY=<custody_or_escrow_private_key>
PAYOUT_NETWORK_NAME=Sepolia
PAYOUT_TOKEN_ADDRESS_USDC=<erc20_address>
PAYOUT_TOKEN_DECIMALS_USDC=6
```
If payout variables are omitted, the backend emits **simulated** receipts so the UI can still showcase the winning flow.

## 3. Run the Stack
In separate terminals:
```bash
# Backend (from Quizchain/)
cd backend
npm run dev

# Frontend (from Quizchain/ in another terminal)
cd frontend
npm run dev
```
- The backend listens on the first free port between `5000-5009` and prints the active port.
- The frontend auto-detects the backend by probing `/health` across those ports.

## 4. Playing a Match
1. Navigate to `http://localhost:3000`, connect your wallet, and (optionally) request test tokens through the in-app Yellow faucet helper.
2. Create or join a room. Each game currently runs **three questions**.
3. Once the host starts the match, watch the leaderboard update in real time and answer before the timer hits zero.
4. When the final rankings arrive, the UI surfaces the payout status (simulated or on-chain) and offers a **Leave Game** button to return to the lobby.

## 5. Yellow Helper Scripts
Located in `frontend/scripts/`:
- `ledger-deposit.js`: Approves and deposits ERC-20 funds into Yellow custody (uses `viem`).
- `local-ledger-credit.js`: Credits a ledger balance via broker private key when running a local Yellow stack.

Run them with `node`:
```bash
node scripts/ledger-deposit.js --rpc <rpc> --token <token> --amount 100
node scripts/local-ledger-credit.js --key <broker_key> --destination <session_addr> --amount 50
```
Use `--help` on each script for full option sets.

## 6. Troubleshooting
- **Frontend stuck on “Connecting to backend”** → ensure the backend console shows a listening port and that your wallet is connected (backend only resolves once a wallet address exists).
- **Sepolia RPC timeouts** → switch `PAYOUT_RPC_URL` or configure a higher-latency-tolerant provider; the UI still renders simulated payouts if the call fails.
- **Yellow authentication hangs** → confirm the Metamask EIP-712 signature prompt is accepted; the app stores the JWT in `localStorage` for re-use.
- **Question API misses** → the Aptitude API occasionally rate-limits; the backend logs warnings and continues with the questions that succeed.

## 7. Next Steps
- Deploy the backend behind a stable URL and set `NEXT_PUBLIC_BACKEND_URL` to skip port scanning.
- Swap the simulated payout mode for full on-chain settlements by funding the escrow key.
- Extend question categories or add custom quizzes by modifying `backend/services/questionService.js`.

---
For a deeper look at the problem statement and how Yellow Network powers the experience, read [`README-yellow.md`](./README-yellow.md).
