/**
 * walletConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central wallet configuration for TrustChain dApp.
 * Supports Pera Wallet + Lute Wallet via @txnlab/use-wallet-react.
 *
 * WalletConnect v2 projectId is optional – Pera has its own WC integration
 * internally, so we provide a fallback for apps that don't need a custom
 * WalletConnect entry.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NetworkId, WalletId, WalletManager, type SupportedWallet } from '@txnlab/use-wallet-react';

// ─── Network Configuration ───────────────────────────────────────────────────
export const ACTIVE_NETWORK: NetworkId =
    (process.env.NEXT_PUBLIC_ALGORAND_NETWORK as NetworkId) ?? NetworkId.TESTNET;

export const ALGOD_CONFIG: Record<string, { server: string; port: number; token: string }> = {
    [NetworkId.TESTNET]: {
        server: 'https://testnet-api.algonode.cloud',
        port: 443,
        token: '',
    },
    [NetworkId.MAINNET]: {
        server: 'https://mainnet-api.algonode.cloud',
        port: 443,
        token: '',
    },
};

// ─── Supported Wallet List ────────────────────────────────────────────────────
const supportedWallets: SupportedWallet[] = [
    // ① Pera Wallet – the original/default wallet for TrustChain
    WalletId.PERA,

    // ② Lute Wallet – browser-extension-based Algorand wallet
    { id: WalletId.LUTE, options: { siteName: "TrustChain" } },
];

// ─── WalletManager Singleton ──────────────────────────────────────────────────
// Create once at module level so that it is shared across the entire app.
// We must lazy-initialize this so it doesn't crash Next.js during SSR 
// because WalletManager relies on browser APIs (window, localStorage).

let _walletManager: WalletManager | null = null;

export function getWalletManager(): WalletManager {
    if (!_walletManager) {
        _walletManager = new WalletManager({
            wallets: supportedWallets,
            network: ACTIVE_NETWORK,
            algod: ALGOD_CONFIG[ACTIVE_NETWORK],
        });
    }
    return _walletManager;
}

// Keep the same export name for backwards compatibility with existing imports.
// During SSR, this will be null, but ClientOnly components can use it safely.
export const walletManager = typeof window !== 'undefined' ? getWalletManager() : (null as unknown as WalletManager);

// ─── Wallet Metadata ──────────────────────────────────────────────────────────
export const WALLET_METADATA: Record<string, { name: string; logo: string; description: string; accent: string }> = {
    [WalletId.PERA]: {
        name: 'Pera Wallet',
        logo: '/wallets/pera.svg',
        description: 'The most popular Algorand mobile wallet. Scan the QR code to connect via WalletConnect.',
        accent: '#00D09E',
    },
    [WalletId.LUTE]: {
        name: 'Lute Wallet',
        logo: '/wallets/lute.svg',
        description: 'A secure, browser-extension Algorand wallet for desktop users.',
        accent: '#5468FF',
    },
};
