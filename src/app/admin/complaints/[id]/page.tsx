'use client';

import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ShieldCheck, Clock, ExternalLink, MessageSquare, Save, CheckCircle2, Search, Loader2 } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function ComplaintDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [complaint, setComplaint] = useState<any>(null);
    const [escrow, setEscrow] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [status, setStatus] = useState("");
    const [adminNotes, setAdminNotes] = useState("");

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const complaintDoc = await getDoc(doc(db, 'complaints', id as string));
            if (!complaintDoc.exists()) {
                router.push('/admin/dashboard');
                return;
            }

            const c = { id: complaintDoc.id, ...complaintDoc.data() };
            setComplaint(c);
            setStatus(c.status);
            setAdminNotes(c.admin_notes || "");

            if (c.escrow_id) {
                const escrowDoc = await getDoc(doc(db, 'escrows', c.escrow_id));
                if (escrowDoc.exists()) {
                    setEscrow({ id: escrowDoc.id, ...escrowDoc.data() });
                }

                const mq = query(
                    collection(db, "milestones"),
                    where("escrow_id", "==", c.escrow_id),
                    orderBy("milestone_index")
                );
                const mSnap = await getDocs(mq);
                setMilestones(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (error) {
            console.error("Error fetching complaint detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const user = auth.currentUser;
        if (!user) {
            alert("No authenticated admin session found.");
            setSaving(false);
            return;
        }

        try {
            await updateDoc(doc(db, 'complaints', id as string), {
                status,
                admin_notes: adminNotes,
                updated_at: serverTimestamp()
            });

            // Log resolution
            await addDoc(collection(db, 'admin_logs'), {
                admin_id: user.uid,
                action: 'COMPLAINT_RESOLVE',
                target_wallet: complaint.against_wallet,
                metadata: { complaint_id: id, status: status, notes: adminNotes },
                timestamp: serverTimestamp()
            });

            alert("Complaint updated successfully.");
            fetchDetail();
        } catch (error: any) {
            alert("Failed to update: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
            <Navbar />
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading Case Files...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-20 bg-slate-950">
            <Navbar />

            <div className="pt-32 px-6 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/admin/dashboard" className="text-blue-400 hover:underline text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <Search size={12} /> Back to Queue
                            </Link>
                        </div>
                        <h1 className="text-4xl font-bold text-white uppercase tracking-tighter flex items-center gap-4">
                            Case <span className="text-blue-500 font-mono">#{complaint.id.slice(0, 8)}</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${status === 'resolved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            status === 'under_review' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                            {status.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Complaint Details & Admin Actions */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Investigation Notes */}
                        <div className="glass-card !border-blue-500/20">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <MessageSquare className="text-blue-400" /> Admin Investigation
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['open', 'under_review', 'resolved'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setStatus(s)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${status === s ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                                                    }`}
                                            >
                                                {s.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resolution Notes</label>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add internal notes about the resolution..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[150px] focus:outline-none focus:border-blue-500 text-sm text-slate-300"
                                    ></textarea>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary w-full py-4 justify-center"
                                >
                                    {saving ? 'Saving...' : <><Save size={20} /> Update Case File</>}
                                </button>
                            </div>
                        </div>

                        {/* Evidence & Description */}
                        <div className="glass-card">
                            <h2 className="text-xl font-bold mb-4">Complaint Description</h2>
                            <p className="text-slate-300 leading-relaxed mb-8 bg-white/5 p-6 rounded-2xl border border-white/5 italic">
                                "{complaint.description}"
                            </p>

                            <h2 className="text-xl font-bold mb-4">Evidence & Proof</h2>
                            <div className="space-y-3">
                                {complaint.evidence_url ? (
                                    <div className="flex flex-col gap-4">
                                        {complaint.evidence_url.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video relative group">
                                                <img
                                                    src={complaint.evidence_url}
                                                    alt="Evidence Screenshot"
                                                    className="w-full h-full object-contain"
                                                />
                                                <a
                                                    href={complaint.evidence_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <div className="p-3 bg-blue-600 rounded-full text-white shadow-xl">
                                                        <ExternalLink size={24} />
                                                    </div>
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800 group hover:border-blue-500/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                                        <ExternalLink size={20} />
                                                    </div>
                                                    <span className="text-sm font-mono text-slate-400 max-w-[200px] truncate">{complaint.evidence_url}</span>
                                                </div>
                                                <a
                                                    href={complaint.evidence_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-blue-400 hover:underline"
                                                >
                                                    View Source
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic text-sm">No evidence URLs provided by reporter.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Escrow Context (Read-Only) */}
                    <div className="space-y-8">
                        <div className="glass-card border-l-4 border-purple-500/50">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 flex items-center justify-between">
                                Escrow Snapshot
                                <ShieldCheck size={16} className="text-purple-400" />
                            </h3>

                            <div className="space-y-4 mb-6">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Status</p>
                                    <p className="text-sm font-bold uppercase tracking-wider text-purple-100">{escrow?.status}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Lockup Amount</p>
                                    <p className="text-sm font-bold font-mono text-blue-100">{escrow?.total_amount} ALGO</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Freelancer (Reporter)</p>
                                    <p className="text-[10px] font-mono text-slate-400 truncate">{complaint.raised_by_wallet}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Client (Target)</p>
                                    <p className="text-[10px] font-mono text-slate-400 truncate">{complaint.against_wallet}</p>
                                </div>
                            </div>

                            <Link
                                href={`/escrow/${complaint.escrow_id}`}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-white/5"
                            >
                                <Search size={16} /> Open Case On-Chain
                            </Link>
                        </div>

                        {/* Milestone Status */}
                        <div className="glass-card">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-tighter">Milestone Verification</h3>
                            <div className="space-y-3">
                                {milestones.map((m, i) => (
                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-600">#{i + 1}</span>
                                            <span className="text-xs font-bold text-slate-300 truncate max-w-[100px]">{m.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {m.status === 'approved' ? (
                                                <CheckCircle2 size={14} className="text-green-500" />
                                            ) : (
                                                <Clock size={14} className="text-slate-500" />
                                            )}
                                            <span className="text-[10px] font-mono uppercase text-slate-500">{m.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
