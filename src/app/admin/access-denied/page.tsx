'use client';

import { Navbar } from "@/components/Navbar";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AccessDenied() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
            <Navbar />

            <div className="max-w-md w-full px-6 text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                    <ShieldAlert size={40} />
                </div>

                <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Access Denied</h1>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                    You do not have administrative privileges to access this area.
                    Unauthorized access attempts are logged for security purposes.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 transition-colors font-medium"
                    >
                        <Home size={18} /> Home
                    </Link>
                    <Link
                        href="/admin"
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all font-bold shadow-lg shadow-blue-500/20"
                    >
                        <ArrowLeft size={18} /> Admin Login
                    </Link>
                </div>
            </div>

            {/* Decoration */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-transparent to-red-500 opacity-50" />
        </div>
    );
}
