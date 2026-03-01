'use client';

import Link from 'next/link';
import Image from 'next/image';
import { WalletButton } from './WalletButton';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from './providers/WalletProvider';

export const Navbar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { address } = useWallet();
    const shortAddr = address ? `${address.slice(0, 6)}…` : null;

    return (
        <>
            {/* Ambient glow */}
            <div
                className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[120px] z-40 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.07) 0%, rgba(0,255,156,0.04) 50%, transparent 80%)',
                    filter: 'blur(20px)',
                }}
            />

            <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 pt-3">
                <div
                    className="w-full max-w-7xl rounded-xl px-4 md:px-6 py-3 flex items-center justify-between relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(15,20,40,0.88) 0%, rgba(8,11,28,0.92) 100%)',
                        backdropFilter: 'blur(20px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
                        border: '1px solid rgba(255,255,255,0.07)',
                    }}
                >
                    {/* Top-edge highlight */}
                    <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(0,229,255,0.18) 50%, rgba(255,255,255,0.12) 70%, transparent 100%)' }} />
                    {/* Bottom accent */}
                    <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #00FF9C33 15%, #00E5FF55 35%, #A855F755 60%, #FFB02033 80%, transparent 100%)', animation: 'navBorderShift 6s linear infinite' }} />

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group relative z-10 flex-shrink-0">
                        <Image
                            src="/logo.png"
                            alt="TrustChain"
                            width={36}
                            height={36}
                            className="object-contain rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">
                            TrustChain
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-8 relative z-10">
                        <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Dashboard</Link>
                        <Link href="/create-escrow" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Create Escrow</Link>
                        <Link href="/admin" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Admin</Link>
                    </div>

                    {/* Right side: wallet (desktop) + hamburger (mobile) */}
                    <div className="flex items-center gap-3 relative z-10">
                        {/* Address pill on mobile */}
                        {shortAddr && (
                            <span className="md:hidden text-xs font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-lg">
                                {shortAddr}
                            </span>
                        )}
                        {/* Wallet button — hide full version on mobile, show on md+ */}
                        <div className="hidden md:block">
                            <WalletButton />
                        </div>
                        {/* Hamburger */}
                        <button
                            className="md:hidden p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
                            onClick={() => setMobileOpen(v => !v)}
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col"
                    style={{ background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(20px)', paddingTop: 80 }}
                >
                    {/* Close */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="absolute top-4 right-4 p-2 rounded-xl border border-white/10 text-slate-400"
                    >
                        <X size={22} />
                    </button>

                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                            { href: '/', label: 'Home' },
                            { href: '/dashboard', label: 'Dashboard' },
                            { href: '/create-escrow', label: 'Create Escrow' },
                            { href: '/admin', label: 'Admin' },
                        ].map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    display: 'block', padding: '14px 18px', borderRadius: 14,
                                    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
                                    color: '#e2e8f0', fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
                                    transition: 'background .2s',
                                }}
                            >
                                {label}
                            </Link>
                        ))}

                        {/* Wallet button in drawer */}
                        <div style={{ marginTop: 20 }}>
                            <WalletButton />
                        </div>

                        {address && (
                            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,.8)', flexShrink: 0 }} />
                                <span style={{ fontFamily: 'monospace', fontSize: '.75rem', color: '#4ade80', wordBreak: 'break-all' }}>{address}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes navBorderShift {
                    0%   { background-position: 0% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </>
    );
};
