'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useState, useRef, useCallback, useEffect } from "react";
import { Check, X, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Shield, ShieldCheck, User, Layers, FileCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, writeBatch, doc, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

/* ─── Algorand address validator ────────────────────────────────── */
function isValidAlgoAddr(addr: string) {
    return /^[A-Z2-7]{58}$/.test(addr.trim());
}

/* ─── Canvas confetti ────────────────────────────────────────────── */
function Confetti({ active }: { active: boolean }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!active) return;
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const COLS = ['#8b5cf6', '#ec4899', '#00d4ff', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];
        type Bit = { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; angle: number; spin: number; life: number };
        const bits: Bit[] = Array.from({ length: 160 }, () => ({
            x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
            vx: (Math.random() - .5) * 4, vy: 3 + Math.random() * 4,
            w: 8 + Math.random() * 8, h: 4 + Math.random() * 6,
            color: COLS[Math.floor(Math.random() * COLS.length)],
            angle: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * .2,
            life: 1,
        }));
        let raf: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            bits.forEach(b => {
                b.y += b.vy; b.x += b.vx; b.vy += .12; b.angle += b.spin;
                if (b.y > canvas.height) return;
                alive = true;
                ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
                ctx.fillStyle = b.color; ctx.globalAlpha = Math.max(0, 1 - b.y / canvas.height);
                ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
                ctx.restore();
            });
            if (alive) raf = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(raf);
    }, [active]);
    if (!active) return null;
    return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }} />;
}

/* ─── Aurora background ──────────────────────────────────────────── */
const AURORA_CSS = `
@keyframes wza{0%,100%{transform:translateY(0) skewY(-3deg);opacity:.13}50%{transform:translateY(-40px) skewY(2deg);opacity:.18}}
@keyframes wzb{0%,100%{transform:translateY(0) skewY(4deg);opacity:.10}50%{transform:translateY(30px) skewY(-2deg);opacity:.16}}
@keyframes wzc{0%,100%{transform:translateY(0) skewY(-2deg);opacity:.09}50%{transform:translateY(-22px) skewY(3deg);opacity:.15}}
.wz1{position:absolute;left:-20%;right:-20%;top:10%;height:260px;background:linear-gradient(180deg,transparent,rgba(139,92,246,.55),transparent);filter:blur(70px);animation:wza 9s ease-in-out infinite;pointer-events:none}
.wz2{position:absolute;left:-20%;right:-20%;top:45%;height:220px;background:linear-gradient(180deg,transparent,rgba(236,72,153,.5),transparent);filter:blur(80px);animation:wzb 12s ease-in-out infinite;pointer-events:none}
.wz3{position:absolute;left:-20%;right:-20%;top:76%;height:200px;background:linear-gradient(180deg,transparent,rgba(0,212,255,.45),transparent);filter:blur(90px);animation:wzc 10s ease-in-out infinite;pointer-events:none}
@keyframes focusGlow{from{box-shadow:0 0 0 0 rgba(99,102,241,.5)}to{box-shadow:0 0 0 4px rgba(99,102,241,.15)}}
`;

/* ─── Step indicator ─────────────────────────────────────────────── */
const STEPS = [
    { icon: FileCheck, label: 'Details' },
    { icon: User, label: 'Parties' },
    { icon: Layers, label: 'Milestones' },
    { icon: ShieldCheck, label: 'Review' },
];

function StepBar({ current }: { current: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 48 }}>
            {STEPS.map((s, i) => {
                const done = i < current, active = i === current;
                const Icon = s.icon;
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'rgba(99,102,241,1)' : active ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.05)',
                                border: `2px solid ${done ? '#6366f1' : active ? 'rgba(99,102,241,.6)' : 'rgba(255,255,255,.1)'}`,
                                boxShadow: active ? '0 0 20px rgba(99,102,241,.35)' : 'none',
                                transition: 'all .4s ease',
                            }}>
                                {done ? <Check size={18} style={{ color: '#fff' }} /> : <Icon size={18} style={{ color: active ? '#a78bfa' : '#475569' }} />}
                            </div>
                            <span style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: active ? '#a78bfa' : done ? '#6366f1' : '#475569' }}>{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ width: 60, height: 2, background: i < current ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,.07)', margin: '0 4px', marginBottom: 20, transition: 'background .4s ease', borderRadius: 1 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Styled input ───────────────────────────────────────────────── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: '.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>{label}</label>
            {children}
            {error && <p style={{ color: '#f87171', fontSize: '.78rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><X size={12} /> {error}</p>}
        </div>
    );
}

const inputStyle = (focused: boolean, error?: boolean): React.CSSProperties => ({
    width: '100%', background: 'rgba(255,255,255,.05)',
    border: `1px solid ${error ? 'rgba(239,68,68,.5)' : focused ? 'rgba(99,102,241,.6)' : 'rgba(255,255,255,.09)'}`,
    borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '.9rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s',
    boxShadow: focused ? '0 0 0 3px rgba(99,102,241,.12)' : 'none',
});

/* ─── Page ───────────────────────────────────────────────────────── */
export default function CreateProject() {
    const { address, isConnected, isBanned, isAdminSession } = useWallet();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [confetti, setConfetti] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Step 1 — Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Step 2 — Parties
    const [freelancerAddress, setFreelancerAddress] = useState('');

    // Step 3 — Milestones
    const [milestones, setMilestones] = useState([{ title: 'Initial Milestone', amount: '' }]);

    // Focus states
    const [focused, setFocused] = useState<string>('');

    /* ── Validation per step ── */
    const validate = useCallback((s: number): boolean => {
        const errs: Record<string, string> = {};
        if (s === 0) {
            if (!title.trim()) errs.title = 'Project name is required.';
        }
        if (s === 1) {
            if (!isValidAlgoAddr(freelancerAddress)) errs.freelancer = 'Enter a valid 58-character Algorand address.';
            else if (freelancerAddress.trim() === address) errs.freelancer = 'Freelancer address cannot be the same as your own.';
        }
        if (s === 2) {
            if (milestones.length === 0) errs.milestones = 'Add at least one milestone.';
            milestones.forEach((m, i) => {
                if (!m.title.trim()) errs[`m_title_${i}`] = 'Milestone name required.';
                if (!m.amount || Number(m.amount) <= 0) errs[`m_amt_${i}`] = 'Amount must be > 0.';
            });
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [title, freelancerAddress, address, milestones]);

    const next = () => { if (validate(step)) setStep(s => s + 1); };
    const back = () => { setErrors({}); setStep(s => s - 1); };

    /* ── Milestone helpers ── */
    const addMilestone = () => setMilestones(prev => [...prev, { title: '', amount: '' }]);
    const removeMilestone = (i: number) => setMilestones(prev => prev.filter((_, idx) => idx !== i));
    const updateMilestone = (i: number, field: string, val: string) => {
        setMilestones(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });
    };
    const totalAlgo = milestones.reduce((a, m) => a + (Number(m.amount) || 0), 0);

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!isConnected || !address || isBanned || isAdminSession) return;
        if (!validate(0) || !validate(1) || !validate(2)) { setStep(0); return; }

        setLoading(true);
        try {
            const escrowRef = await addDoc(collection(db, 'escrows'), {
                title: title.trim(),
                description: description.trim(),
                client_wallet: address,
                freelancer_wallet: freelancerAddress.trim(),
                total_amount: totalAlgo,
                status: 'funded',
                created_at: serverTimestamp(),
            });

            const batch = writeBatch(db);
            milestones.forEach((m, i) => {
                const mRef = doc(collection(db, 'milestones'));
                batch.set(mRef, {
                    escrow_id: escrowRef.id,
                    milestone_index: i,
                    title: m.title,
                    description: '',
                    amount: Number(m.amount),
                    status: 'pending',
                    created_at: serverTimestamp(),
                });
            });
            await batch.commit();

            setConfetti(true);
            setTimeout(() => router.push(`/escrow/${escrowRef.id}`), 2200);
        } catch (err: any) {
            console.error('createEscrow error:', err);
            setErrors({ submit: 'Failed to create escrow: ' + (err.message || 'Unknown error') });
        } finally { setLoading(false); }
    };

    const addrValid = isValidAlgoAddr(freelancerAddress) && freelancerAddress.trim() !== address;
    const addrInvalid = freelancerAddress.length > 0 && !addrValid;

    return (
        <div style={{ minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden', paddingBottom: 80 }}>
            <style>{AURORA_CSS}</style>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
                <div className="wz1" /><div className="wz2" /><div className="wz3" />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(139,92,246,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px)', backgroundSize: '80px 80px', opacity: .4, pointerEvents: 'none' }} />
            </div>

            <Confetti active={confetti} />
            <Navbar />

            <div style={{ position: 'relative', zIndex: 10, paddingTop: 120, paddingLeft: 24, paddingRight: 24, maxWidth: 680, margin: '0 auto' }}>

                {/* Header */}
                {/* <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(2.5rem,6vw,3.5rem)', color: '#fff', letterSpacing: '.04em', lineHeight: 1, marginBottom: 10 }}>
                        Create Trustless Escrow
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '.9rem' }}>Lock funds on Algorand and pay when work is verified — no trust required.</p>
                </div> */}
                <div
                    style={{
                        textAlign: "center",
                        marginBottom: 70,
                        position: "relative",
                    }}
                >
                    {/* Soft Glow Background */}
                    <div
                        style={{
                            position: "absolute",
                            top: "-80px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "600px",
                            height: "350px",
                            background:
                                "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
                            filter: "blur(70px)",
                            zIndex: -1,
                        }}
                    />

                    <h1
                        style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: "clamp(3rem, 7vw, 4.8rem)",  // Bigger
                            letterSpacing: ".05em",
                            lineHeight: 1.05,
                            marginBottom: 18,
                        }}
                    >
                        Create{" "}
                        <span
                            style={{
                                background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                textShadow: "0 0 25px rgba(99,102,241,0.5)",
                            }}
                        >
                            Trustless
                        </span>{" "}
                        Escrow
                    </h1>

                    <p
                        style={{
                            color: "#94a3b8",
                            fontSize: "clamp(1rem, 2vw, 1.25rem)",  // Bigger subtitle
                            maxWidth: "600px",
                            margin: "0 auto",
                            lineHeight: 1.6,
                        }}
                    >
                        Lock funds on Algorand and release payments automatically when work is
                        verified — no intermediaries. No trust required.
                    </p>
                </div>

                {isAdminSession && (
                    <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 14, background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', color: '#818cf8', fontSize: '.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield size={18} /> ADMINISTRATOR: On-chain creation is restricted.
                    </div>
                )}

                {/* Step indicator */}
                <StepBar current={step} />

                {/* Card */}
                <div style={{ padding: '2rem', borderRadius: 24, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 24px 80px rgba(0,0,0,.4)' }}>

                    {/* ── Step 0: Project Details ── */}
                    {step === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Project Details</h2>
                            <Field label="Project Name" error={errors.title}>
                                <input
                                    value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Landing Page Redesign"
                                    onFocus={() => setFocused('title')} onBlur={() => setFocused('')}
                                    style={inputStyle(focused === 'title', !!errors.title)}
                                />
                            </Field>
                            <Field label="Description (optional)">
                                <textarea
                                    value={description} onChange={e => setDescription(e.target.value)}
                                    placeholder="Briefly describe the project scope and deliverables..."
                                    rows={4}
                                    onFocus={() => setFocused('desc')} onBlur={() => setFocused('')}
                                    style={{ ...inputStyle(focused === 'desc'), resize: 'vertical', minHeight: 100 }}
                                />
                            </Field>
                        </div>
                    )}

                    {/* ── Step 1: Parties ── */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Parties</h2>

                            {/* Client (read-only) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Your Wallet (Client)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.8)', flexShrink: 0 }} />
                                    <span style={{ fontFamily: 'monospace', fontSize: '.8rem', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address || 'Not connected'}</span>
                                </div>
                            </div>

                            {/* Freelancer address */}
                            <Field label="Freelancer Wallet Address" error={errors.freelancer}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        value={freelancerAddress}
                                        onChange={e => setFreelancerAddress(e.target.value)}
                                        placeholder="ALGO address (58 characters, A–Z 2–7)"
                                        onFocus={() => setFocused('freelancer')} onBlur={() => setFocused('')}
                                        style={{ ...inputStyle(focused === 'freelancer', !!errors.freelancer), paddingRight: 44 }}
                                    />
                                    {freelancerAddress.length > 0 && (
                                        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                                            {addrValid ? <Check size={18} style={{ color: '#4ade80' }} /> : <X size={18} style={{ color: '#f87171' }} />}
                                        </div>
                                    )}
                                </div>
                                {freelancerAddress.length > 0 && (
                                    <p style={{ fontSize: '.72rem', marginTop: 6, color: addrValid ? '#4ade80' : addrInvalid ? '#f87171' : '#64748b' }}>
                                        {addrValid ? '✓ Valid Algorand address' : freelancerAddress.trim() === address ? '✗ Cannot be the same as your own address' : `${freelancerAddress.length}/58 characters`}
                                    </p>
                                )}
                            </Field>
                        </div>
                    )}

                    {/* ── Step 2: Milestones ── */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Milestones</h2>
                                <button
                                    type="button" onClick={addMilestone}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', color: '#818cf8', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>

                            {milestones.map((m, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 6, marginRight: 4 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, color: '#818cf8' }}>{i + 1}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                value={m.title} placeholder="Milestone name"
                                                onChange={e => updateMilestone(i, 'title', e.target.value)}
                                                onFocus={() => setFocused(`mt${i}`)} onBlur={() => setFocused('')}
                                                style={{ ...inputStyle(focused === `mt${i}`, !!errors[`m_title_${i}`]), padding: '9px 12px', fontSize: '.85rem' }}
                                            />
                                            {errors[`m_title_${i}`] && <p style={{ color: '#f87171', fontSize: '.72rem', marginTop: 4 }}>{errors[`m_title_${i}`]}</p>}
                                        </div>
                                        <div style={{ width: 110 }}>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number" min="0.001" step="0.001"
                                                    value={m.amount} placeholder="0"
                                                    onChange={e => updateMilestone(i, 'amount', e.target.value)}
                                                    onFocus={() => setFocused(`ma${i}`)} onBlur={() => setFocused('')}
                                                    style={{ ...inputStyle(focused === `ma${i}`, !!errors[`m_amt_${i}`]), padding: '9px 12px', fontSize: '.85rem', color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700 }}
                                                />
                                                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '.65rem', color: '#475569', fontWeight: 700, pointerEvents: 'none' }}>ALGO</span>
                                            </div>
                                            {errors[`m_amt_${i}`] && <p style={{ color: '#f87171', fontSize: '.72rem', marginTop: 4 }}>{errors[`m_amt_${i}`]}</p>}
                                        </div>
                                    </div>
                                    {milestones.length > 1 && (
                                        <button onClick={() => removeMilestone(i)} style={{ marginTop: 4, padding: 8, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 10, color: '#f87171', cursor: 'pointer', flexShrink: 0 }}>
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Running total */}
                            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <span style={{ color: '#64748b', fontSize: '.85rem', fontWeight: 600 }}>Total to lock in escrow</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: totalAlgo > 0 ? '#818cf8' : '#475569', fontSize: '1.1rem' }}>{totalAlgo > 0 ? totalAlgo.toFixed(3) : '—'} ALGO</span>
                            </div>
                            {errors.milestones && <p style={{ color: '#f87171', fontSize: '.78rem' }}>{errors.milestones}</p>}
                        </div>
                    )}

                    {/* ── Step 3: Review & Submit ── */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Review & Submit</h2>

                            {/* Summary card */}
                            <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden' }}>
                                {[
                                    { label: 'Project', value: title },
                                    { label: 'Description', value: description || '—' },
                                    { label: 'You (Client)', value: `${address?.slice(0, 8)}…${address?.slice(-6)}`, mono: true, color: '#4ade80' },
                                    { label: 'Freelancer', value: `${freelancerAddress.slice(0, 8)}…${freelancerAddress.slice(-6)}`, mono: true, color: '#60a5fa' },
                                    { label: 'Milestones', value: `${milestones.length} milestone${milestones.length !== 1 ? 's' : ''}` },
                                    { label: 'Total', value: `${totalAlgo.toFixed(3)} ALGO`, mono: true, color: '#818cf8', bold: true },
                                ].map(({ label, value, mono, color, bold }, idx) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px', background: idx % 2 === 0 ? 'rgba(255,255,255,.025)' : 'transparent', gap: 16 }}>
                                        <span style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>{label}</span>
                                        <span style={{ fontSize: '.85rem', fontFamily: mono ? 'monospace' : undefined, color: color ?? '#cbd5e1', fontWeight: bold ? 800 : 500, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Milestone breakdown */}
                            <div>
                                <p style={{ fontSize: '.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Milestone Breakdown</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {milestones.map((m, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                                            <span style={{ fontSize: '.82rem', color: '#94a3b8' }}><span style={{ color: '#475569', marginRight: 8, fontWeight: 700 }}>#{i + 1}</span>{m.title}</span>
                                            <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700, fontSize: '.82rem' }}>{Number(m.amount).toFixed(3)} ALGO</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {errors.submit && (
                                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', fontSize: '.85rem' }}>
                                    {errors.submit}
                                </div>
                            )}

                            {!isConnected && (
                                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(249,115,22,.07)', border: '1px solid rgba(249,115,22,.2)', color: '#fb923c', fontSize: '.85rem', fontWeight: 600 }}>
                                    ⚠ Connect your wallet before submitting.
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !isConnected || isBanned || isAdminSession}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                                    background: (loading || !isConnected || isBanned || isAdminSession) ? 'rgba(99,102,241,.25)' : 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
                                    color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: (!isConnected || isBanned || isAdminSession) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    boxShadow: (!isConnected || loading) ? 'none' : '0 8px 32px rgba(99,102,241,.35)',
                                    transition: 'all .3s',
                                    opacity: (!isConnected || isBanned || isAdminSession) ? .5 : 1,
                                }}
                            >
                                {loading ? (
                                    <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Submitting to Algorand...</>
                                ) : (
                                    <><ShieldCheck size={20} /> Create Trustless Escrow</>
                                )}
                            </button>
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    )}

                    {/* ── Navigation ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 28 }}>
                        {step > 0 ? (
                            <button onClick={back} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' }}>
                                <ChevronLeft size={16} /> Back
                            </button>
                        ) : <div />}

                        {step < 3 && (
                            <button onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(99,102,241,.8),rgba(139,92,246,.8))', border: '1px solid rgba(99,102,241,.3)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem', boxShadow: '0 4px 16px rgba(99,102,241,.2)' }}>
                                Continue <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Wallet not connected banner */}
                {!isConnected && step === 3 && (
                    <p style={{ textAlign: 'center', color: '#f87171', fontSize: '.85rem', marginTop: 16 }}>
                        Please connect your wallet to submit this escrow.
                    </p>
                )}
            </div>
        </div>
    );
}
