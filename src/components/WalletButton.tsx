'use client';

import { useWallet } from '@/components/providers/WalletProvider';
import { Wallet, LogOut, Shield } from 'lucide-react';
import { formatAddress } from '@/lib/walletUtils';

export const WalletButton = () => {
    const { address, balance, isConnected, isAdminSession, connect, disconnect, walletType, walletName } = useWallet();

    const WALLET_ACCENT: Record<string, string> = {
        pera: '#00D09E',
        lute: '#5468FF',
    };
    const accent = walletType ? (WALLET_ACCENT[walletType] ?? '#3B82F6') : '#3B82F6';

    if (isAdminSession) {
        return (
            <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
                    <Shield size={16} className="text-blue-400" />
                    <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Management Mode</span>
                </div>
                <button
                    onClick={disconnect}
                    className="p-2 glass rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
                    title="Sign Out Admin"
                >
                    <LogOut size={20} />
                </button>
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="flex items-center gap-3">
                <div className="px-4 py-2 glass rounded-xl border-blue-500/30 flex items-center gap-2">
                    {/* Wallet type indicator dot */}
                    <div
                        className="w-2 h-2 rounded-full animate-pulse shrink-0"
                        style={{ background: accent }}
                        title={walletName}
                    />
                    {/* Wallet logo badge */}
                    {walletType && (
                        <img
                            src={`/wallets/${walletType}.svg`}
                            alt={walletName}
                            width={18}
                            height={18}
                            className="rounded-md"
                            title={walletName}
                        />
                    )}
                    <span className="text-sm font-mono text-blue-100 border-r border-blue-500/30 pr-3 mr-1">
                        {balance !== null ? balance.toFixed(2) : '0.00'} ALGO
                    </span>
                    <span className="text-sm font-mono text-slate-400">
                        {formatAddress(address)}
                    </span>
                </div>
                <button
                    id="wallet-disconnect-btn"
                    onClick={disconnect}
                    className="p-2 glass rounded-xl hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Disconnect Wallet"
                >
                    <LogOut size={20} />
                </button>
            </div>
        );
    }

    return (
        <button
            id="wallet-connect-btn"
            onClick={connect}
            className="btn-primary"
        >
            <Wallet size={20} />
            Connect Wallet
        </button>
    );
};
