'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { algodClient } from '@/lib/algorand';

interface WalletContextType {
    address: string | null;
    balance: number | null;
    isConnected: boolean;
    isBanned: boolean;
    isAdminSession: boolean;
    walletFlags: any[];
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    peraWallet: PeraWalletConnect;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [isBanned, setIsBanned] = useState(false);
    const [isAdminSession, setIsAdminSession] = useState(false);
    const [walletFlags, setWalletFlags] = useState<any[]>([]);
    const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
    const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);


    useEffect(() => {
        const wallet = new PeraWalletConnect();
        setPeraWallet(wallet);

        // Firebase Auth listener for admins
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                checkAdminSession(user.uid);
            } else {
                setIsAdminSession(false);
            }
        });

        wallet.reconnectSession().then((accounts) => {
            setConnectedAccounts(accounts);
            if (accounts.length > 0) {
                setAddress(accounts[0]);
                fetchBalance(accounts[0]);
                checkWalletSecurity(accounts[0]);
            }

            wallet.connector?.on('disconnect', () => {
                setAddress(null);
                setBalance(null);
                setConnectedAccounts([]);
                setIsBanned(false);
                setWalletFlags([]);
            });
        });

        return () => {
            unsubscribeAuth();
        };
    }, []);

    useEffect(() => {
        if (connectedAccounts.length > 0) {
            const currentAddress = connectedAccounts[0];
            setAddress(currentAddress);
            checkWalletSecurity(currentAddress);
            fetchBalance(currentAddress);
        } else {
            setAddress(null);
            setBalance(null);
            setIsBanned(false);
            setWalletFlags([]);
        }
    }, [connectedAccounts]);

    const fetchBalance = async (addr: string) => {
        try {
            const accountInfo = await algodClient.accountInformation(addr).do();
            setBalance(Number(accountInfo.amount) / 1_000_000); // Convert microAlgos to ALGO
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            setBalance(null);
        }
    };

    const checkAdminSession = async (uid: string) => {
        try {
            const adminDoc = await getDoc(doc(db, 'admins', uid));
            if (adminDoc.exists()) {
                setIsAdminSession(true);
                // Strictly disconnect wallet if an admin session is detected
                if (connectedAccounts.length > 0) {
                    disconnect();
                }
            } else {
                setIsAdminSession(false);
            }
        } catch (error) {
            console.error("Error checking admin session:", error);
            setIsAdminSession(false);
        }
    };

    const checkWalletSecurity = async (addr: string) => {
        try {
            const q = query(collection(db, 'wallet_flags'), where('wallet_address', '==', addr));
            const querySnapshot = await getDocs(q);
            const flags = querySnapshot.docs.map(doc => doc.data());

            setWalletFlags(flags);
            const now = new Date();
            const banned = flags.some(f =>
                (f.flag_type === 'permanent_ban') ||
                (f.flag_type === 'temporary_ban' && (!f.expires_at || (f.expires_at && typeof f.expires_at.toDate === 'function' && f.expires_at.toDate() > now)))
            );
            setIsBanned(banned);
        } catch (error) {
            console.error("Error checking wallet security:", error);
            setWalletFlags([]);
            setIsBanned(false);
        }
    };

    const connect = async () => {
        if (!peraWallet) return;
        if (isAdminSession) {
            alert("Security Violation: Administrators cannot connect wallets or interact on-chain.");
            return;
        }
        try {
            const newAccounts = await peraWallet.connect();
            setConnectedAccounts(newAccounts);
            setAddress(newAccounts[0]);
            fetchBalance(newAccounts[0]);
            checkWalletSecurity(newAccounts[0]);
        } catch (error) {
            console.error('Failed to connect to Pera Wallet:', error);
        }
    };

    const disconnect = async () => {
        await peraWallet?.disconnect();
        setAddress(null);
        setBalance(null);
        setConnectedAccounts([]);
        setIsBanned(false);
        setWalletFlags([]);
        if (isAdminSession) {
            await signOut(auth);
            setIsAdminSession(false);
        }
    };

    return (
        <WalletContext.Provider
            value={{
                address: connectedAccounts.length > 0 ? connectedAccounts[0] : null,
                isConnected: !!connectedAccounts.length,
                balance,
                isBanned,
                isAdminSession,
                walletFlags,
                connect,
                disconnect,
                peraWallet: peraWallet!,
            }}
        >
            {children}
            {isBanned && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
                    <div className="max-w-md">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
                            <span className="text-4xl font-black">!</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4 uppercase">Wallet Suspended</h2>
                        <p className="text-red-400 font-mono text-sm mb-8">{connectedAccounts[0]}</p>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            This wallet has been flagged for violating TrustChain protocol terms.
                            All outgoing administrative actions (escrow creation, approvals, refunds) have been restricted.
                        </p>
                        <button onClick={disconnect} className="btn-secondary w-full py-4 bg-slate-100 text-black border-none hover:bg-white">
                            Disconnect Restricted Wallet
                        </button>
                    </div>
                </div>
            )}
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

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
