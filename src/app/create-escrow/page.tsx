'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useState } from "react";
import { Plus, Trash2, ShieldCheck, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { deployContract } from "@/lib/algorandService";

export const dynamic = 'force-dynamic';

export default function CreateProject() {
    const { address, isConnected, isBanned, isAdminSession } = useWallet();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        freelancer_address: '',
    });

    const [milestones, setMilestones] = useState([
        { title: 'Initial Milestone', description: '', amount: 0 }
    ]);

    const addMilestone = () => {
        setMilestones([...milestones, { title: '', description: '', amount: 0 }]);
    };

    const removeMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const updateMilestone = (index: number, field: string, value: any) => {
        const newMilestones = [...milestones];
        newMilestones[index] = { ...newMilestones[index], [field]: value };
        setMilestones(newMilestones);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address || !isConnected || isBanned || isAdminSession) return;

        setLoading(true);
        try {
            const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);

            // 1. Create the Escrow Document
            const escrowRef = await addDoc(collection(db, "escrows"), {
                client_wallet: address,
                freelancer_wallet: formData.freelancer_address,
                total_amount: totalAmount,
                status: 'funded',
                created_at: serverTimestamp()
            });

            // 2. Create Milestones with Batch Write
            const batch = writeBatch(db);
            milestones.forEach((m, i) => {
                const mRef = doc(collection(db, "milestones"));
                batch.set(mRef, {
                    escrow_id: escrowRef.id,
                    milestone_index: i,
                    title: m.title,
                    description: m.description || '',
                    amount: m.amount,
                    status: 'pending',
                    created_at: serverTimestamp()
                });
            });

            await batch.commit();

            router.push(`/escrow/${escrowRef.id}`);
        } catch (error: any) {
            console.error('Error creating project in Firestore:', error);
            const message = error.message || error.details || JSON.stringify(error);
            alert(`Failed to create project: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="pt-32 px-6 max-w-3xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-4">Create New Project</h1>
                    <p className="text-slate-400">Define your milestones and secure funds in escrow.</p>
                    {isAdminSession && (
                        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 text-sm font-bold flex items-center gap-3">
                            <Shield size={20} />
                            ADMINISTRATOR ACCESS: On-chain project creation is restricted.
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="glass-card space-y-6">

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-400">Freelancer Wallet Address (Algorand)</label>
                            <input
                                required
                                value={formData.freelancer_address}
                                onChange={e => setFormData({ ...formData, freelancer_address: e.target.value })}
                                placeholder="XSY... (58 characters)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Milestones</h2>
                            <button
                                type="button"
                                onClick={addMilestone}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                            >
                                <Plus size={16} /> Add Milestone
                            </button>
                        </div>

                        <div className="space-y-4">
                            {milestones.map((m, i) => (
                                <div key={i} className="glass-card flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
                                    <div className="flex-1 w-full space-y-2">
                                        <label className="text-xs font-semibold text-slate-500">Milestone {i + 1} Name</label>
                                        <input
                                            required
                                            value={m.title}
                                            onChange={e => updateMilestone(i, 'title', e.target.value)}
                                            placeholder="Milestone title"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div className="w-full md:w-32 space-y-2">
                                        <label className="text-xs font-semibold text-slate-500">ALGO</label>
                                        <input
                                            required
                                            type="number"
                                            value={m.amount}
                                            onChange={e => updateMilestone(i, 'amount', e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    {milestones.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMilestone(i)}
                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors mb-2"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            disabled={loading || !isConnected || isBanned || isAdminSession}
                            type="submit"
                            className={`btn-primary w-full py-4 text-lg ${(isBanned || isAdminSession) ? 'opacity-50 cursor-not-allowed bg-slate-900/50 grayscale' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    Creating Project...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={24} />
                                    Create Trustless Escrow
                                </>
                            )}
                        </button>
                        {!isConnected && (
                            <p className="text-center text-red-400 text-sm mt-4">Please connect your wallet to continue.</p>
                        )}
                        {isBanned && (
                            <p className="text-center text-red-400 font-bold text-sm mt-4 uppercase tracking-widest">Action Restricted: Wallet is Suspended</p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
