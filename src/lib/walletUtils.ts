/**
 * walletUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility helpers for wallet state management, type detection, and address
 * formatting that are wallet-agnostic (work with both Pera and Lute).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { WalletId } from '@txnlab/use-wallet-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DetectedWalletType = 'pera' | 'lute' | 'unknown' | null;

export interface WalletInfo {
    type: DetectedWalletType;
    name: string;
    address: string | null;
    shortAddress: string | null;
}

// ─── Address Formatting ───────────────────────────────────────────────────────
export function formatAddress(address: string | null | undefined, start = 6, end = 4): string {
    if (!address) return '';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// ─── Wallet Type Detection ────────────────────────────────────────────────────
/**
 * Detect wallet type from the wallet ID string returned by use-wallet.
 */
export function detectWalletType(walletId: string | null | undefined): DetectedWalletType {
    if (!walletId) return null;
    if (walletId === WalletId.PERA) return 'pera';
    if (walletId === WalletId.LUTE) return 'lute';
    return 'unknown';
}

/**
 * Returns display name for a wallet type.
 */
export function walletTypeName(type: DetectedWalletType): string {
    switch (type) {
        case 'pera': return 'Pera Wallet';
        case 'lute': return 'Lute Wallet';
        case 'unknown': return 'Unknown Wallet';
        default: return '';
    }
}

/**
 * Returns accent color hex for a wallet type (useful for UI theming).
 */
export function walletAccentColor(type: DetectedWalletType): string {
    switch (type) {
        case 'pera': return '#00D09E';
        case 'lute': return '#5468FF';
        default: return '#3B82F6';
    }
}

// ─── Error Parsing ────────────────────────────────────────────────────────────
/**
 * Convert any wallet connection/signing error to a human-readable string.
 */
export function parseWalletError(error: unknown): string {
    if (!error) return 'Unknown wallet error';
    if (typeof error === 'string') return error;
    if (error instanceof Error) {
        // Pera / WalletConnect common codes
        if (error.message?.includes('User rejected')) return 'Connection rejected by user.';
        if (error.message?.includes('Session disconnected')) return 'Wallet session disconnected.';
        if (error.message?.includes('Lute Wallet is not installed'))
            return 'Lute Wallet extension is not installed. Please install it from the Chrome Web Store.';
        return error.message;
    }
    return JSON.stringify(error);
}

// ─── Transaction Signing Validation ──────────────────────────────────────────
/**
 * Validate that the active wallet can sign for a given address.
 */
export function canSignForAddress(
    activeAddresses: string[] | null,
    targetAddress: string
): boolean {
    return activeAddresses?.includes(targetAddress) ?? false;
}
