'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, Chrome } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export const dynamic = 'force-dynamic';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                verifyAdminRedirect(session.user.id);
            }
        };
        checkSession();
    }, []);

    const verifyAdminRedirect = async (userId: string) => {
        const { data: adminData } = await supabase.from('admins').select('role').eq('id', userId).single();
        if (adminData) {
            router.push('/admin/dashboard');
        } else {
            await supabase.auth.signOut();
            setError("Access Denied: You are not recognized as an administrator.");
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (data?.user) {
            await verifyAdminRedirect(data.user.id);
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/admin/dashboard`
            }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-20 flex flex-col items-center justify-center">
            <Navbar />
            <div className="w-full max-w-md px-6 pt-32">
                <div className="glass-card flex flex-col items-center p-8">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Admin Gateway</h1>
                    <p className="text-slate-400 text-sm mb-8 text-center">
                        Authenticate to access the TrustChain moderation controls.
                    </p>

                    {error && (
                        <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm mb-6 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="w-full space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : <><LogIn size={20} /> Login as Admin</>}
                        </button>
                    </form>

                    <div className="w-full flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-slate-800"></div>
                        <span className="text-xs text-slate-500 font-bold uppercase">Or Use SSO</span>
                        <div className="flex-1 h-px bg-slate-800"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-700 hover:bg-slate-800 text-white disabled:opacity-50"
                    >
                        <Chrome size={20} /> Continue with Google
                    </button>
                </div>
            </div>
        </div>
    );
}
