'use client';

import Link from 'next/link';
import { WalletButton } from './WalletButton';
import { Shield } from 'lucide-react';

export const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 glass border-b-0 border-white/5 bg-slate-950/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="p-2 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                        <Shield className="text-white" size={24} />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        TrustChain
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        Dashboard
                    </Link>
                    <Link href="/create-escrow" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        Create Escrow
                    </Link>
                    <Link href="/admin" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        Admin
                    </Link>
                </div>

                <WalletButton />
            </div>
        </nav>
    );
};
