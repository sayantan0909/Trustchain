'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { Plus, LayoutGrid, ListChecks, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export default function Dashboard() {
    const { address, isConnected } = useWallet();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (address) {
            fetchProjects();
        }
    }, [address]);

    const fetchProjects = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*, milestones(*)')
            .or(`client_address.eq.${address},freelancer_address.eq.${address}`);

        if (data) setProjects(data);
        setLoading(false);
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="pt-32 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-6">Connect your wallet to view projects</h1>
                    <p className="text-slate-400 mb-8">You need to be connected to the Algorand TestNet to use TrustChain.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="pt-32 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                        <p className="text-slate-400 font-mono text-sm">{address}</p>
                    </div>

                    <Link href="/projects/create" className="btn-primary">
                        <Plus size={20} /> Create New Project
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: "Active Projects", value: projects.length, icon: <LayoutGrid className="text-blue-400" /> },
                        { label: "Milestones Paid", value: "0", icon: <ListChecks className="text-green-400" /> },
                        { label: "Total Locked", value: "0 ALGO", icon: <ArrowUpRight className="text-purple-400" /> },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-xl">
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">{stat.label}</p>
                                <p className="text-2xl font-bold font-mono">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Project List */}
                <h2 className="text-2xl font-bold mb-6">Recent Projects</h2>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => <div key={i} className="glass-card h-48 animate-pulse bg-white/5" />)}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="glass-card text-center py-20 border-dashed border-2">
                        <p className="text-slate-400 mb-6">No projects found. Start by creating your first escrow!</p>
                        <Link href="/projects/create" className="text-blue-400 hover:text-blue-300 font-semibold underline">
                            Create a project →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <div className="glass-card group hover:translate-y-[-4px] transition-transform">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{project.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'
                                            }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-6 line-clamp-2">{project.description}</p>

                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Amount</span>
                                            <span className="font-mono font-bold text-blue-100">{project.total_amount} ALGO</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Milestones</span>
                                            <span className="font-mono font-bold text-blue-100">{project.milestones?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
