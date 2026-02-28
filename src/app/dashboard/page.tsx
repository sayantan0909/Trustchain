'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { Plus, LayoutGrid, ListChecks, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export default function Dashboard() {
    const { address, isConnected, isAuthenticated, isBanned } = useWallet();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (address && isAuthenticated) {
            fetchProjects();
        }
    }, [address, isAuthenticated]);

    const fetchProjects = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('escrows')
            .select('*, milestones(*)')
            .or(`client_wallet.eq.${address},freelancer_wallet.eq.${address}`);

        if (data) setProjects(data);
        setLoading(false);
    };

    if (isBanned) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="pt-32 px-6 max-w-7xl mx-auto text-center">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-lg shadow-red-500/10 animate-pulse">
                        <span className="text-4xl font-black">!</span>
                    </div>
                    <h1 className="text-4xl font-bold mb-4 text-white uppercase tracking-tighter">Access Restricted</h1>
                    <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                        Your wallet has been flagged for protocol violations. Access to critical dashboard actions and funds management has been suspended.
                    </p>
                    <Link href="/" className="btn-secondary py-3 px-8">Return Home</Link>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="pt-32 px-6 max-w-7xl mx-auto text-center">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                        <LayoutGrid size={32} />
                    </div>
                    <h1 className="text-4xl font-bold mb-6">Nexus Control Center</h1>
                    <p className="text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">
                        Connect your secure Algorand wallet to access your trustless escrows, track milestones, and manage decentralized payments.
                    </p>
                    <div className="flex justify-center">
                        <div className="p-1 bg-white/5 rounded-2xl border border-white/5 inline-flex">
                            <Link href="/" className="btn-primary py-4 px-12">Connect Wallet to Begin</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const clientProjects = projects.filter(p => p.client_wallet === address);
    const freelancerProjects = projects.filter(p => p.freelancer_wallet === address);

    // Stats calculation
    const totalVolume = projects.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
    const completedMilestones = projects.reduce((acc, p) =>
        acc + (p.milestones?.filter((m: any) => m.status === 'paid').length || 0), 0
    );

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="pt-32 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
                            <LayoutGrid size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold mb-1 tracking-tight">Main Dashboard</h1>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <p className="text-slate-500 font-mono text-xs tracking-wider">{address}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <Link href="/create-escrow" className="btn-primary flex-1 md:flex-none justify-center py-4 px-8">
                            <Plus size={20} /> Create Escrow
                        </Link>
                    </div>
                </div>

                {/* Unified Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
                    {[
                        { label: "Total Escrows", value: projects.length, icon: <LayoutGrid className="text-blue-400" />, color: "blue" },
                        { label: "Milestones Paid", value: completedMilestones, icon: <ListChecks className="text-green-400" />, color: "green" },
                        { label: "Protocol Volume", value: `${totalVolume} ALGO`, icon: <ArrowUpRight className="text-purple-400" />, color: "purple" },
                        { label: "Active Roles", value: (clientProjects.length > 0 ? 1 : 0) + (freelancerProjects.length > 0 ? 1 : 0), icon: <ShieldCheck className="text-orange-400" />, color: "orange" },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card flex items-center gap-5 hover:bg-white/5 transition-all border-b-2 border-transparent hover:border-white/10 group">
                            <div className={`p-3 bg-${stat.color}-500/10 rounded-2xl group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-xl font-bold font-mono text-white">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="glass-card h-48 animate-pulse bg-white/5 !border-white/5 opacity-50" />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="glass-card text-center py-32 border-dashed border-2 border-slate-800 bg-slate-900/50">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Plus size={32} className="text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">No Active Participations</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            You are not currently a client or a freelancer in any escrow contracts. Start a new project to initialize your dashboard.
                        </p>
                        <Link href="/create-escrow" className="btn-primary py-4 px-12 inline-flex">
                            Initiate First Escrow
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Client Section */}
                        {clientProjects.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                                    <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Managing as Client</h2>
                                    <span className="bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest">{clientProjects.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {clientProjects.map(p => <ProjectCard key={p.id} project={p} />)}
                                </div>
                            </section>
                        )}

                        {/* Freelancer Section */}
                        {freelancerProjects.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                                    <div className="w-8 h-8 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center">
                                        <ListChecks size={18} />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Contributing as Freelancer</h2>
                                    <span className="bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest">{freelancerProjects.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

function ProjectCard({ project }: { project: any }) {
    return (
        <Link href={`/escrow/${project.id}`}>
            <div className="glass-card group hover:scale-[1.02] transition-all duration-300 !p-0 overflow-hidden relative border border-white/5 hover:border-blue-500/30 shadow-xl">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-1">Contract ID</p>
                            <h3 className="font-mono font-bold text-white tracking-tighter">
                                #{project.id.slice(0, 12)}
                            </h3>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${project.status === 'active' || project.status === 'funded'
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                            : 'bg-slate-800 text-slate-500 border border-white/5'
                            }`}>
                            {project.status}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Locked Liquidity</span>
                            <span className="font-mono font-bold text-blue-400">{project.total_amount} ALGO</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Milestones</span>
                            <span className="text-white font-bold">{project.milestones?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/[0.02] px-6 py-4 flex justify-between items-center border-t border-white/5 group-hover:bg-blue-500/5 transition-colors">
                    <p className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">Manage Escrow</p>
                    <ArrowUpRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
            </div>
        </Link>
    );
}

