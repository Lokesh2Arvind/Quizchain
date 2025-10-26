# 💰 Backend Wallet Setup for Prize Distribution

## Your Backend Wallet
**Address:** `0xBAa34F95388C8A68a2853D40b70be22e863bf3CD`

---

## ✅ Current Status
- **Sepolia ETH:** 0.5 ETH (Perfect! ✅)
- **Test USD in Custody:** ❓ Unknown (Need to check)

---

## 🎯 What You Need

### 1. Sepolia ETH (for gas fees)
✅ **You already have 0.5 ETH - this is plenty!**

**Gas Cost per Prize:**
- ~0.0001 ETH per withdrawal
- 0.5 ETH = **~5,000 prize distributions**

### 2. Test USD in Custody Contract
❌ **This is what you need to set up!**

The custody contract **holds the prize pool** that backend distributes to winners.

**Example:**
- You deposit 100 Test USD to custody
- Backend can distribute up to 100 USD in prizes
- Each game with 2 players at 1 USD entry = 2 USD prize
- You can run 50 games before needing to refill

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Test USD
Go to Yellow Network faucet:
```
https://clearnet-sandbox.yellow.com/faucet/requestTokens
```

Enter your backend wallet:
```
0xBAa34F95388C8A68a2853D40b70be22e863bf3CD
```

Each request gives **10 Test USD**. Request multiple times for more!

### Step 2: Run Setup Script
```bash
cd backend
node scripts/setupBackendWallet.js
```

This script will:
1. Check your balances
2. Approve custody contract automatically
3. Deposit all Test USD to custody
4. Show you the final status

### Step 3: Verify
The script output will show:
```
✅ Backend wallet is ready for prize distribution!
Test USD (custody): 100 USD (for prizes)
```

---

## 🎮 Game Example

### Setup:
- Backend custody balance: **100 Test USD**
- Entry fee: **1 USD per player**
- Players: **2**

### What Happens:
1. **2 players join** (backend checks they each have ≥1 USD in custody)
2. **Game plays** (prize pool = 2 USD)
3. **Winner determined**
4. **Backend calls:** `distributePrize(winner, 2 USD)`
   - Withdraws 2 USD from backend's custody
   - Sends to winner's wallet
   - **Gas paid:** ~0.0001 ETH from backend's 0.5 ETH
5. **New backend custody balance:** 98 USD (100 - 2)

### After 50 games:
- Backend custody: 0 USD (100 - 50×2)
- Backend SEP ETH: ~0.495 ETH (0.5 - 50×0.0001)
- Need to refill Test USD from faucet!

---

## 📊 Monitoring Backend Funds

Add this to your backend to monitor:

```javascript
// In yellowService.js
async getBackendStatus() {
  const custodyBalance = await this.getCustodyBalance(this.backendWallet.address);
  const ethBalance = await this.publicClient.getBalance({ 
    address: this.backendWallet.address 
  });
  
  return {
    address: this.backendWallet.address,
    sepETH: ethers.formatEther(ethBalance),
    custodyUSD: Number(custodyBalance) / 1e18,
    canDistribute: custodyBalance > 0n
  };
}
```

---

## ⚠️ Important Notes

### Prize Distribution Fails If:
❌ Backend custody balance < prize amount
✅ Backend Sepolia ETH > 0 (for gas)

### Solution:
**Get more Test USD from faucet and deposit to custody!**

### Users Don't Need Custody Balance?
**Correction:** Users **DO** need custody balance for entry fees!

**Full Flow:**
1. **Users get Test USD** from faucet
2. **Users deposit to custody** (manual or via frontend UI)
3. **Users join game** (backend checks custody balance ≥ entry fee)
4. **Game plays**
5. **Backend distributes prize** from its custody to winner

---

## 🔧 Manual Setup (Without Script)

### Via Etherscan:

**1. Approve Custody Contract:**
- Go to: https://sepolia.etherscan.io/address/0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb#writeContract
- Connect backend wallet
- Call `approve`:
  - spender: `0xa3f2f64455c9f8D68d9dCAeC2605D64680FaF898`
  - amount: `100000000000000000000` (100 USD in wei)

**2. Deposit to Custody:**
- Go to: https://sepolia.etherscan.io/address/0xa3f2f64455c9f8D68d9dCAeC2605D64680FaF898#writeContract
- Connect backend wallet
- Call `deposit`:
  - token: `0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb`
  - amount: `100000000000000000000` (100 USD in wei)

---

## 📞 Quick Commands

```bash
# Check backend wallet status
node scripts/setupBackendWallet.js

# Start backend (after setup)
npm run dev
```

---

## ✅ You're Ready When:

```
✅ Backend wallet: 0xBAa34F95388C8A68a2853D40b70be22e863bf3CD
✅ Sepolia ETH: 0.5 ETH (for gas) ✅ YOU HAVE THIS
✅ Test USD in custody: > 0 USD (for prizes) ❓ RUN SETUP SCRIPT
✅ Backend running with Yellow connected ✅ WORKING
```

**Then you can play games with REAL prize distribution!** 🏆
