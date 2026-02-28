'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
    address: string;
    onVerify: (role: string) => Promise<void>;
    onCancel: () => void;
}

export const LoginModal = ({ address, onVerify, onCancel }: LoginModalProps) => {
    const [role, setRole] = useState<'client' | 'freelancer'>('client');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        try {
            await onVerify(role);
        } catch (error) {
            console.error('Verification failed:', error);
            alert('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl relative">
                <div className="text-center mb-6">
                    <div className="mx-auto w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verify Ownership</h2>
                    <p className="text-slate-400 text-sm">
                        Please sign a message to verify you own this wallet and select your role.
                    </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl mb-6 font-mono text-xs text-center text-slate-300 break-all border border-slate-800">
                    {address}
                </div>

                <div className="space-y-3 mb-8">
                    <label className="text-sm font-semibold text-slate-400 block mb-2">I want to use TrustChain as a:</label>
                    <div className="grid grid-cols-2 gap-3 border border-slate-800 rounded-xl p-1 bg-slate-950/50">
                        <button
                            onClick={() => setRole('client')}
                            className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${role === 'client' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Client
                        </button>
                        <button
                            onClick={() => setRole('freelancer')}
                            className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${role === 'freelancer' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Freelancer
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-3 px-4 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={loading}
                        className="flex-1 btn-primary justify-center !w-auto"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Sign & Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};
