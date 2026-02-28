'use client';

import { useWallet } from '@/components/providers/WalletProvider';
import { Wallet, LogOut } from 'lucide-react';

export const WalletButton = () => {
    const { address, isConnected, connect, disconnect } = useWallet();

    if (isConnected) {
        return (
            <div className="flex items-center gap-3">
                <div className="px-4 py-2 glass rounded-xl border-blue-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-mono text-blue-100">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                </div>
                <button
                    onClick={disconnect}
                    className="p-2 glass rounded-xl hover:bg-red-500/20 text-red-400 transition-colors"
                >
                    <LogOut size={20} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={connect}
            className="btn-primary"
        >
            <Wallet size={20} />
            Connect Wallet
        </button>
    );
};
