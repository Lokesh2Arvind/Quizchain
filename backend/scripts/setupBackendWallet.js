/**
 * Backend Wallet Setup Guide
 * 
 * Your Backend Wallet: 0xBAa34F95388C8A68a2853D40b70be22e863bf3CD
 * 
 * BEFORE RUNNING GAMES WITH REAL PRIZES, YOU MUST:
 */

// ============================================
// STEP 1: Get Sepolia ETH (for gas)
// ============================================
// ✅ YOU ALREADY HAVE: 0.5 SEP ETH
// This is enough for ~2,500 prize distributions!
// 
// If you need more:
// Faucets:
// - https://sepoliafaucet.com/
// - https://www.alchemy.com/faucets/ethereum-sepolia

// ============================================
// STEP 2: Get Yellow Test USD
// ============================================
// Go to Yellow Network testnet faucet:
// https://clearnet-sandbox.yellow.com/faucet/requestTokens
// 
// Enter your backend wallet address:
// 0xBAa34F95388C8A68a2853D40b70be22e863bf3CD
// 
// You'll receive: 10 Test USD per request
// 
// Get enough for your games (e.g., 100 Test USD = 10 requests)

// ============================================
// STEP 3: Approve Custody Contract
// ============================================
// Yellow Test USD Token: 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb
// Custody Contract: 0xa3f2f64455c9f8D68d9dCAeC2605D64680FaF898
// 
// You need to approve custody to spend your Test USD.
// 
// Option A: Use Etherscan
// 1. Go to: https://sepolia.etherscan.io/address/0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb#writeContract
// 2. Connect your backend wallet (MetaMask/WalletConnect)
// 3. Find "approve" function
// 4. Enter:
//    - spender: 0xa3f2f64455c9f8D68d9dCAeC2605D64680FaF898
//    - amount: 100000000000000000000 (100 Test USD in wei)
// 5. Write transaction
// 
// Option B: Use this script (see below)

// ============================================
// STEP 4: Deposit to Custody Contract
// ============================================
// After approval, deposit Test USD into custody:
// 
// Option A: Use Etherscan
// 1. Go to: https://sepolia.etherscan.io/address/0xa3f2f64455c9f8D68d9dCAeC2605D64680FaF898#writeContract
// 2. Connect your backend wallet
// 3. Find "deposit" function
// 4. Enter:
//    - token: 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb
//    - amount: 100000000000000000000 (100 Test USD in wei)
// 5. Write transaction
// 
// Option B: Use this script (see below)

// ============================================
// AUTOMATED SETUP SCRIPT
// ============================================

const { ethers } = require('ethers');
const WebSocket = require('ws');
const { 
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createGetLedgerBalancesMessage,
  parseAnyRPCResponse,
  RPCMethod
} = require('@erc7824/nitrolite');

// Contract addresses
const TOKEN_ADDRESS = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb'; // Yellow Test USD
const CUSTODY_ADDRESS = '0xa3f2f64455c9f8D68d9dCAeC2605D64680FaF898'; // Custody Contract
const CLEARNODE_URL = 'wss://clearnet-sandbox.yellow.com/ws';

// Minimal ABI for checking on-chain balances
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)'
];

/**
 * Check Yellow Network ledger balance (off-chain)
 */
async function checkYellowLedgerBalance(walletAddress, privateKey) {
  return new Promise(async (resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL);
    let messageSigner = null;
    
    ws.on('open', async () => {
      try {
        console.log('🔌 Connected to Yellow Clearnode');
        
        // Create auth request
        const authParams = {
          participant: walletAddress,
          chainId: 11155111,
          stateAddress: walletAddress,
          adjudicatorAddress: '0x132C865E708D53A0e26E134157Ef08cb6cC41624'
        };
        
        const authRequest = await createAuthRequestMessage(authParams);
        ws.send(authRequest);
        console.log('🔐 Sent auth request...');
        
      } catch (error) {
        console.error('❌ Auth error:', error);
        ws.close();
        reject(error);
      }
    });
    
    ws.on('message', async (data) => {
      try {
        const message = data.toString();
        const parsed = parseAnyRPCResponse(message);
        
        if (parsed.method === RPCMethod.AUTH_CHALLENGE) {
          console.log('🔐 Received challenge, signing...');
          
          // Create message signer with private key
          const { Wallet } = require('ethers');
          const { createWalletClient, http } = require('viem');
          const { privateKeyToAccount } = require('viem/accounts');
          const { sepolia } = require('viem/chains');
          
          const account = privateKeyToAccount(privateKey);
          const walletClient = createWalletClient({
            account,
            chain: sepolia,
            transport: http()
          });
          
          messageSigner = createEIP712AuthMessageSigner(
            walletClient,
            {
              participant: walletAddress,
              chainId: 11155111,
              stateAddress: walletAddress,
              adjudicatorAddress: '0x132C865E708D53A0e26E134157Ef08cb6cC41624'
            },
            parsed.params.domain
          );
          
          const verifyMessage = await createAuthVerifyMessage(
            messageSigner,
            parsed.params
          );
          
          ws.send(verifyMessage);
          console.log('✅ Sent auth verification');
          
        } else if (parsed.method === RPCMethod.AUTH_VERIFY) {
          console.log('✅ Authenticated! Requesting balance...\n');
          
          // Request ledger balances
          const balanceMessage = await createGetLedgerBalancesMessage(
            messageSigner,
            walletAddress
          );
          ws.send(balanceMessage);
          
        } else if (parsed.method === RPCMethod.LEDGER_BALANCES) {
          console.log('📊 Yellow Network Ledger Balances:');
          console.log('═════════════════════════════════════════');
          
          if (parsed.params && parsed.params.length > 0) {
            let totalUSD = 0;
            parsed.params.forEach(balance => {
              // Yellow uses different balance structure
              const asset = balance.asset || balance.token || 'Unknown';
              const amount = balance.balance || balance.amount || '0';
              const amountNum = Number(amount) / 1e18;
              totalUSD += amountNum;
              console.log(`💰 ${asset}: ${amountNum} USD`);
            });
            
            console.log('═════════════════════════════════════════\n');
            
            if (totalUSD > 0) {
              ws.close();
              resolve([{ asset: 'ytest.usd', amount: (totalUSD * 1e18).toString() }]);
            } else {
              console.log('❌ No balances found in Yellow ledger\n');
              ws.close();
              resolve([]);
            }
          } else {
            console.log('❌ No balances found in Yellow ledger');
            console.log('═════════════════════════════════════════\n');
            ws.close();
            resolve([]);
          }
        }
        
      } catch (error) {
        // Don't log every parse error, some messages are not RPC responses
        if (error.message && !error.message.includes('Failed to parse')) {
          console.error('❌ Message handling error:', error.message);
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('👋 Disconnected from Yellow Clearnode\n');
    });
    
    setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for balance'));
    }, 30000);
  });
}

async function setupBackendWallet() {
  try {
    console.log('🔧 Setting up backend wallet for Yellow Network...\n');

    // Load environment from backend directory
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');
    require('dotenv').config({ path: envPath });
    
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY not found in .env');
    }

    // Connect to Sepolia
    // Using multiple RPC endpoints for reliability
    const rpcUrls = [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.gateway.tenderly.co',
      'https://rpc2.sepolia.org',
      'https://rpc.sepolia.org'
    ];
    
    let provider = null;
    for (const rpcUrl of rpcUrls) {
      try {
        console.log(`🔄 Trying RPC: ${rpcUrl}`);
        provider = new ethers.JsonRpcProvider(rpcUrl);
        // Test the connection
        await provider.getBlockNumber();
        console.log(`✅ Connected to Sepolia via ${rpcUrl}\n`);
        break;
      } catch (err) {
        console.log(`❌ Failed: ${err.message.substring(0, 50)}...`);
        continue;
      }
    }
    
    if (!provider) {
      throw new Error('Could not connect to any Sepolia RPC endpoint');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📍 Backend Wallet:', wallet.address);
    console.log('⛓️  Network: Sepolia Testnet\n');

    // Check Sepolia ETH balance (on-chain)
    const ethBalance = await provider.getBalance(wallet.address);
    console.log('💎 Sepolia ETH (on-chain):', ethers.formatEther(ethBalance), 'ETH');
    
    if (ethBalance === 0n) {
      console.log('⚠️  WARNING: No Sepolia ETH! Get some from faucet for gas fees.');
    }

    // Check on-chain ERC20 token balance (unlikely to have any)
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
    const tokenBalance = await token.balanceOf(wallet.address);
    console.log('🟡 Test USD (on-chain ERC20):', ethers.formatEther(tokenBalance), 'USD');
    console.log('\n🔄 Checking Yellow Network ledger (off-chain)...\n');

    // Check Yellow Network ledger balance (off-chain - this is where faucet sends!)
    try {
      const ledgerBalances = await checkYellowLedgerBalance(wallet.address, privateKey);
      
      if (ledgerBalances && ledgerBalances.length > 0) {
        const totalUSD = ledgerBalances.reduce((sum, b) => {
          return sum + (Number(b.amount) / 1e18);
        }, 0);
        
        console.log('✅ SUCCESS! You have Test USD in Yellow ledger!');
        console.log(`💪 Ready to distribute ${totalUSD} USD in prizes!\n`);
        console.log('═════════════════════════════════════════');
        console.log('📊 BACKEND WALLET STATUS');
        console.log('═════════════════════════════════════════');
        console.log('Address:', wallet.address);
        console.log('Sepolia ETH:', ethers.formatEther(ethBalance), 'ETH (for gas)');
        console.log('Yellow Ledger:', totalUSD, 'USD (for prizes)');
        console.log('═════════════════════════════════════════\n');
        console.log('✅ Backend is READY for prize distribution!\n');
      } else {
        console.log('❌ No Test USD found in Yellow ledger!');
        console.log('📝 Get Test USD from faucet:');
        console.log('\nRun this command multiple times:');
        console.log('Invoke-WebRequest -Uri "https://clearnet-sandbox.yellow.com/faucet/requestTokens" -Method POST -ContentType "application/json" -Body \'{"userAddress":"' + wallet.address + '"}\'');
      }
    } catch (yellowError) {
      console.error('❌ Error checking Yellow ledger:', yellowError.message);
      console.log('\nNote: Make sure you requested Test USD from the faucet first.');
    }
    
    if (tokenBalance === 0n) {
      console.log('\n❌ No Test USD in wallet!');
      console.log('📝 Get Test USD from faucet:');
      console.log('   https://clearnet-sandbox.yellow.com/faucet/requestTokens');
      console.log('   Enter address:', wallet.address);
      return;
    }

    // If no custody balance, offer to deposit
    if (custodyBalance === 0n) {
      console.log('💡 You have Test USD in wallet but not in custody.');
      console.log('   Custody holds funds for prize distribution.\n');
      
      // Check allowance
      const allowance = await token.allowance(wallet.address, CUSTODY_ADDRESS);
      console.log('🔓 Current allowance:', ethers.formatEther(allowance), 'USD');

      // Amount to deposit (all available Test USD)
      const amountToDeposit = tokenBalance;
      console.log(`\n📋 Plan: Deposit ${ethers.formatEther(amountToDeposit)} Test USD to custody`);

      // Approve if needed
      if (allowance < amountToDeposit) {
        console.log('\n1️⃣ Approving custody contract...');
        const approveTx = await token.approve(CUSTODY_ADDRESS, amountToDeposit);
        console.log('   TX:', approveTx.hash);
        console.log('   Waiting for confirmation...');
        await approveTx.wait();
        console.log('   ✅ Approved!');
      } else {
        console.log('✅ Already approved');
      }

      // Deposit
      console.log('\n2️⃣ Depositing to custody...');
      const custodyWithSigner = new ethers.Contract(CUSTODY_ADDRESS, CUSTODY_ABI, wallet);
      const depositTx = await custodyWithSigner.deposit(TOKEN_ADDRESS, amountToDeposit);
      console.log('   TX:', depositTx.hash);
      console.log('   Waiting for confirmation...');
      await depositTx.wait();
      console.log('   ✅ Deposited!');

      // Check new balance
      const newCustodyBalance = await custody.getBalance(wallet.address, TOKEN_ADDRESS);
      console.log('\n🎉 New custody balance:', ethers.formatEther(newCustodyBalance), 'USD');
      console.log('✅ Backend wallet is ready for prize distribution!\n');

    } else {
      console.log('✅ Backend wallet already has custody balance');
      console.log(`💪 Ready to distribute ${ethers.formatEther(custodyBalance)} USD in prizes!\n`);
    }

    // Summary
    console.log('═════════════════════════════════════════');
    console.log('📊 BACKEND WALLET STATUS');
    console.log('═════════════════════════════════════════');
    console.log('Address:', wallet.address);
    console.log('Sepolia ETH:', ethers.formatEther(ethBalance), 'ETH (for gas)');
    console.log('Test USD (wallet):', ethers.formatEther(tokenBalance), 'USD');
    console.log('Test USD (custody):', ethers.formatEther(custodyBalance), 'USD (for prizes)');
    console.log('═════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  setupBackendWallet();
}

module.exports = { setupBackendWallet };
