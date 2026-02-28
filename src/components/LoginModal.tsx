'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
    address: string;
    onVerify: () => Promise<void>;
    onCancel: () => void;
}

export const LoginModal = ({ address, onVerify, onCancel }: LoginModalProps) => {
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        try {
            await onVerify();
        } catch (error) {
            console.error('Verification failed:', error);
            alert('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl relative p-8">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Verify Ownership</h2>
                    <p className="text-slate-400 text-sm leading-relaxed px-4">
                        Please sign a secure verification message to prove you own this wallet address.
                    </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl mb-8 font-mono text-[10px] text-center text-slate-300 break-all border border-slate-800/50 shadow-inner">
                    {address}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-4 px-6 rounded-2xl text-slate-400 font-bold hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={loading}
                        className="flex-1 btn-primary justify-center !w-auto py-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Sign & Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};
