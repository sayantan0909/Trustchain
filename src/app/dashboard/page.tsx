'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { Plus, LayoutGrid, ListChecks, ArrowUpRight, ShieldCheck, Shield, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, or, addDoc, writeBatch, doc, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

/* ─── tiny floating particles (reuse pattern from hero) ─────────── */
function DashParticles() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        let raf: number, W = 0, H = 0;
        const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
        resize(); window.addEventListener('resize', resize);
        type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string; life: number; max: number };
        const COLS = ['rgba(139,92,246,', 'rgba(0,212,255,', 'rgba(236,72,153,'];
        const spawn = (): P => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .18, vy: -Math.random() * .28 - .06, r: Math.random() * 1.2 + .3, alpha: 0, color: COLS[Math.floor(Math.random() * 3)], life: 0, max: Math.random() * 280 + 180 });
        const pts: P[] = Array.from({ length: 40 }, () => { const p = spawn(); p.life = Math.random() * p.max; return p; });
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            pts.forEach(p => {
                p.life++; const t = p.life / p.max;
                p.alpha = t < .15 ? t / .15 : t > .75 ? (1 - t) / .25 : 1;
                p.x += p.vx; p.y += p.vy;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${p.alpha * .6})`; ctx.fill();
                if (p.life >= p.max) Object.assign(p, { ...spawn(), life: 0 });
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ─── aurora CSS beam layer ──────────────────────────────────────── */
const AURORA_STYLE = `
@keyframes db-aurora1 { 0%,100%{transform:translateY(0) skewY(-3deg);opacity:.13} 50%{transform:translateY(-40px) skewY(2deg);opacity:.18} }
@keyframes db-aurora2 { 0%,100%{transform:translateY(0) skewY(4deg);opacity:.11} 50%{transform:translateY(35px) skewY(-2deg);opacity:.17} }
@keyframes db-aurora3 { 0%,100%{transform:translateY(0) skewY(-2deg);opacity:.10} 50%{transform:translateY(-25px) skewY(3deg);opacity:.16} }
.db-beam1{position:absolute;left:-20%;right:-20%;top:15%;height:260px;background:linear-gradient(180deg,transparent,rgba(139,92,246,.55),transparent);filter:blur(70px);animation:db-aurora1 9s ease-in-out infinite;}
.db-beam2{position:absolute;left:-20%;right:-20%;top:45%;height:220px;background:linear-gradient(180deg,transparent,rgba(236,72,153,.5),transparent);filter:blur(80px);animation:db-aurora2 12s ease-in-out infinite;}
.db-beam3{position:absolute;left:-20%;right:-20%;top:72%;height:200px;background:linear-gradient(180deg,transparent,rgba(0,212,255,.45),transparent);filter:blur(90px);animation:db-aurora3 10s ease-in-out infinite;}
`;

function AuroraBackground() {
    return (
        <>
            <style>{AURORA_STYLE}</style>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <div className="db-beam1" />
                <div className="db-beam2" />
                <div className="db-beam3" />
                <DashParticles />
                {/* subtle grid */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(139,92,246,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px)', backgroundSize: '80px 80px', opacity: .5 }} />
            </div>
        </>
    );
}

/* ─── stat card accent config ────────────────────────────────────── */
const STAT_CFG = [
    { color: '#3b82f6', glow: 'rgba(59,130,246,.25)', border: 'rgba(59,130,246,.35)' },
    { color: '#22c55e', glow: 'rgba(34,197,94,.25)', border: 'rgba(34,197,94,.35)' },
    { color: '#a855f7', glow: 'rgba(168,85,247,.25)', border: 'rgba(168,85,247,.35)' },
    { color: '#f97316', glow: 'rgba(249,115,22,.25)', border: 'rgba(249,115,22,.35)' },
] as const;

interface StatCardProps { label: string; value: string | number; icon: React.ReactNode; idx: number }
function StatCard({ label, value, icon, idx }: StatCardProps) {
    const [hov, setHov] = useState(false);
    const cfg = STAT_CFG[idx % 4];
    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', padding: '1.5rem', borderRadius: 20,
                background: 'rgba(255,255,255,.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${hov ? cfg.border : 'rgba(255,255,255,.07)'}`,
                boxShadow: hov ? `0 8px 40px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,.06)` : '0 4px 24px rgba(0,0,0,.3)',
                transform: hov ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                overflow: 'hidden',
            }}
        >
            {/* top glow border */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${cfg.color},transparent)`, opacity: hov ? 1 : 0, transition: 'opacity .3s' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 12, borderRadius: 14, background: `${cfg.color}18`, boxShadow: hov ? `0 0 20px ${cfg.glow}` : 'none', transition: 'box-shadow .3s', transform: hov ? 'scale(1.1)' : 'scale(1)', transitionProperty: 'transform,box-shadow' }}>
                    {icon}
                </div>
                <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'monospace', color: hov ? cfg.color : '#fff', transition: 'color .3s', lineHeight: 1 }}>{value}</p>
                </div>
            </div>
        </div>
    );
}

/* ─── section header ─────────────────────────────────────────────── */
function SectionHeader({ icon, title, count, accent }: { icon: React.ReactNode; title: string; count: number; accent: string }) {
    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 20, marginBottom: 28 }}>
            {/* gradient line bg */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,${accent}55,transparent)` }} />
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 16px ${accent}30` }}>
                {icon}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>{title}</h2>
            <span style={{ padding: '2px 10px', borderRadius: 8, background: `${accent}18`, color: accent, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', border: `1px solid ${accent}30` }}>{count}</span>
        </div>
    );
}

/* ─── project card ────────────────────────────────────────────────── */
function ProjectCard({ project }: { project: any }) {
    const [hov, setHov] = useState(false);
    const router = useRouter();
    const isActive = project.status === 'active' || project.status === 'funded';
    return (
        // Use div+onClick instead of <Link> so the inner AlgoExplorer <a> doesn't
        // become a descendant of another <a> (invalid HTML / hydration error).
        <div
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/escrow/${project.id}`)}
            onKeyDown={e => e.key === 'Enter' && router.push(`/escrow/${project.id}`)}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', borderRadius: 20, overflow: 'hidden',
                background: '#0f1729',
                border: `1px solid ${hov ? 'rgba(99,102,241,.4)' : 'rgba(255,255,255,.06)'}`,
                boxShadow: hov ? '0 8px 40px rgba(99,102,241,.15), 0 0 0 1px rgba(99,102,241,.1)' : '0 4px 20px rgba(0,0,0,.4)',
                transform: hov ? 'translateY(-3px)' : 'translateY(0)',
                transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                cursor: 'pointer',
            }}
        >
            {/* hover gradient border */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: `radial-gradient(ellipse at top left,rgba(99,102,241,.08) 0%,transparent 60%)`, opacity: hov ? 1 : 0, transition: 'opacity .3s', pointerEvents: 'none' }} />

            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Contract ID</p>
                        <h3 style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-.02em' }}>#{project.id.slice(0, 12)}</h3>
                    </div>
                    <span style={{
                        padding: '3px 10px', borderRadius: 8, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em',
                        background: isActive ? 'rgba(34,197,94,.1)' : 'rgba(71,85,105,.2)',
                        color: isActive ? '#22c55e' : '#64748b',
                        border: `1px solid ${isActive ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.05)'}`,
                    }}>{project.status}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.8rem', color: '#64748b' }}>Locked Liquidity</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: '.9rem' }}>{project.total_amount} ALGO</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.8rem', color: '#64748b' }}>Milestones</span>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '.9rem' }}>{project.milestones?.length || 0}</span>
                    </div>
                    {/* milestone progress bar */}
                    {(project.milestones?.length || 0) > 0 && (() => {
                        const paid = project.milestones?.filter((m: any) => m.status === 'paid').length || 0;
                        const pct = Math.round((paid / project.milestones.length) * 100);
                        return (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius: 2, transition: 'width .5s ease' }} />
                                </div>
                                <p style={{ fontSize: 9, color: '#475569', marginTop: 4, textAlign: 'right' }}>{paid}/{project.milestones.length} paid</p>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div style={{ padding: '12px 1.5rem', background: hov ? 'rgba(99,102,241,.05)' : 'rgba(255,255,255,.02)', borderTop: '1px solid rgba(255,255,255,.05)', transition: 'background .3s' }}>
                {/* AlgoExplorer verified badge — shown when contract is deployed */}
                {project.app_id && (
                    <a
                        href={`https://testnet.algoexplorer.io/application/${project.app_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.18)', color: '#4ade80', fontSize: 9, fontWeight: 700, textDecoration: 'none', marginBottom: 8, letterSpacing: '.04em' }}
                    >
                        <span style={{ fontSize: 9 }}>✅</span> Verified on TestNet <ExternalLink size={9} />
                    </a>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: hov ? '#818cf8' : '#475569', textTransform: 'uppercase', letterSpacing: '.1em', transition: 'color .3s' }}>Manage Escrow</p>
                    <ArrowUpRight size={15} style={{ color: hov ? '#818cf8' : '#475569', transition: 'color .3s' }} />
                </div>
            </div>
        </div>
    );
}

/* ─── page ───────────────────────────────────────────────────────── */
/* ─── Demo seeder ───────────────────────────────────────────────── */
async function seedDemoData(address: string) {
    const DEMO_FREELANCER = 'ALGORANDDEMOWALLET7XFAKEADDRESS1234567890ABCDEFGHIJKLMNOPQR';
    const DEMO_CLIENT = 'ALGORANDDEMOCLIENTWALLET7XFAKE1234567890ABCDEFGHIJKLMNOPQRST';

    // Escrow 1 — user is the CLIENT of a DeFi Dashboard UI project
    const e1 = await addDoc(collection(db, 'escrows'), {
        title: 'DeFi Dashboard UI',
        description: 'Build a production-grade analytics dashboard for a DeFi protocol, including charts, wallet integration, and live data feeds.',
        client_wallet: address,
        freelancer_wallet: DEMO_FREELANCER,
        total_amount: 3.5,
        status: 'funded',
        demo: true,
        created_at: serverTimestamp(),
    });
    const batch1 = writeBatch(db);
    [
        { title: 'UI Wireframes & Design System', amount: 0.75, status: 'paid', milestone_index: 0 },
        { title: 'Core Dashboard Components', amount: 1.5, status: 'pending', milestone_index: 1 },
        { title: 'Live Data Integration', amount: 1.25, status: 'pending', milestone_index: 2 },
    ].forEach(m => {
        batch1.set(doc(collection(db, 'milestones')), { ...m, escrow_id: e1.id, description: '', created_at: serverTimestamp() });
    });
    await batch1.commit();

    // Escrow 2 — user is the FREELANCER on a Smart Contract Audit
    const e2 = await addDoc(collection(db, 'escrows'), {
        title: 'Smart Contract Audit',
        description: 'Full security audit of an Algorand AVM smart contract suite — static analysis, reentrancy checks, and final report.',
        client_wallet: DEMO_CLIENT,
        freelancer_wallet: address,
        total_amount: 2.0,
        status: 'funded',
        demo: true,
        created_at: serverTimestamp(),
    });
    const batch2 = writeBatch(db);
    [
        { title: 'Initial Vulnerability Scan', amount: 0.8, status: 'pending', milestone_index: 0 },
        { title: 'Full Audit Report & Sign-off', amount: 1.2, status: 'pending', milestone_index: 1 },
    ].forEach(m => {
        batch2.set(doc(collection(db, 'milestones')), { ...m, escrow_id: e2.id, description: '', created_at: serverTimestamp() });
    });
    await batch2.commit();
}

export default function Dashboard() {
    const { address, isConnected, isBanned } = useWallet();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [seedingDemo, setSeedingDemo] = useState(false);

    useEffect(() => {
        if (address) fetchProjects();
    }, [address]);

    const fetchProjects = async () => {
        if (!address) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'escrows'), or(where('client_wallet', '==', address), where('freelancer_wallet', '==', address)));
            const snap = await getDocs(q);
            const data = await Promise.all(snap.docs.map(async docSnap => {
                const mq = query(collection(db, 'milestones'), where('escrow_id', '==', docSnap.id));
                const ms = await getDocs(mq);
                return { id: docSnap.id, ...docSnap.data(), milestones: ms.docs.map(d => ({ id: d.id, ...d.data() })) };
            }));
            setProjects(data);
        } catch (e) { console.error('Firestore error:', e); }
        finally { setLoading(false); }
    };

    /* ── Banned ───────────────────────────────────────── */
    if (isBanned) return (
        <div style={{ minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden' }}>
            <AuroraBackground />
            <Navbar />
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 24px' }}>
                <div style={{ textAlign: 'center', maxWidth: 480, padding: '3rem', borderRadius: 28, background: 'rgba(255,255,255,.03)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(239,68,68,.15)', boxShadow: '0 0 60px rgba(239,68,68,.08)', position: 'relative', overflow: 'hidden' }}>
                    {/* scanline overlay */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0px,rgba(255,255,255,.015) 1px,transparent 1px,transparent 3px)', pointerEvents: 'none', borderRadius: 28 }} />
                    {/* crimson orb */}
                    <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,rgba(239,68,68,.2),transparent)', animation: 'db-aurora1 2s ease-in-out infinite' }} />
                        <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '1px solid rgba(239,68,68,.2)', animation: 'db-aurora2 3s ease-in-out infinite' }} />
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(239,68,68,.2)' }}>
                            <AlertTriangle size={32} style={{ color: '#ef4444' }} />
                        </div>
                    </div>
                    <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '3.5rem', color: '#ef4444', letterSpacing: '.05em', marginBottom: 12, lineHeight: 1 }}>ACCESS DENIED</h1>
                    <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 28, fontSize: '.9rem' }}>
                        Your wallet has been flagged for protocol violations. Access to dashboard actions and funds management has been suspended.
                    </p>
                    <Link href="/" className="btn-secondary" style={{ display: 'inline-flex' }}>Return Home</Link>
                </div>
            </div>
        </div>
    );

    /* ── Not Connected ────────────────────────────────── */
    if (!isConnected) return (
        <div style={{ minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden' }}>
            <AuroraBackground />
            <Navbar />
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 24px' }}>
                <div style={{ textAlign: 'center', maxWidth: 500, padding: '3rem', borderRadius: 28, background: 'rgba(255,255,255,.03)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(139,92,246,.15)', boxShadow: '0 0 80px rgba(139,92,246,.08)' }}>
                    {/* glowing shield */}
                    <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(139,92,246,.25)', animation: 'db-aurora1 3s ease-in-out infinite' }} />
                        <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1px solid rgba(139,92,246,.1)', animation: 'db-aurora2 4s ease-in-out infinite' }} />
                        <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(139,92,246,.25)' }}>
                            <Shield size={34} style={{ color: '#a78bfa' }} />
                        </div>
                    </div>
                    <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '3rem', color: '#fff', letterSpacing: '.05em', marginBottom: 12, lineHeight: 1 }}>NEXUS CONTROL CENTER</h1>
                    <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 32, fontSize: '.9rem' }}>
                        Connect your secure Algorand wallet to access your trustless escrows, track milestones, and manage decentralised payments.
                    </p>
                    <Link href="/" className="btn-primary" style={{ display: 'inline-flex' }}>
                        <span style={{ display: 'contents' }}>Connect Wallet to Begin</span>
                    </Link>
                </div>
            </div>
        </div>
    );

    /* ── Main dashboard ───────────────────────────────── */
    const clientProjects = projects.filter(p => p.client_wallet === address);
    const freelancerProjects = projects.filter(p => p.freelancer_wallet === address);
    const totalVolume = projects.reduce((a, p) => a + Number(p.total_amount || 0), 0);
    const completedMilestones = projects.reduce((a, p) => a + (p.milestones?.filter((m: any) => m.status === 'paid').length || 0), 0);

    const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-5)}` : '';

    return (
        <div style={{ minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden', paddingBottom: 80 }}>
            <AuroraBackground />
            <Navbar />

            <div style={{ position: 'relative', zIndex: 10, paddingTop: 128, paddingLeft: 24, paddingRight: 24, maxWidth: 1280, margin: '0 auto' }}>

                {/* ── Header ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 52 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div style={{ padding: 14, background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(168,85,247,.2))', borderRadius: 18, border: '1px solid rgba(99,102,241,.25)', boxShadow: '0 0 30px rgba(99,102,241,.15)' }}>
                            <LayoutGrid size={28} style={{ color: '#818cf8' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(2rem,5vw,3rem)', background: 'linear-gradient(90deg,#fff 60%,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '.02em', lineHeight: 1 }}>
                                    Main Dashboard
                                </h1>
                                {/* Demo Mode badge */}
                                {isDemoMode && (
                                    <span style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', color: '#fbbf24', fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>
                                        ✦ Demo Mode
                                    </span>
                                )}
                            </div>
                            {/* address pill */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 100, background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.2)' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.8)', animation: 'badgePulse 2s ease-in-out infinite' }} />
                                <span style={{ fontFamily: 'monospace', fontSize: '.7rem', color: '#4ade80', fontWeight: 600, letterSpacing: '.04em' }}>{shortAddr}</span>
                            </div>
                        </div>
                    </div>

                    <Link href="/create-escrow" className="btn-primary">
                        <span style={{ display: 'contents' }}><Plus size={18} /> Create Escrow</span>
                    </Link>
                </div>

                {/* ── Stats Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 52 }}>
                    <StatCard label="Total Escrows" value={projects.length} icon={<LayoutGrid size={20} style={{ color: '#60a5fa' }} />} idx={0} />
                    <StatCard label="Milestones Paid" value={completedMilestones} icon={<ListChecks size={20} style={{ color: '#4ade80' }} />} idx={1} />
                    <StatCard label="Protocol Volume" value={`${totalVolume} ALGO`} icon={<ArrowUpRight size={20} style={{ color: '#c084fc' }} />} idx={2} />
                    <StatCard label="Active Roles" value={(clientProjects.length > 0 ? 1 : 0) + (freelancerProjects.length > 0 ? 1 : 0)} icon={<ShieldCheck size={20} style={{ color: '#fb923c' }} />} idx={3} />
                </div>

                {/* ── Project Sections ── */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ height: 180, borderRadius: 20, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)', animation: 'db-aurora1 2s ease-in-out infinite', opacity: .5 }} />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 28, border: '1px dashed rgba(139,92,246,.15)', background: 'rgba(139,92,246,.03)', backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden' }}>
                        {/* subtle radial glow */}
                        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.07),transparent)', pointerEvents: 'none' }} />
                        {/* icon */}
                        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(139,92,246,.2)', animation: 'db-aurora1 3s ease-in-out infinite' }} />
                            <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '1px solid rgba(139,92,246,.08)', animation: 'db-aurora2 4s ease-in-out infinite' }} />
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(139,92,246,.15)' }}>
                                <ShieldCheck size={28} style={{ color: '#a78bfa' }} />
                            </div>
                        </div>
                        <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color: '#fff', letterSpacing: '.04em', marginBottom: 12 }}>No Active Escrows</h3>
                        <p style={{ color: '#64748b', maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.7, fontSize: '.9rem' }}>
                            You haven&apos;t created or joined any escrow contracts yet. Deploy a live project — or load demo data to see TrustChain in action.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', position: 'relative' }}>
                            <Link href="/create-escrow" className="btn-primary" style={{ display: 'inline-flex' }}>
                                <span style={{ display: 'contents' }}><Plus size={16} /> Create Escrow</span>
                            </Link>
                            <button
                                onClick={async () => {
                                    if (!address || seedingDemo) return;
                                    setSeedingDemo(true);
                                    try {
                                        await seedDemoData(address);
                                        setIsDemoMode(true);
                                        await fetchProjects();
                                    } catch (e) { console.error('Demo seed error:', e); }
                                    finally { setSeedingDemo(false); }
                                }}
                                disabled={seedingDemo}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 14, background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.2)', color: '#fbbf24', fontWeight: 700, fontSize: '.875rem', cursor: seedingDemo ? 'not-allowed' : 'pointer', opacity: seedingDemo ? .6 : 1 }}
                            >
                                {seedingDemo ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Seeding…</> : <>✦ Load Demo Data</>}
                            </button>
                        </div>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
                        {clientProjects.length > 0 && (
                            <section>
                                <SectionHeader icon={<ShieldCheck size={18} style={{ color: '#60a5fa' }} />} title="Managing as Client" count={clientProjects.length} accent="#3b82f6" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
                                    {clientProjects.map(p => <ProjectCard key={p.id} project={p} />)}
                                </div>
                            </section>
                        )}
                        {freelancerProjects.length > 0 && (
                            <section>
                                <SectionHeader icon={<ListChecks size={18} style={{ color: '#c084fc' }} />} title="Contributing as Freelancer" count={freelancerProjects.length} accent="#a855f7" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
                                    {freelancerProjects.map(p => <ProjectCard key={p.id} project={p} />)}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
