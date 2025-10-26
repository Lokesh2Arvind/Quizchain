# QuizChain × Yellow Network Overview

QuizChain demonstrates how Yellow Network infrastructure can power high-frequency, real-time gaming experiences with crypto-native settlement. This document summarizes the problem we set out to solve, how Yellow streamlined the architecture, and what remains on the roadmap.

## The Problem
Traditional multiplayer trivia platforms struggle with three Web3-specific hurdles:
1. **Latency-sensitive gameplay:** questions, timers, and leaderboards must update instantly across all players.
2. **Trust-minimized custody:** prize pools need to be locked transparently before a match and released automatically when it ends.
3. **User-friendly onboarding:** new players should be able to grab test funds, authenticate, and manage channels without complex tooling.

## Yellow-Powered Solution
Yellow Network addresses each of these points in QuizChain:
- **Custody & Funding:** Players deposit ERC-20 assets to Yellow custody using the bundled `scripts/ledger-deposit.js`. The script approves tokens via viem and submits custody deposits without requiring Cerebro CLI.
- **Brokered Ledger Credits:** The `scripts/local-ledger-credit.js` helper credits unified ledger balances through a broker key. It handles auth challenges, balance checks, and transfer dispatch via Nitrolite’s RPC.
- **State Channel Connectivity:** The frontend’s `yellow-context.tsx` creates a session wallet, performs auth_request/auth_verify handshakes, and subscribes to balance and transaction updates in real time.
- **Seamless Authentication:** JWTs returned from `auth_verify` are cached for reconnections, avoiding repeated signature prompts during a demo.
- **Instant Payouts:** Once a match ends, the backend calls `processPayout` to pay the champion using a configured RPC provider (ETH or ERC-20). Missing credentials fall back to simulated receipts so the UX remains smooth.

## Integration Architecture
```
Player Wallet   ─▶  QuizChain Frontend (Next.js)  ─▶  Yellow Clearnode WS
                          │                           ▲
                          ▼                           │
                 QuizChain Backend (Socket.IO)   Ledger / Custody
                          │                           │
                          ▼                           │
                On-chain Payout (RPC Provider) ◀──────┘
```
Key interaction flow:
1. Player connects wallet → frontend probes backend → backend registers user.
2. Yellow faucet helper issues `auth_request`; player signs challenge via Metamask.
3. Backend starts game, fetches questions, and streams them via Socket.IO.
4. On `game:ended`, backend ranks players, triggers `processPayout`, and emits payout receipt.
5. Frontend renders the win banner, including tx hash or simulation notice.

## Yellow-Specific Learnings
- **Deposit Watcher Dependence:** Ledger balances remain zero until the Yellow watcher is running (not shipped in the default docker-compose). This surfaced quickly because the scripts include pre-transfer balance checks.
- **Portability:** Nitrolite’s helpers (`createAuthRequestMessage`, `createAuthVerifyMessage`, etc.) made it trivial to move from CLI-driven flows to programmatic calls within the app.
- **Developer Ergonomics:** By caching JWTs and logging positive confirmations, the demo remains approachable even during recorded walkthroughs.

## Remaining Enhancements
- Automate deployment of the Yellow deposit watcher alongside the stack.
- Persist JWT/session state in a backend cache to support multi-device logins.
- Extend payout logic to split pots among top-N players or handle rake fees.
- Surface ledger/channel history inside the UI (currently only logged to the console).

## Conclusion
Yellow enabled QuizChain to offer a “play, win, and get paid” experience without writing bespoke custody logic or sacrificing real-time responsiveness. The combination of Nitrolite RPC tooling, sandbox faucet flows, and flexible custody contracts condensed what would normally be weeks of infrastructure into a hackathon-friendly integration.
