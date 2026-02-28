'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, Chrome, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export const dynamic = 'force-dynamic';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await verifyAdminRedirect(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    const verifyAdminRedirect = async (uid: string) => {
        try {
            const adminDoc = await getDoc(doc(db, 'admins', uid));
            if (adminDoc.exists()) {
                router.push('/admin/dashboard');
            } else {
                await auth.signOut();
                setError("Access Denied: You are not recognized as an administrator.");
            }
        } catch (err: any) {
            console.error("Error verifying admin status:", err);
            setError("Authentication error. Please try again.");
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await verifyAdminRedirect(userCredential.user.uid);
        } catch (authError: any) {
            setError(authError.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        const provider = new GoogleAuthProvider();
        try {
            const userCredential = await signInWithPopup(auth, provider);
            await verifyAdminRedirect(userCredential.user.uid);
        } catch (authError: any) {
            setError(authError.message);
        } finally {
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
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Login as Admin</>}
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
