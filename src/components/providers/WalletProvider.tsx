'use client';

/**
 * WalletProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified wallet provider for TrustChain — supports Pera Wallet and Lute
 * Wallet through @txnlab/use-wallet-react with full backward compatibility.
 *
 * Context exposes:
 *   address, balance, isConnected, isBanned, isAdminSession, walletFlags
 *   connect()         – opens the WalletConnectModal
 *   disconnect()      – disconnects active wallet / signs out admin
 *   signTransactions  – wallet-agnostic signing callback
 *   walletType        – 'pera' | 'lute' | 'unknown' | null
 *   walletName        – display name of the active wallet
 *
 * Legacy fields still exposed for backward compatibility:
 *   peraWallet        – always null (removed); callers should use signTransactions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    useWallet as useLibWallet,
    WalletProvider as LibWalletProvider,
} from '@txnlab/use-wallet-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { algodClient } from '@/lib/algorand';
import { walletManager } from '@/lib/walletConfig';
import { detectWalletType, walletTypeName, parseWalletError, type DetectedWalletType } from '@/lib/walletUtils';
import type { UniversalSignFn } from '@/lib/algorandService';
import algosdk from 'algosdk';

// ─── Context Type ──────────────────────────────────────────────────────────────
interface WalletContextType {
    address: string | null;
    balance: number | null;
    isConnected: boolean;
    isBanned: boolean;
    isAdminSession: boolean;
    walletFlags: any[];
    walletType: DetectedWalletType;
    walletName: string;
    /** Opens the wallet selection modal */
    connect: () => void;
    disconnect: () => Promise<void>;
    /** Wallet-agnostic transaction signing — pass to all algorandService functions */
    signTransactions: UniversalSignFn;
    /** @deprecated Legacy field — always null. Use signTransactions instead. */
    peraWallet: null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ─── Inner Provider (accesses use-wallet hooks) ────────────────────────────────
const InnerWalletProvider = ({ children }: { children: React.ReactNode }) => {
    // Access the use-wallet library hooks under an aliased name to avoid conflicts
    const {
        wallets,
        activeWallet,
        activeAddress,
        signTransactions: libSignTransactions,
    } = useLibWallet();

    const [balance, setBalance] = useState<number | null>(null);
    const [isBanned, setIsBanned] = useState(false);
    const [isAdminSession, setIsAdminSession] = useState(false);
    const [walletFlags, setWalletFlags] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    const isConnected = !!activeAddress;
    const walletType = detectWalletType(activeWallet?.id ?? null);
    const walletName = walletTypeName(walletType);

    // ── Balance Fetching ────────────────────────────────────────────────────────
    const fetchBalance = useCallback(async (addr: string) => {
        try {
            const info = await algodClient.accountInformation(addr).do();
            setBalance(Number(info.amount) / 1_000_000);
        } catch {
            setBalance(null);
        }
    }, []);

    // ── Security Checks ─────────────────────────────────────────────────────────
    const checkWalletSecurity = useCallback(async (addr: string) => {
        try {
            const q = query(collection(db, 'wallet_flags'), where('wallet_address', '==', addr));
            const snap = await getDocs(q);
            const flags = snap.docs.map(d => d.data());
            setWalletFlags(flags);
            const now = new Date();
            const banned = flags.some(f =>
                f.flag_type === 'permanent_ban' ||
                (f.flag_type === 'temporary_ban' &&
                    (!f.expires_at || (typeof f.expires_at.toDate === 'function' && f.expires_at.toDate() > now)))
            );
            setIsBanned(banned);
        } catch {
            setWalletFlags([]);
            setIsBanned(false);
        }
    }, []);

    const checkAdminSession = useCallback(async (uid: string) => {
        try {
            const adminDoc = await getDoc(doc(db, 'admins', uid));
            if (adminDoc.exists()) {
                setIsAdminSession(true);
                if (activeWallet) {
                    await activeWallet.disconnect();
                }
            } else {
                setIsAdminSession(false);
            }
        } catch {
            setIsAdminSession(false);
        }
    }, [activeWallet]);

    // ── Firebase Auth Listener ───────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => {
            if (user) checkAdminSession(user.uid);
            else setIsAdminSession(false);
        });
        return () => unsub();
    }, [checkAdminSession]);

    // ── React to address changes ─────────────────────────────────────────────────
    useEffect(() => {
        if (activeAddress) {
            fetchBalance(activeAddress);
            checkWalletSecurity(activeAddress);
        } else {
            setBalance(null);
            setIsBanned(false);
            setWalletFlags([]);
        }
    }, [activeAddress, fetchBalance, checkWalletSecurity]);

    // ── Connect / Disconnect ─────────────────────────────────────────────────────
    const connect = useCallback(() => {
        if (isAdminSession) {
            alert('Security Violation: Administrators cannot connect wallets or interact on-chain.');
            return;
        }
        setShowModal(true);
    }, [isAdminSession]);

    const disconnect = useCallback(async () => {
        if (activeWallet) {
            try { await activeWallet.disconnect(); } catch { /* ignore */ }
        }
        setBalance(null);
        setIsBanned(false);
        setWalletFlags([]);
        if (isAdminSession) {
            await signOut(auth);
            setIsAdminSession(false);
        }
    }, [activeWallet, isAdminSession]);

    // ── Universal Signing ────────────────────────────────────────────────────────
    const signTransactions: UniversalSignFn = useCallback(
        async (txnGroup: algosdk.Transaction[] | Uint8Array[], indexesToSign?: number[]) => {
            if (!activeWallet) throw new Error('No wallet connected');
            return libSignTransactions(txnGroup, indexesToSign);
        },
        [activeWallet, libSignTransactions]
    );

    return (
        <WalletContext.Provider
            value={{
                address: activeAddress ?? null,
                balance,
                isConnected,
                isBanned,
                isAdminSession,
                walletFlags,
                walletType,
                walletName,
                connect,
                disconnect,
                signTransactions,
                peraWallet: null,
            }}
        >
            {children}

            {/* ── Wallet Selection Modal ─────────────────────────────────────── */}
            {showModal && (
                <WalletSelectModal
                    wallets={wallets}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* ── Banned Wallet Overlay ─────────────────────────────────────── */}
            {isBanned && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
                    <div className="max-w-md">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
                            <span className="text-4xl font-black">!</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4 uppercase">Wallet Suspended</h2>
                        <p className="text-red-400 font-mono text-sm mb-8">{activeAddress}</p>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            This wallet has been flagged for violating TrustChain protocol terms.
                            All outgoing administrative actions have been restricted.
                        </p>
                        <button onClick={disconnect} className="btn-secondary w-full py-4 bg-slate-100 text-black border-none hover:bg-white">
                            Disconnect Restricted Wallet
                        </button>
                    </div>
                </div>
            )}

            {/* ── Warning Toast ──────────────────────────────────────────────── */}
            {walletFlags.some(f => f.flag_type === 'warning' && !isBanned) && (
                <div className="fixed bottom-6 right-6 z-50 animate-bounce">
                    <div className="bg-orange-500 text-black px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-orange-500/20 border-2 border-orange-400">
                        <span className="text-xl">⚠️</span>
                        <span>TrustChain Warning: Your wallet has active flags.</span>
                    </div>
                </div>
            )}
        </WalletContext.Provider>
    );
};

// ─── Wallet Selection Modal ────────────────────────────────────────────────────
interface WalletSelectModalProps {
    wallets: any[];
    onClose: () => void;
}

const WALLET_UI: Record<string, { name: string; logo: string; accent: string; tagline: string }> = {
    pera: {
        name: 'Pera Wallet',
        logo: '/wallets/pera.svg',
        accent: '#00D09E',
        tagline: 'Mobile wallet via QR code',
    },
    lute: {
        name: 'Lute Wallet',
        logo: '/wallets/lute.svg',
        accent: '#5468FF',
        tagline: 'Browser extension wallet',
    },
};

function WalletSelectModal({ wallets, onClose }: WalletSelectModalProps) {
    const [connecting, setConnecting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async (wallet: any) => {
        setConnecting(wallet.id);
        setError(null);
        try {
            await wallet.connect();
            onClose();
        } catch (err) {
            setError(parseWalletError(err));
        } finally {
            setConnecting(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)' }}
        >
            {/* Backdrop close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div
                className="relative w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)' }}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-white/5">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Connect Wallet</h2>
                        <p className="text-slate-400 text-sm mt-1">Choose your Algorand wallet to continue</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        aria-label="Close"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Wallet List */}
                <div className="px-6 py-6 space-y-3">
                    {wallets.map((wallet) => {
                        const ui = WALLET_UI[wallet.id] ?? {
                            name: wallet.metadata?.name ?? wallet.id,
                            logo: '',
                            accent: '#3B82F6',
                            tagline: 'Algorand wallet',
                        };
                        const isLoading = connecting === wallet.id;

                        return (
                            <button
                                key={wallet.id}
                                id={`wallet-connect-${wallet.id}`}
                                onClick={() => handleConnect(wallet)}
                                disabled={!!connecting}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderColor: 'rgba(255,255,255,0.08)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = `${ui.accent}15`;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${ui.accent}40`;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                                }}
                            >
                                {/* Logo */}
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
                                    style={{ background: `${ui.accent}20` }}
                                >
                                    {ui.logo ? (
                                        <img src={ui.logo} alt={ui.name} width={32} height={32} />
                                    ) : (
                                        <span className="text-xl font-bold" style={{ color: ui.accent }}>
                                            {ui.name[0]}
                                        </span>
                                    )}
                                </div>

                                {/* Labels */}
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-white text-base">{ui.name}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{ui.tagline}</p>
                                </div>

                                {/* Status / Arrow */}
                                <div className="shrink-0">
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg
                                            width="20" height="20" viewBox="0 0 20 20" fill="none"
                                            className="text-slate-600 group-hover:text-white transition-colors"
                                        >
                                            <path d="M7 10h6M10 7l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 pb-6">
                    <p className="text-center text-slate-600 text-xs">
                        By connecting, you agree to TrustChain&apos;s terms of service.
                        TrustChain never stores your private keys.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Outer Provider (injects WalletManager) ────────────────────────────────────
export const WalletProvider = ({ children }: { children: React.ReactNode }) => (
    <LibWalletProvider manager={walletManager}>
        <InnerWalletProvider>{children}</InnerWalletProvider>
    </LibWalletProvider>
);

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useWalletContext = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error('useWalletContext must be used within WalletProvider');
    return context;
};

/**
 * Backward-compatible alias — all existing pages that call useWallet() continue
 * to work without modification.
 */
export const useWallet = useWalletContext;
