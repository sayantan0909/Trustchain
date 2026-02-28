'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push('/admin/login');
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-pulse text-slate-500 font-bold uppercase tracking-widest text-xs">
                Redirecting to Secure Gateway...
            </div>
        </div>
    );
}
