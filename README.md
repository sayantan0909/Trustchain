# Trustchain

![Trustchain](https://trustchain-lilac.vercel.app/og-image.png) <!-- Update with an actual image if you have one -->

> **Live Demo:** [https://trustchain-lilac.vercel.app](https://trustchain-lilac.vercel.app)

Trustchain is a secure, decentralized escrow platform built on the **Algorand** blockchain. It bridges the gap of trust between freelancers and clients by utilizing smart contracts to hold funds and release them based on mutually approved milestones.

## 🌟 Key Features

- **Decentralized Escrow:** Funds are securely locked in an Algorand smart contract until milestones are approved.
- **Two-Wallet Flow:** Distinct dashboard and actions for **Clients** (who deploy and fund the escrow) and **Freelancers** (who submit work and receive funds).
- **Milestone-Based Payments:** Break down large projects into manageable milestones. Clients approve work and release funds incrementally.
- **Wallet Integration:** Seamless connection with Pera Wallet, Defly Wallet, and more via `@txnlab/use-wallet-react`.
- **Modern UI/UX:** A stunning, responsive interface built with Tailwind CSS, Framer Motion, and Three.js for interactive landing page animations.

## 🛠️ Tech Stack

- **Frontend Framework:** [Next.js](https://nextjs.org/) (React 19)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/) & [Three.js](https://threejs.org/)
- **Blockchain SDK:** `algosdk` & `@txnlab/use-wallet-react`
- **Backend / Database:** Firebase
- **Testing:** Jest

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/trustchain.git
   cd trustchain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables. Create a `.env.local` file in the root directory and add the necessary Firebase and Algorand keys:
   ```env
   # Add your Firebase Config
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   
   # Add Algorand Node Config (Testnet/Mainnet)
   # ...
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

To run the unit tests (requires `jest` and mocking of `algosdk`):
```bash
npm test
```

## 🐛 Troubleshooting

### Smart Contract Assertion Failure (pc=165)
If you encounter a `logic eval error: assert failed pc=165` during escrow approval, it indicates the transaction preconditions are not met:
- **Missing Freelancer Address:** Ensure the `freelancer_wallet` address is correctly populated in the `accounts` array of the application call transaction.
- **Invalid Sender:** Only the designated **Client** can approve the milestone `(Sender == Client)`.

## 📄 License

This project is licensed under the MIT License.
