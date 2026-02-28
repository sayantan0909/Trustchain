'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { supabase } from '@/lib/supabase';
import { LoginModal } from '../LoginModal';
import { algodClient } from '@/lib/algorand';

interface WalletContextType {
    address: string | null;
    balance: number | null;
    isConnected: boolean;
    isAuthenticated: boolean;
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
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isBanned, setIsBanned] = useState(false);
    const [isAdminSession, setIsAdminSession] = useState(false);
    const [walletFlags, setWalletFlags] = useState<any[]>([]);
    const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);


    useEffect(() => {
        const wallet = new PeraWalletConnect();
        setPeraWallet(wallet);

        // Check active Supabase session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setIsAuthenticated(true);
                checkAdminSession(session.user.id);
            }
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
            if (session) {
                checkAdminSession(session.user.id);
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
                supabase.auth.signOut();
            });
        });
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
        const { data } = await supabase.from('admins').select('id').eq('id', uid).single();
        if (data) {
            setIsAdminSession(true);
            // Strictly disconnect wallet if an admin session is detected
            if (connectedAccounts.length > 0) {
                disconnect();
            }
        } else {
            setIsAdminSession(false);
        }
    };

    const checkWalletSecurity = async (addr: string) => {
        const { data } = await supabase
            .from('wallet_flags')
            .select('*')
            .eq('wallet_address', addr);

        if (data) {
            setWalletFlags(data);
            const now = new Date();
            const banned = data.some(f =>
                (f.flag_type === 'permanent_ban') ||
                (f.flag_type === 'temporary_ban' && (!f.expires_at || new Date(f.expires_at) > now))
            );
            setIsBanned(banned);
        } else {
            setWalletFlags([]);
            setIsBanned(false);
        }
    };

    const verifyRoleAndLogin = async (role: string) => {
        if (!address || !peraWallet) return;

        try {
            // 1. "Sign message" by signing arbitrary data via Pera Wallet
            const encoder = new TextEncoder();
            const messageObj = {
                message: `TrustChain Login: ${Date.now()}`,
                address: address
            };
            const dataToSign = encoder.encode(JSON.stringify(messageObj));

            try {
                // Request Pera wallet signature directly without needing a dummy transaction
                await peraWallet.signData([{ data: dataToSign, message: 'Authenticate TrustChain Login' }], address);
            } catch (signError) {
                console.error("User rejected signature or signing failed", signError);
                throw new Error("Wallet signature is required to login.");
            }

            // 2. Auth with Supabase using dummy email bridging
            const dummyEmail = `${address}@trustchain.local`;
            const dummyPassword = `${address}-SecureWalletLogin!123`; // deterministic secure password proxy

            let user = null;

            const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
                email: dummyEmail,
                password: dummyPassword,
            });

            if (authError && authError.message.includes('Invalid login')) {
                // User does not exist, sign them up
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: dummyEmail,
                    password: dummyPassword,
                });
                if (signUpError) throw signUpError;
                user = signUpData.user;
            } else if (authError) {
                throw authError;
            } else {
                user = signInData.user;
            }

            // 3. Upsert into users table (RLS allows users to insert their own row)
            if (user) {
                const { error: dbError } = await supabase.from('users').upsert({
                    id: user.id,
                    wallet_address: address,
                    role: role,
                }, { onConflict: 'id' });

                if (dbError) throw dbError;
            }

            setShowLoginModal(false);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Wallet ownership verification / login failed', error);
            throw error;
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

            // Trigger login modal if not authenticated
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                setShowLoginModal(true);
            }
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
        await supabase.auth.signOut();
        setIsAuthenticated(false);
    };

    return (
        <WalletContext.Provider
            value={{
                address: connectedAccounts.length > 0 ? connectedAccounts[0] : null,
                isConnected: !!connectedAccounts.length,
                isAuthenticated,
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
            {showLoginModal && address && (
                <LoginModal
                    address={address}
                    onVerify={verifyRoleAndLogin}
                    onCancel={() => {
                        setShowLoginModal(false);
                        disconnect();
                    }}
                />
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
