'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip auth guard for public admin pages (login/access-denied)
        if (pathname === '/admin/login' || pathname === '/admin/access-denied' || pathname === '/admin') {
            setStatus('authorized');
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // If not logged in, redirect to login page
                setStatus('unauthorized');
                router.push('/admin/login');
                return;
            }

            try {
                // Check if user's UID exists in Firestore "admins" collection
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                if (adminDoc.exists()) {
                    setStatus('authorized');
                } else {
                    // Logged in but not an authorized admin
                    setStatus('unauthorized');
                    router.push('/admin/access-denied');
                }
            } catch (error) {
                console.error("Critical Security Fail: Error verifying admin status", error);
                setStatus('unauthorized');
                router.push('/admin/access-denied');
            }
        });

        return () => unsubscribe();
    }, [pathname, router]);

    // Show loading state while verifying credentials (prevents layout flashing)
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <Loader2 className="w-14 h-14 text-blue-600 animate-spin" />
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Security Clearance</p>
                        <p className="text-white text-sm font-medium animate-pulse">Verifying Credentials...</p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
