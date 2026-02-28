'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

interface WalletContextType {
    address: string | null;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    peraWallet: PeraWalletConnect;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);

    useEffect(() => {
        const wallet = new PeraWalletConnect();
        setPeraWallet(wallet);

        // Reconnect to the session when the component is mounted
        wallet.reconnectSession().then((accounts) => {
            if (accounts.length > 0) {
                setAddress(accounts[0]);
            }

            wallet.connector?.on('disconnect', () => {
                setAddress(null);
            });
        });
    }, []);

    const connect = async () => {
        if (!peraWallet) return;
        try {
            const newAccounts = await peraWallet.connect();
            setAddress(newAccounts[0]);
        } catch (error) {
            console.error('Failed to connect to Pera Wallet:', error);
        }
    };

    const disconnect = () => {
        peraWallet?.disconnect();
        setAddress(null);
    };

    return (
        <WalletContext.Provider
            value={{
                address,
                isConnected: !!address,
                connect,
                disconnect,
                peraWallet: peraWallet!,
            }}
        >
            {children}
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
