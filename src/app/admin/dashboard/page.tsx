'use client';

import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Users as UsersIcon, Ban, CheckCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [escrows, setEscrows] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [usersRes, reportsRes, escrowsRes] = await Promise.all([
            supabase.from('users').select('*').order('created_at', { ascending: false }),
            supabase.from('reports').select('*').order('created_at', { ascending: false }),
            supabase.from('escrows').select('*').order('created_at', { ascending: false })
        ]);

        if (usersRes.data) setUsers(usersRes.data);
        if (reportsRes.data) setReports(reportsRes.data);
        if (escrowsRes.data) setEscrows(escrowsRes.data);
        setLoading(false);
    };

    const toggleBan = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('users').update({ banned: !currentStatus }).eq('id', userId);
        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, banned: !currentStatus } : u));
        } else {
            alert('Failed to update ban status. ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="pt-32 px-6 max-w-7xl mx-auto text-center text-slate-400">Loading admin data...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="pt-32 px-6 max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
                    <p className="text-slate-400">Manage platform users and view reports.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Users Management */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <UsersIcon className="text-blue-400" />
                            <h2 className="text-2xl font-bold">Users Directory</h2>
                        </div>

                        <div className="glass-card overflow-hidden !p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="p-4 rounded-tl-xl border-b border-white/5">Wallet</th>
                                        <th className="p-4 border-b border-white/5">Role</th>
                                        <th className="p-4 rounded-tr-xl border-b border-white/5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-mono text-sm text-slate-300">
                                                {u.wallet_address.slice(0, 10)}...{u.wallet_address.slice(-4)}
                                            </td>
                                            <td className="p-4 capitalize text-sm">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                                                    u.role === 'client' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.role !== 'admin' && (
                                                    <button
                                                        onClick={() => toggleBan(u.id, u.banned)}
                                                        className={`flex items-center gap-2 ml-auto text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${u.banned
                                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {u.banned ? <><Ban size={14} /> Banned</> : <><CheckCircle size={14} /> Active</>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Escrows List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <ShieldAlert className="text-purple-400" />
                            <h2 className="text-2xl font-bold">All Escrows (Read-Only)</h2>
                        </div>

                        <div className="space-y-4">
                            {escrows.length === 0 ? (
                                <div className="glass-card text-center py-12 text-slate-500">
                                    No escrows created yet.
                                </div>
                            ) : escrows.map(e => (
                                <div key={e.id} className={`glass-card border-l-2 ${e.status === 'funded' ? 'border-blue-500' : 'border-slate-700'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <Link href={`/escrow/${e.id}`} className="font-bold text-blue-400 hover:underline flex items-center gap-1">
                                            Escrow <span className="font-mono">#{e.id.slice(0, 8)}</span>
                                        </Link>
                                        <span className="text-xs font-bold uppercase py-1 px-2 rounded bg-slate-800 text-slate-400">
                                            {e.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-sm font-mono text-slate-400">
                                        <span>Client: {e.client_wallet.slice(0, 10)}...</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                        <span className="text-xs text-slate-500">Total Locked</span>
                                        <span className="font-mono font-bold text-blue-100">{e.total_amount} ALGO</span>
                                    </div>
                                    {/* Admins intentionally lack action buttons. They cannot move funds. */}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reports List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <ShieldAlert className="text-orange-400" />
                            <h2 className="text-2xl font-bold">Platform Reports</h2>
                        </div>

                        <div className="space-y-4">
                            {reports.length === 0 ? (
                                <div className="glass-card text-center py-12 text-slate-500">
                                    No reports filed yet.
                                </div>
                            ) : reports.map(r => (
                                <div key={r.id} className="glass-card border-l-2 border-orange-500">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-slate-400">
                                            Reporter: {r.reporter_wallet.slice(0, 8)}...
                                        </span>
                                        {r.escrow_id && (
                                            <Link href={`/escrow/${r.escrow_id}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                                Escrow <span className="font-mono">#{r.escrow_id.slice(0, 8)}</span>
                                            </Link>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-300">{r.reason}</p>
                                    <p className="text-[10px] text-slate-500 mt-4 text-right">
                                        {new Date(r.created_at).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
