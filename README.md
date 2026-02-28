# TrustChain

A decentralized milestone-based escrow platform on Algorand TestNet.

## Features
- **Smart Contract Escrow**: Funds are secured on-chain using PyTeal logic.
- **Milestone-Based**: Release payments only when project goals are achieved.
- **Pera Wallet Integration**: Secure transaction signing.
- **Supabase Backend**: Fast metadata storage and user authentication.
- **Premium UI**: Glassmorphic dark theme built with Tailwind CSS.

## Setup Instructions

### 1. Smart Contract
The contract is written in PyTeal and already compiled to TEAL.
- Source: `src/contracts/escrow.py`
- Approval: `escrow_approval.teal`
- Clear: `escrow_clear.teal`

### 2. Supabase Setup
- Create a new project on [Supabase](https://supabase.com).
- Run the SQL in `src/supabase/schema.sql` in the SQL Editor.
- Copy your `Project URL` and `Anon Key` to `.env.local`:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  ```

### 3. Frontend Setup
```bash
npm install
npm run dev
```

## How it Works
1. **Create Project**: Client defines milestones and freelancer address.
2. **Deploy & Fund**: Client deploys the smart contract and transfers total ALGO to the app account.
3. **Work**: Freelancer performs the work.
4. **Approve**: Client approves a milestone, triggering an on-chain payout from the escrow to the freelancer.
5. **Refund**: Client can reclaim unused funds if the project is deleted or disputed.

## Tech Stack
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Supabase** (DB & Auth)
- **Algorand** (PyTeal, algosdk)
- **Pera Wallet**
