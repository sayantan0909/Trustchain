'use client';

import React from 'react';
import { useWallet } from '@/components/providers/WalletProvider';
import { Wallet } from 'lucide-react';

export function WalletGuard({ children }: { children: React.ReactNode }) {
    const { address } = useWallet();

    if (!address) {
        return (
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    background: 'rgba(249, 115, 22, 0.08)',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    color: '#fb923c',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    animation: 'pulseBorder 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
            >
                <Wallet size={18} /> Connect Wallet to Continue
                <style>{`
                    @keyframes pulseBorder {
                        0%, 100% { border-color: rgba(249, 115, 22, 0.4); box-shadow: 0 0 0 rgba(249, 115, 22, 0); }
                        50% { border-color: rgba(249, 115, 22, 1); box-shadow: 0 0 12px rgba(249, 115, 22, 0.3); }
                    }
                `}</style>
            </div>
        );
    }

    return <>{children}</>;
}
