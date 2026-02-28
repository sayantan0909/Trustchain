'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip guard for the login page itself to avoid infinite redirects
        if (pathname === '/admin' || pathname === '/admin/login' || pathname === '/admin/access-denied') {
            setStatus('authorized');
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/admin');
                return;
            }

            try {
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                if (adminDoc.exists()) {
                    setStatus('authorized');
                } else {
                    router.push('/admin/access-denied');
                }
            } catch (error) {
                console.error("Error verifying admin status:", error);
                router.push('/admin/access-denied');
            }
        });

        return () => unsubscribe();
    }, [pathname, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Verifying Credentials</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
