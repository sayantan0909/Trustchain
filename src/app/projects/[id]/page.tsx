'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, CheckCircle, Clock, ExternalLink, ArrowRight } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function ProjectDetail() {
    const { id } = useParams();
    const { address, isConnected } = useWallet();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchProject();
    }, [id]);

    const fetchProject = async () => {
        setLoading(true);
        const { data: p } = await supabase.from('escrows').select('*').eq('id', id).single();
        const { data: m } = await supabase.from('milestones').select('*').eq('escrow_id', id).order('milestone_index', { ascending: true });

        setProject(p);
        setMilestones(m || []);
        setLoading(false);
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading project...</div>;
    if (!project) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Project not found</div>;

    const isClient = address === project.client_wallet;
    const isFreelancer = address === project.freelancer_wallet;

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="pt-32 px-6 max-w-5xl mx-auto">
                {/* Project Header */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                {project.status}
                            </span>
                            <span className="text-slate-500 text-sm font-mono">ID: {project.id.slice(0, 8)}</span>
                        </div>
                        <h1 className="text-5xl font-bold mb-6 text-white uppercase tracking-tighter">
                            Escrow <span className="text-blue-500 font-mono">#{project.id.slice(0, 8)}</span>
                        </h1>

                        <div className="flex flex-wrap gap-4">
                            <div className="px-6 py-4 glass rounded-2xl flex-1 min-w-[200px]">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Total Locked</span>
                                <span className="text-2xl font-bold font-mono text-blue-100">{project.total_amount} ALGO</span>
                            </div>
                            <div className="px-6 py-4 glass rounded-2xl flex-1 min-w-[200px]">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">App ID</span>
                                <span className="text-2xl font-bold font-mono text-purple-100">{project.app_id || 'Not Deployed'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Stakeholders</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                        <Shield size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-500">Client</p>
                                        <p className="text-sm font-mono truncate">{project.client_wallet}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                        <Shield size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-500">Freelancer</p>
                                        <p className="text-sm font-mono truncate">{project.freelancer_wallet}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {project.status === 'draft' && isClient && (
                            <button className="btn-primary w-full py-4 justify-center">
                                Fund & Deploy Escrow <ArrowRight size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Milestones Sidebar/Timeline */}
                <h2 className="text-3xl font-bold mb-8">Project Milestones</h2>
                <div className="space-y-6">
                    {milestones.map((m, i) => (
                        <div key={m.id} className={`glass-card flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 ${m.status === 'paid' ? 'border-green-500' :
                            m.status === 'approved' ? 'border-blue-500' : 'border-slate-700'
                            }`}>
                            <div className="flex items-center gap-6 flex-1 w-full">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-bold ${m.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                    m.status === 'approved' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                    {i + 1}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{m.title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
                                        <span>{m.amount} ALGO</span>
                                        <span>•</span>
                                        <span className="capitalize">{m.status}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {m.status === 'pending' && isClient && (
                                    <button className="btn-primary py-2 px-6 text-sm flex-1 md:flex-none justify-center">
                                        Approve Payout
                                    </button>
                                )}
                                {m.status === 'paid' && (
                                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm px-4">
                                        <CheckCircle size={18} /> Paid
                                    </div>
                                )}
                                {m.status === 'pending' && !isClient && (
                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm px-4 italic border border-slate-800 rounded-xl py-2">
                                        <Clock size={18} /> Awaiting Client
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
