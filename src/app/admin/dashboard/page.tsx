'use client';

import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Users as UsersIcon, Ban, CheckCircle, FileText, AlertCircle, BookmarkCheck, Wallet, UserX, Flag, Trash2, Clock, Activity, Fingerprint } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [escrows, setEscrows] = useState<any[]>([]);
    const [flags, setFlags] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    // Flag Form
    const [newFlag, setNewFlag] = useState({
        wallet_address: '',
        flag_type: 'warning',
        reason: '',
        expires_at: ''
    });
    const [flagging, setFlagging] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [usersRes, complaintsRes, escrowsRes, flagsRes, logsRes] = await Promise.all([
            supabase.from('users').select('*').order('created_at', { ascending: false }),
            supabase.from('complaints').select('*').order('created_at', { ascending: false }),
            supabase.from('escrows').select('*').order('created_at', { ascending: false }),
            supabase.from('wallet_flags').select('*').order('created_at', { ascending: false }),
            supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(20)
        ]);

        if (usersRes.data) setUsers(usersRes.data);
        if (complaintsRes.data) setComplaints(complaintsRes.data);
        if (escrowsRes.data) setEscrows(escrowsRes.data);
        if (flagsRes.data) setFlags(flagsRes.data);
        if (logsRes.data) setLogs(logsRes.data);
        setLoading(false);
    };

    const handleAddFlag = async () => {
        if (!newFlag.wallet_address || !newFlag.reason) return;
        setFlagging(true);

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('wallet_flags').insert({
            ...newFlag,
            expires_at: newFlag.expires_at ? new Date(newFlag.expires_at).toISOString() : null,
            created_by_admin: user?.id
        });

        if (!error) {
            // Log the action
            await supabase.from('admin_logs').insert({
                admin_id: user?.id,
                action: `FLAG_${newFlag.flag_type.toUpperCase()}`,
                target_wallet: newFlag.wallet_address,
                metadata: { reason: newFlag.reason, expires_at: newFlag.expires_at }
            });

            setNewFlag({ wallet_address: '', flag_type: 'warning', reason: '', expires_at: '' });
            fetchData();
        } else {
            alert("Error flagging wallet: " + error.message);
        }
        setFlagging(false);
    };

    const removeFlag = async (id: string, wallet: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('wallet_flags').delete().eq('id', id);
        if (!error) {
            await supabase.from('admin_logs').insert({
                admin_id: user?.id,
                action: 'REMOVE_FLAG',
                target_wallet: wallet,
                metadata: { flag_id: id }
            });
            fetchData();
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

                {/* Dashboard Overview Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
                    {[
                        {
                            label: "Total Complaints",
                            value: complaints.length,
                            icon: <FileText className="text-blue-400" />,
                            color: "blue"
                        },
                        {
                            label: "Open Cases",
                            value: complaints.filter(r => r.status === 'open' || r.status === 'under_review').length,
                            icon: <AlertCircle className="text-orange-400" />,
                            color: "orange"
                        },
                        {
                            label: "Resolved",
                            value: complaints.filter(r => r.status === 'resolved').length,
                            icon: <BookmarkCheck className="text-green-400" />,
                            color: "green"
                        },
                        {
                            label: "Total Wallets",
                            value: users.length,
                            icon: <Wallet className="text-purple-400" />,
                            color: "purple"
                        },
                        {
                            label: "Banned Users",
                            value: users.filter(u => u.banned).length,
                            icon: <UserX className="text-red-400" />,
                            color: "red"
                        },
                    ].map((widget, i) => (
                        <div key={i} className="glass-card hover:bg-white/5 transition-all group border-b-2 border-transparent hover:border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-xl bg-${widget.color}-500/10`}>
                                    {widget.icon}
                                </div>
                                <span className="text-xs font-mono text-slate-500">Live</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{widget.label}</h3>
                            <p className="text-3xl font-bold font-mono tracking-tighter">{widget.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Users & Flagging */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <Flag className="text-red-400" />
                            <h2 className="text-2xl font-bold">Wallet Security</h2>
                        </div>

                        {/* Add Flag Form */}
                        <div className="glass-card bg-red-500/5 border-red-500/10">
                            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">Flag / Restrict Wallet</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input
                                    placeholder="Wallet Address"
                                    value={newFlag.wallet_address}
                                    onChange={e => setNewFlag({ ...newFlag, wallet_address: e.target.value })}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-mono focus:border-red-500/50 outline-none"
                                />
                                <select
                                    value={newFlag.flag_type}
                                    onChange={e => setNewFlag({ ...newFlag, flag_type: e.target.value })}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-red-500/50 outline-none"
                                >
                                    <option value="warning">Warning Only</option>
                                    <option value="temporary_ban">Temporary Ban</option>
                                    <option value="permanent_ban">Permanent Ban</option>
                                </select>
                            </div>
                            <textarea
                                placeholder="Reason for flag..."
                                value={newFlag.reason}
                                onChange={e => setNewFlag({ ...newFlag, reason: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm mb-4 focus:border-red-500/50 outline-none min-h-[80px]"
                            />
                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Expiry (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={newFlag.expires_at}
                                        onChange={e => setNewFlag({ ...newFlag, expires_at: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleAddFlag}
                                    disabled={flagging || !newFlag.wallet_address || !newFlag.reason}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 mt-5"
                                >
                                    {flagging ? 'Processing...' : 'Apply Restriction'}
                                </button>
                            </div>
                        </div>

                        {/* Recent Flags List */}
                        <div className="space-y-3">
                            {flags.length === 0 ? (
                                <p className="text-center text-slate-600 py-8 text-sm italic">No active wallet restrictions.</p>
                            ) : flags.map(f => (
                                <div key={f.id} className="glass-card flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${f.flag_type === 'permanent_ban' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            <AlertCircle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono text-slate-300">{f.wallet_address.slice(0, 12)}...</p>
                                            <p className="text-[10px] text-slate-500 italic mt-1">{f.reason}</p>
                                            {f.expires_at && (
                                                <p className="text-[9px] text-slate-600 mt-1 flex items-center gap-1 uppercase font-bold">
                                                    <Clock size={10} /> Expires: {new Date(f.expires_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${f.flag_type === 'permanent_ban' ? 'border-red-500/30 text-red-500 bg-red-500/5' : 'border-orange-500/30 text-orange-500 bg-orange-500/5'
                                            }`}>
                                            {f.flag_type.replace('_', ' ')}
                                        </span>
                                        <button
                                            onClick={() => removeFlag(f.id, f.wallet_address)}
                                            className="p-2 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Audit Logs Feed */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <Activity className="text-blue-400" />
                            <h2 className="text-2xl font-bold">Audit Intelligence</h2>
                        </div>

                        <div className="glass-card !p-0 overflow-hidden">
                            <div className="max-h-[500px] overflow-y-auto scrollbar-hide">
                                {logs.length === 0 ? (
                                    <p className="text-center text-slate-600 py-20 text-sm">No activity records found.</p>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {logs.map(log => (
                                            <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${log.action.includes('FLAG') ? 'border-red-500/30 text-red-500 bg-red-500/5' :
                                                            log.action.includes('RESOLVE') ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                                                                'border-blue-500/30 text-blue-500 bg-blue-500/5'
                                                        }`}>
                                                        {log.action.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Fingerprint size={12} className="text-slate-600" />
                                                    <p className="text-xs font-mono text-slate-400 truncate">{log.target_wallet}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-500 line-clamp-1">{log.metadata?.reason || log.metadata?.status || 'System Action'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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

                    {/* Complaints List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <ShieldAlert className="text-orange-400" />
                            <h2 className="text-2xl font-bold">Moderation Queue</h2>
                        </div>

                        <div className="space-y-4">
                            {complaints.length === 0 ? (
                                <div className="glass-card text-center py-12 text-slate-500">
                                    No complaints recorded.
                                </div>
                            ) : complaints.map(c => (
                                <div key={c.id} className={`glass-card border-l-2 ${c.status === 'resolved' ? 'border-green-500' : 'border-orange-500'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status: {c.status.replace('_', ' ')}</span>
                                            <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-slate-400">
                                                Reporter: {c.raised_by_wallet.slice(0, 8)}...
                                            </span>
                                        </div>
                                        <Link href={`/admin/complaints/${c.id}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                                            Manage Case
                                        </Link>
                                    </div>
                                    <p className="text-sm text-slate-300 line-clamp-2">{c.description}</p>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                        <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</span>
                                        {c.escrow_id && (
                                            <Link href={`/escrow/${c.escrow_id}`} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono">
                                                Escrow #{c.escrow_id.slice(0, 8)}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
