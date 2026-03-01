'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    doc, collection, query, where, updateDoc, addDoc,
    serverTimestamp, orderBy, onSnapshot
} from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
    Shield, CheckCircle, Clock, ArrowRight, ShieldAlert, Upload,
    Loader2, ExternalLink, AlertTriangle, X, CheckCheck, Copy,
    Check, RotateCcw
} from "lucide-react";
import { approveEscrow, deployContract, fundEscrow, refundEscrow } from "@/lib/algorandService";
import { algodClient, compileProgram } from "@/lib/algorand";

export const dynamic = 'force-dynamic';

/* ─── Canvas confetti ────────────────────────────────────────────── */
function Confetti({ active }: { active: boolean }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!active) return;
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const COLS = ['#8b5cf6', '#ec4899', '#00d4ff', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];
        type Bit = { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; angle: number; spin: number };
        const bits: Bit[] = Array.from({ length: 180 }, () => ({
            x: Math.random() * canvas.width, y: -40 - Math.random() * 200,
            vx: (Math.random() - .5) * 4, vy: 3 + Math.random() * 5,
            w: 8 + Math.random() * 9, h: 4 + Math.random() * 6,
            color: COLS[Math.floor(Math.random() * COLS.length)],
            angle: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * .2,
        }));
        let raf: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            bits.forEach(b => {
                b.y += b.vy; b.x += b.vx; b.vy += .1; b.angle += b.spin;
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

/* ─── Toast system ───────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info';
interface ToastMsg { id: number; type: ToastType; msg: string; txId?: string }

function Toasts({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9990, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 14,
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    background: t.type === 'success' ? 'rgba(34,197,94,.1)' : t.type === 'error' ? 'rgba(239,68,68,.1)' : 'rgba(99,102,241,.1)',
                    border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,.3)' : t.type === 'error' ? 'rgba(239,68,68,.3)' : 'rgba(99,102,241,.3)'}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,.5)', animation: 'toastIn .3s ease',
                }}>
                    <div style={{ marginTop: 1, flexShrink: 0 }}>
                        {t.type === 'success' ? <CheckCheck size={17} style={{ color: '#4ade80' }} /> :
                            t.type === 'error' ? <AlertTriangle size={17} style={{ color: '#f87171' }} /> :
                                <Shield size={17} style={{ color: '#818cf8' }} />}
                    </div>
                    <div style={{ flex: 1, fontSize: '.875rem', lineHeight: 1.5 }}>
                        <p style={{ color: '#fff', fontWeight: 600, marginBottom: t.txId ? 5 : 0 }}>{t.msg}</p>
                        {t.txId && (
                            <a href={`https://testnet.algoexplorer.io/tx/${t.txId}`} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#60a5fa', fontSize: '.72rem', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                                View on AlgoExplorer <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                    <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, flexShrink: 0 }}>
                        <X size={14} />
                    </button>
                </div>
            ))}
            <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
        </div>
    );
}

function useToast() {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const counter = useRef(0);
    const add = useCallback((msg: string, type: ToastType = 'info', txId?: string) => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, type, msg, txId }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 7000);
    }, []);
    const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    return { toasts, toast: add, removeToast: remove };
}

/* ─── Copy to clipboard button ───────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };
    return (
        <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, color: copied ? '#4ade80' : '#475569', transition: 'color .2s', display: 'inline-flex', alignItems: 'center' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
    );
}

/* ─── Status badge ───────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; dot: string }> = {
        funded: { bg: 'rgba(59,130,246,.1)', color: '#60a5fa', dot: '#60a5fa' },
        active: { bg: 'rgba(34,197,94,.1)', color: '#4ade80', dot: '#4ade80' },
        completed: { bg: 'rgba(168,85,247,.1)', color: '#c084fc', dot: '#c084fc' },
        refunded: { bg: 'rgba(249,115,22,.1)', color: '#fb923c', dot: '#fb923c' },
    };
    const s = map[status] ?? { bg: 'rgba(71,85,105,.2)', color: '#94a3b8', dot: '#94a3b8' };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, background: s.bg, border: `1px solid ${s.color}35`, fontSize: '.7rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: s.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
            {status}
        </span>
    );
}

/* ─── Aurora CSS ─────────────────────────────────────────────────── */
const AURORA_CSS = `
@keyframes eda{0%,100%{transform:translateY(0) skewY(-3deg);opacity:.12}50%{transform:translateY(-38px) skewY(2deg);opacity:.17}}
@keyframes edb{0%,100%{transform:translateY(0) skewY(4deg);opacity:.10}50%{transform:translateY(30px) skewY(-2deg);opacity:.15}}
.ed1{position:absolute;left:-20%;right:-20%;top:12%;height:250px;background:linear-gradient(180deg,transparent,rgba(139,92,246,.5),transparent);filter:blur(70px);animation:eda 9s ease-in-out infinite;pointer-events:none}
.ed2{position:absolute;left:-20%;right:-20%;top:55%;height:210px;background:linear-gradient(180deg,transparent,rgba(0,212,255,.4),transparent);filter:blur(90px);animation:edb 12s ease-in-out infinite;pointer-events:none}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes paidPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
`;

/* ─── Page ───────────────────────────────────────────────────────── */
export default function EscrowDetail() {
    const { id } = useParams();
    const { address, isBanned, isAdminSession, signTransactions } = useWallet();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toasts, toast, removeToast } = useToast();

    const [confetti, setConfetti] = useState(false);
    const [deployingContract, setDeployingContract] = useState(false);
    const [approvingMilestone, setApprovingMilestone] = useState<string | null>(null);
    const [refunding, setRefunding] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [reportSubmitting, setReportSubmitting] = useState(false);

    /* ── Real-time Firestore listeners ── */
    useEffect(() => {
        if (!id) return;

        // Escrow doc
        const unsub1 = onSnapshot(doc(db, 'escrows', id as string), snap => {
            if (snap.exists()) setProject({ id: snap.id, ...snap.data() });
            setLoading(false);
        }, err => { console.error('escrow onSnapshot:', err); setLoading(false); });

        // Milestones collection
        const mq = query(
            collection(db, 'milestones'),
            where('escrow_id', '==', id as string),
            orderBy('milestone_index')
        );
        const unsub2 = onSnapshot(mq, snap => {
            setMilestones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, err => console.error('milestones onSnapshot:', err));

        return () => { unsub1(); unsub2(); };
    }, [id]);

    /* ── Submit work (freelancer) ── */
    const submitWork = async (milestoneId: string) => {
        if (isBanned) { toast('Your wallet has been suspended.', 'error'); return; }
        try {
            await updateDoc(doc(db, 'milestones', milestoneId), { status: 'submitted', submitted_at: serverTimestamp() });
            toast('Work marked as completed — awaiting client approval.', 'success');
        } catch (err: any) {
            console.error('submitWork:', err);
            toast('Failed: ' + err.message, 'error');
        }
    };

    /* ── Approve milestone ── */
    const approveMilestone = async (milestoneId: string) => {
        if (isBanned) { toast('Your wallet has been suspended.', 'error'); return; }
        if (!address || !signTransactions || (!project?.app_id && !project?.contract_address)) {
            toast('Wallet not connected or contract not deployed.', 'error'); return;
        }

        try {
            setApprovingMilestone(milestoneId);

            const paidCount = milestones.filter(m => m.status === 'paid').length;
            const txId = await approveEscrow(
                signTransactions,
                address,
                Number(project.app_id || project.contract_address),
                milestoneId,
                project.freelancer_wallet || project.freelancer_address,
                id as string,
                Number(project.milestones_total || milestones.length),
                paidCount
            );

            toast('Payment released to freelancer!', 'success', txId);
            setConfetti(true);
            setTimeout(() => setConfetti(false), 3500);
        } catch (err: any) {
            console.error('approveMilestone:', err);

            if (err.name === 'WalletDisconnectedError') {
                throw err;
            }

            toast('Failed: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setApprovingMilestone(null);
        }
    };

    /* ── Deploy contract ── */
    const deployContractHandler = async () => {
        try {
            setDeployingContract(true);
            if (isBanned) { toast('Your wallet has been suspended.', 'error'); return; }
            if (!address || !signTransactions || !project || !id) { toast('Connect your wallet first.', 'error'); return; }

            const [ar, cr] = await Promise.all([fetch('/teal/escrow_approval.teal'), fetch('/teal/escrow_clear.teal')]);
            if (!ar.ok || !cr.ok) throw new Error('TEAL files not found in /public/teal/');
            const [aText, cText] = await Promise.all([ar.text(), cr.text()]);

            // Use compileProgram which properly converts the text to Uint8Array before sending to Algonode to prevent fetch errors
            const [aBc, cBc] = await Promise.all([
                compileProgram(aText),
                compileProgram(cText)
            ]);

            const n = milestones.length;
            const { appId, appAddress } = await deployContract(signTransactions, address, project.freelancer_wallet, n, Math.floor(project.total_amount / n * 1_000_000), aBc, cBc);
            await fundEscrow(signTransactions, address, appAddress, project.total_amount * 1_000_000 + 150_000);

            if (!appId || Number(appId) === 0) {
                throw new Error('deployContract returned invalid appId: ' + appId);
            }

            // Immediate local state update for instant UI response before Firestore listener catches up
            setProject((prev: any) => prev ? ({
                ...prev,
                app_id: Number(appId),
                app_address: String(appAddress),
                status: 'funded',
                contract_address: String(appId)
            }) : prev);

            await updateDoc(doc(db, 'escrows', id as string), {
                contract_address: String(appId), // Kept for backwards compatibility with any remaining references
                app_id: Number(appId),           // force Number — never string, never 0, never undefined
                app_address: String(appAddress),
                status: 'funded',
                deployed_at: serverTimestamp(),
            });
            toast('Contract deployed & funded!', 'success');
        } catch (err: any) {
            if (
                err?.message?.includes('Operation cancelled') ||
                err?.message?.includes('User Rejected Request') ||
                err?.message?.includes('user rejected')
            ) {
                return; // User intentionally cancelled; fail silently
            }

            console.error('deploy:', err);
            toast('Deploy failed: ' + err.message, 'error');
        } finally {
            setDeployingContract(false);
        }
    };

    /* ── Refund ── */
    const handleRefund = async () => {
        setShowRefundModal(false);
        if (!address || !signTransactions || (!project?.app_id && !project?.contract_address)) { toast('Cannot refund — no contract.', 'error'); return; }

        try {
            setRefunding(true);
            await refundEscrow(
                signTransactions,
                address,
                Number(project.app_id || project.contract_address)
            );

            await updateDoc(doc(db, 'escrows', id as string), { status: 'refunded', refunded_at: serverTimestamp() });
            toast('Escrow refunded successfully.', 'success');
        } catch (err: any) {
            console.error('refund:', err);

            if (err.name === 'WalletDisconnectedError') {
                throw err;
            }

            toast('Refund failed: ' + err.message, 'error');
        } finally {
            setRefunding(false);
        }
    };

    /* ── Report ── */
    const handleReport = async () => {
        if (!reportReason || !address || isBanned || !id) return;
        setReportSubmitting(true);
        try {
            let evidenceUrl = '';
            if (reportFile) evidenceUrl = await uploadToCloudinary(reportFile);
            await addDoc(collection(db, 'complaints'), {
                escrow_id: id, raised_by_wallet: address, against_wallet: project?.client_wallet,
                description: reportReason, evidence_url: evidenceUrl, status: 'open', created_at: serverTimestamp(),
            });
            toast('Complaint raised — admins will review it.', 'success');
            setShowReport(false); setReportReason(''); setReportFile(null);
        } catch (err: any) {
            toast('Failed: ' + err.message, 'error');
        } finally { setReportSubmitting(false); }
    };

    /* ── Derived state ── */
    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (!project) return (
        <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            Escrow not found.
        </div>
    );

    /* ── Derived state for UI ── */
    const ms = milestones || [];
    const hasContract = !!(project?.app_id && Number(project.app_id) > 0);
    const isClient = address === project?.client_wallet || address === project?.client_address;
    const isFreelancer = address === project?.freelancer_wallet || address === project?.freelancer_address;
    const paidCount = ms.filter(m => m.status === 'paid').length;
    const currentMilestone = ms.find(m => m.status === 'pending' || m.status === 'submitted');
    const canReport = isFreelancer && milestones.some(m => m.submitted_at && m.status === 'pending');

    // Client-only buttons
    const showDeploy = !hasContract && isClient;
    const showApprove = hasContract && isClient && currentMilestone?.status === 'submitted';
    const showRefund = hasContract && isClient && project?.status !== 'completed';

    // Freelancer-only button  
    const showSubmit = hasContract && isFreelancer && currentMilestone?.status === 'pending';

    return (
        <div style={{ minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden', paddingBottom: 100 }}>
            <style>{AURORA_CSS}</style>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div className="ed1" /><div className="ed2" />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(139,92,246,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px)', backgroundSize: '80px 80px', opacity: .4 }} />
            </div>

            <Confetti active={confetti} />
            <Navbar />
            <Toasts toasts={toasts} remove={removeToast} />

            <div style={{ position: 'relative', zIndex: 10, paddingTop: 120, paddingLeft: 24, paddingRight: 24, maxWidth: 1100, margin: '0 auto' }}>

                {/* ════════ HEADER ════════ */}
                <div style={{ marginBottom: 48 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <StatusBadge status={project.status} />
                            {canReport && (
                                <button onClick={() => setShowReport(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', color: '#fb923c', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>
                                    <ShieldAlert size={12} /> Raise Complaint
                                </button>
                            )}
                        </div>
                        <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: '.72rem', background: 'rgba(255,255,255,.04)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.06)' }}>
                            ID: {project.id}
                        </div>
                    </div>

                    <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(2.5rem,6vw,4rem)', color: '#fff', letterSpacing: '.03em', lineHeight: 1, marginBottom: 6 }}>
                        {project.title || `Escrow #${project.id.slice(0, 8)}`}
                    </h1>
                    {project.description && (
                        <p style={{ color: '#64748b', fontSize: '.9rem', maxWidth: 680, marginBottom: 24, lineHeight: 1.7 }}>{project.description}</p>
                    )}

                    {/* Metric pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
                        {[
                            { l: 'Total Locked', v: `${project.total_amount} ALGO`, c: '#60a5fa' },
                            { l: 'Milestones', v: `${paidCount}/${ms.length} paid`, c: '#4ade80' },
                            { l: 'Contract', v: hasContract ? `App #${project.contract_address}` : 'Not Deployed', c: hasContract ? '#c084fc' : '#475569' },
                        ].map(({ l, v, c }) => (
                            <div key={l} style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', backdropFilter: 'blur(12px)' }}>
                                <p style={{ fontSize: '.6rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>{l}</p>
                                <p style={{ fontFamily: 'monospace', fontWeight: 700, color: c, fontSize: '.95rem' }}>{v}</p>
                            </div>
                        ))}
                        {hasContract && (
                            <a href={`https://testnet.algoexplorer.io/application/${project.contract_address}`} target="_blank" rel="noopener noreferrer"
                                style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '10px 16px', borderRadius: 12, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.18)', color: '#4ade80', fontSize: '.75rem', fontWeight: 700, textDecoration: 'none' }}>
                                <ExternalLink size={12} /> View Contract on AlgoExplorer
                            </a>
                        )}
                    </div>

                    {/* Stakeholders + deploy */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
                        {[
                            { role: 'Client', addr: project.client_wallet, color: '#60a5fa', icon: Shield },
                            { role: 'Freelancer', addr: project.freelancer_wallet, color: '#4ade80', icon: ShieldAlert },
                        ].map(({ role, addr, color }) => (
                            <div key={role} style={{ padding: '14px 18px', borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Shield size={16} style={{ color }} />
                                </div>
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <p style={{ fontSize: '.6rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>{role}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <p style={{ fontFamily: 'monospace', fontSize: '.75rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {addr ? `${addr.slice(0, 12)}…${addr.slice(-8)}` : '—'}
                                        </p>
                                        {addr && <CopyBtn text={addr} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Deploy button */}
                    {showDeploy && (
                        <button
                            onClick={deployContractHandler}
                            disabled={deployingContract || isBanned}
                            style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 28px', borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.9rem', boxShadow: '0 8px 24px rgba(99,102,241,.3)', opacity: (deployingContract || isBanned) ? .5 : 1 }}
                        >
                            {deployingContract ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Deploying & Funding…</> : <>Fund & Deploy Contract <ArrowRight size={18} /></>}
                        </button>
                    )}

                    {/* Freelancer Submit Work button */}
                    {showSubmit && currentMilestone && (
                        <button
                            onClick={() => submitWork(currentMilestone.id)}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all hover:scale-105"
                            style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(37,99,235,.3)' }}
                        >
                            ✅ Submit Work for Review
                        </button>
                    )}

                    {/* Refund button */}
                    {showRefund && (
                        <button
                            onClick={() => setShowRefundModal(true)}
                            disabled={refunding || isBanned}
                            style={{ marginTop: 16, marginLeft: showDeploy || showSubmit ? 12 : 0, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 14, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', color: '#fb923c', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem', opacity: (refunding || isBanned) ? .5 : 1 }}
                        >
                            <RotateCcw size={16} /> {refunding ? 'Refunding…' : 'Request Refund'}
                        </button>
                    )}
                </div>

                {/* ════════ MILESTONES ════════ */}
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '.03em', marginBottom: 18 }}>Project Milestones</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {ms.map((m, i) => {
                        const isPaid = m.status === 'paid';
                        const borderColor = isPaid ? '#22c55e' : m.status === 'approved' ? '#6366f1' : '#1e293b';
                        return (
                            <div key={m.id} style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid rgba(255,255,255,.06)`, borderLeft: `3px solid ${borderColor}`, boxShadow: isPaid ? '0 0 30px rgba(34,197,94,.07)' : 'none', transition: 'all .4s ease' }}>
                                {/* Main row */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,.03)', backdropFilter: 'blur(12px)' }}>
                                    {/* Left */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 14, background: isPaid ? 'rgba(34,197,94,.1)' : 'rgba(71,85,105,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: 'monospace', fontSize: '.9rem', color: isPaid ? '#4ade80' : '#64748b', flexShrink: 0, animation: isPaid ? 'paidPop .5s ease' : 'none' }}>
                                            {isPaid ? <CheckCircle size={20} style={{ color: '#4ade80' }} /> : i + 1}
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: 4 }}>{m.title}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: '#64748b' }}>
                                                <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>{m.amount} ALGO</span>
                                                <span>·</span>
                                                <span style={{ textTransform: 'capitalize', color: isPaid ? '#4ade80' : '#64748b' }}>{m.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {/* Client approve */}
                                        {showApprove && currentMilestone?.id === m.id && (
                                            <button
                                                disabled={isBanned || approvingMilestone === currentMilestone.id}
                                                onClick={() => approveMilestone(currentMilestone.id)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,rgba(99,102,241,.8),rgba(236,72,153,.7))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem', opacity: (isBanned || approvingMilestone === currentMilestone.id) ? .5 : 1, boxShadow: '0 4px 16px rgba(99,102,241,.25)' }}
                                            >
                                                {approvingMilestone === currentMilestone.id ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</> : <>Approve & Release <ArrowRight size={14} /></>}
                                            </button>
                                        )}
                                        {/* Client awaiting */}
                                        {m.status === 'pending' && isClient && !m.submitted_at && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(71,85,105,.3)', color: '#475569', fontSize: '.78rem', fontWeight: 600 }}>
                                                <Clock size={13} /> Awaiting Freelancer
                                            </div>
                                        )}
                                        {/* No contract */}
                                        {m.status === 'submitted' && isClient && !hasContract && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(71,85,105,.3)', color: '#475569', fontSize: '.78rem', fontWeight: 600 }}>
                                                <Clock size={13} /> Deploy Contract First
                                            </div>
                                        )}
                                        {/* Freelancer submit */}
                                        {showSubmit && currentMilestone?.id === m.id && !isAdminSession && (
                                            <button
                                                disabled={isBanned}
                                                onClick={() => submitWork(m.id)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 12, background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', color: '#a78bfa', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem', opacity: isBanned ? .5 : 1 }}
                                            >
                                                {isBanned ? 'Suspended' : 'Mark as Completed'}
                                            </button>
                                        )}
                                        {/* Freelancer waiting */}
                                        {m.status === 'submitted' && isFreelancer && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(249,115,22,.06)', border: '1px solid rgba(249,115,22,.2)', color: '#fb923c', fontSize: '.78rem', fontWeight: 600 }}>
                                                <Clock size={13} /> Awaiting Approval
                                            </div>
                                        )}
                                        {/* Paid */}
                                        {isPaid && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', color: '#4ade80', fontWeight: 700, fontSize: '.82rem', animation: 'paidPop .5s ease' }}>
                                                <CheckCircle size={14} /> Paid
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── On-chain proof bar ── */}
                                <div style={{ padding: '10px 1.5rem', background: 'rgba(0,0,0,.25)', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {m.txn_id ? (
                                        <>
                                            <span style={{ fontSize: 12 }}>✅</span>
                                            <span style={{ fontSize: '.72rem', color: '#4ade80', fontWeight: 600 }}>Verified on Algorand TestNet</span>
                                            <span style={{ color: '#1e293b' }}>·</span>
                                            <a
                                                href={`https://testnet.algoexplorer.io/tx/${m.txn_id}`}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#60a5fa', fontSize: '.72rem', fontWeight: 600, textDecoration: 'none' }}
                                            >
                                                View transaction <ExternalLink size={10} />
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: 12 }}>⏳</span>
                                            <span style={{ fontSize: '.72rem', color: '#475569', fontWeight: 600 }}>
                                                {hasContract ? 'Awaiting milestone completion' : 'Awaiting contract deployment'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ════════ REFUND MODAL ════════ */}
            {showRefundModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(2,6,23,.9)', backdropFilter: 'blur(16px)' }}>
                    <div style={{ width: '100%', maxWidth: 440, padding: '2rem', borderRadius: 24, background: 'rgba(15,23,42,.98)', border: '1px solid rgba(249,115,22,.2)', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(249,115,22,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <AlertTriangle size={22} style={{ color: '#fb923c' }} />
                        </div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: 10 }}>Confirm Refund</h2>
                        <p style={{ color: '#64748b', fontSize: '.875rem', lineHeight: 1.7, marginBottom: 24 }}>
                            This will call the smart contract to return all remaining funds to your wallet. Milestones already paid will not be affected. This action is <strong style={{ color: '#fb923c' }}>irreversible</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setShowRefundModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleRefund} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'linear-gradient(135deg,#ea580c,#dc2626)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                                Confirm Refund
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ REPORT MODAL ════════ */}
            {showReport && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(2,6,23,.85)', backdropFilter: 'blur(12px)' }}>
                    <div style={{ width: '100%', maxWidth: 480, padding: '2rem', borderRadius: 24, background: 'rgba(15,23,42,.98)', border: '1px solid rgba(249,115,22,.15)' }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fb923c', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <ShieldAlert size={20} /> File a Report
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '.875rem', lineHeight: 1.7, marginBottom: 16 }}>If you encountered an issue, detail it below. Evidence is required for admin review.</p>
                        <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Describe how the client acted unfairly..." style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 14px', minHeight: 100, color: '#fff', fontSize: '.875rem', resize: 'vertical', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
                        <div style={{ marginBottom: 20, position: 'relative', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 12, padding: 14 }}>
                            <input type="file" accept="image/*" onChange={e => setReportFile(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 1 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: '.875rem' }}>
                                <Upload size={16} />{reportFile ? reportFile.name : 'Click to upload evidence'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setShowReport(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleReport} disabled={reportSubmitting || !reportReason.trim() || !reportFile} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#ea580c', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: (reportSubmitting || !reportReason.trim() || !reportFile) ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {reportSubmitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
