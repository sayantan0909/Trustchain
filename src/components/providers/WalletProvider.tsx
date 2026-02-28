'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { supabase } from '@/lib/supabase';
import { LoginModal } from '../LoginModal';
import { algodClient } from '@/lib/algorand';

interface WalletContextType {
    address: string | null;
    balance: number;
    isConnected: boolean;
    isAuthenticated: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    peraWallet: PeraWalletConnect;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        const wallet = new PeraWalletConnect();
        setPeraWallet(wallet);

        // Check active Supabase session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setIsAuthenticated(true);
            }
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        wallet.reconnectSession().then((accounts) => {
            if (accounts.length > 0) {
                setAddress(accounts[0]);
                fetchBalance(accounts[0]);
            }

            wallet.connector?.on('disconnect', () => {
                setAddress(null);
                setBalance(0);
                supabase.auth.signOut();
            });
        });
    }, []);

    const fetchBalance = async (addr: string) => {
        try {
            const accountInfo = await algodClient.accountInformation(addr).do();
            setBalance(Number(accountInfo.amount) / 1_000_000); // Convert microAlgos to ALGO
        } catch (error) {
            console.error('Failed to fetch balance:', error);
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
        try {
            const newAccounts = await peraWallet.connect();
            setAddress(newAccounts[0]);
            fetchBalance(newAccounts[0]);

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
        peraWallet?.disconnect();
        setAddress(null);
        setBalance(0);
        await supabase.auth.signOut();
        setIsAuthenticated(false);
    };

    return (
        <WalletContext.Provider
            value={{
                address,
                balance,
                isConnected: !!address,
                isAuthenticated,
                connect,
                disconnect,
                peraWallet: peraWallet!,
            }}
        >
            {children}
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
