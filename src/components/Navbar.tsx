'use client';

import Link from 'next/link';
import { WalletButton } from './WalletButton';
import { Shield } from 'lucide-react';

export const Navbar = () => {
    return (
        <>
            {/* Ambient radial glow behind the navbar */}
            <div
                className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[120px] z-40 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.07) 0%, rgba(0,255,156,0.04) 50%, transparent 80%)',
                    filter: 'blur(20px)',
                }}
            />

            <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-3">
                {/* Floating glass container */}
                <div
                    className="w-full max-w-7xl rounded-xl px-6 py-3 flex items-center justify-between relative overflow-hidden"
                    style={{
                        /* Translucent deep-navy base */
                        background:
                            'linear-gradient(180deg, rgba(15,20,40,0.82) 0%, rgba(8,11,28,0.88) 100%)',
                        backdropFilter: 'blur(20px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                        /* Floating shadow */
                        boxShadow:
                            '0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
                        /* Outer border — very faint white mostly, with accent leak */
                        border: '1px solid rgba(255,255,255,0.07)',
                    }}
                >
                    {/* Top-edge inner highlight */}
                    <div
                        className="absolute inset-x-0 top-0 h-px"
                        style={{
                            background:
                                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(0,229,255,0.18) 50%, rgba(255,255,255,0.12) 70%, transparent 100%)',
                        }}
                    />

                    {/* Animated gradient glow on bottom edge (cyberpunk accent) */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-px"
                        style={{
                            background:
                                'linear-gradient(90deg, transparent 0%, #00FF9C33 15%, #00E5FF55 35%, #A855F755 60%, #FFB02033 80%, transparent 100%)',
                            animation: 'navBorderShift 6s linear infinite',
                        }}
                    />

                    {/* Very subtle noise texture overlay */}
                    <div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                            backgroundImage:
                                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
                            backgroundSize: '180px 180px',
                            opacity: 0.6,
                            mixBlendMode: 'overlay',
                        }}
                    />

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group relative z-10">
                        <div className="p-2 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                            <Shield className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">
                            TrustChain
                        </span>
                    </Link>

                    {/* Nav links */}
                    <div className="hidden md:flex items-center gap-8 relative z-10">
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

                    {/* Wallet button */}
                    <div className="relative z-10">
                        <WalletButton />
                    </div>
                </div>
            </nav>

            {/* Keyframe for the bottom border gradient shift */}
            <style>{`
                @keyframes navBorderShift {
                    0%   { background-position: 0% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </>
    );
};
