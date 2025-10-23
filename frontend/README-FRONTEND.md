# QuizChain Frontend - Blockchain Quiz Game

A decentralized quiz gaming platform built with Next.js and Yellow SDK, enabling users to compete in real-time quizzes for crypto prizes.

## Features

- 🎮 **Real-time Quiz Gaming**: Join scheduled quizzes and compete with other players
- 💰 **Crypto Prizes**: Win USDC tokens from prize pools
- ⚡ **Instant Transactions**: Powered by Yellow SDK's off-chain state channels
- 🔗 **Multi-Chain Support**: Works across multiple blockchain networks
- 👛 **Wallet Integration**: Connect with MetaMask and other Web3 wallets
- 🏆 **Leaderboards**: Track your performance and rankings

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Blockchain**: Yellow SDK, Wagmi, RainbowKit
- **Styling**: Tailwind CSS v4 with custom animations
- **State Management**: React Context API

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Web3 wallet (MetaMask recommended)
- A WalletConnect Project ID (get from [WalletConnect Cloud](https://cloud.walletconnect.com))

### Installation

1. Navigate to the frontend directory:
\`\`\`bash
cd frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Copy environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Update \`.env.local\` with your configuration:
   - Add your WalletConnect Project ID
   - Configure Yellow Network endpoints
   - Set contract addresses for your target network

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

\`\`\`
frontend/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles and Tailwind CSS
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx          # Home page
│   └── providers.tsx      # Web3 and Yellow SDK providers
├── src/
│   ├── components/        # Reusable React components
│   │   ├── QuizLobby.tsx # Quiz selection and countdown
│   │   ├── QuizGame.tsx  # Quiz gameplay interface
│   │   └── QuizResults.tsx # Results and prize withdrawal
│   ├── lib/              # Utility libraries
│   │   ├── utils.ts      # Helper functions
│   │   └── yellow-context.tsx # Yellow SDK integration
│   └── types/            # TypeScript type definitions
│       └── index.ts      # Shared interfaces and types
├── public/               # Static assets
├── .env.example         # Environment variables template
├── .env.local          # Your environment variables
├── package.json        # Dependencies and scripts
├── next.config.ts      # Next.js configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json      # TypeScript configuration
\`\`\`

## How It Works

### 1. Quiz Lobby
- Browse available scheduled quizzes
- See countdown timers, prize pools, and entry fees
- Join quizzes before they start

### 2. Quiz Gameplay
- Answer multiple-choice questions within time limits
- Real-time progress tracking and scoring
- Automatic progression through questions

### 3. Results & Prizes
- View final scores and rankings
- Winners can withdraw crypto prizes
- Review correct answers and explanations

### 4. Yellow SDK Integration
- Off-chain state channels for instant transactions
- Multi-party session management for quiz coordination
- Cross-chain token deposits and withdrawals

## Environment Variables

Set these in your \`.env.local\` file:

\`\`\`env
# Yellow SDK Configuration
NEXT_PUBLIC_CLEARNODE_URL=wss://testnet.clearnet.yellow.com/ws
NEXT_PUBLIC_CUSTODY_ADDRESS=your_custody_contract_address
NEXT_PUBLIC_ADJUDICATOR_ADDRESS=your_adjudicator_contract_address
NEXT_PUBLIC_TOKEN_ADDRESS=your_token_contract_address
NEXT_PUBLIC_CHAIN_ID=80001

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Application Configuration
NEXT_PUBLIC_APP_NAME=QuizChain
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Quiz Gaming Platform
\`\`\`

## Key Components

### YellowProvider (\`src/lib/yellow-context.tsx\`)
- Manages Yellow SDK connection and state
- Handles WebSocket communication with ClearNode
- Provides session management functions

### QuizLobby (\`src/components/QuizLobby.tsx\`)
- Lists available quizzes with real-time countdowns
- Shows prize pools, entry fees, and participant counts
- Handles quiz joining functionality

### QuizGame (\`src/components/QuizGame.tsx\`)
- Interactive quiz gameplay interface
- Real-time timer and question progression
- Answer selection and validation

### QuizResults (\`src/components/QuizResults.tsx\`)
- Displays final scores and rankings
- Prize withdrawal interface
- Answer review functionality

## Customization

### Adding New Quiz Types
1. Extend the \`Quiz\` interface in \`src/types/index.ts\`
2. Update quiz creation logic
3. Modify scoring algorithms as needed

### Styling Changes
1. Edit Tailwind classes in components
2. Add custom CSS animations in \`app/globals.css\`
3. Configure theme colors in \`tailwind.config.js\`

### Network Configuration
1. Update chain configurations in \`app/providers.tsx\`
2. Add new network endpoints
3. Configure contract addresses for new networks

## Development

### Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run lint\` - Run ESLint

### Mock Data

The application currently uses mock quiz data for development. Real quiz data will be fetched from the backend API when available.

## Deployment

### Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check network configuration
   - Verify WalletConnect Project ID

2. **Yellow SDK Connection**
   - Verify ClearNode URL is correct
   - Check network connectivity
   - Ensure contract addresses are valid

3. **Build Errors**
   - Run \`npm install\` to ensure all dependencies are installed
   - Check TypeScript errors with \`npm run lint\`
   - Verify environment variables are set

## Next Steps

- [ ] Connect to real backend API
- [ ] Implement real Yellow SDK session management
- [ ] Add user authentication
- [ ] Implement real-time multiplayer features
- [ ] Add mobile responsiveness
- [ ] Deploy to production

## Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit your changes: \`git commit -m 'Add amazing feature'\`
4. Push to the branch: \`git push origin feature/amazing-feature\`
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

- 📖 [Yellow SDK Documentation](https://docs.yellow.org)
- 💬 Community Discord
- 🐛 GitHub Issues
- 📧 Contact Support

---

Built with ❤️ using Yellow SDK for the decentralized future of gaming!