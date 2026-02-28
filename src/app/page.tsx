import { Navbar } from "@/components/Navbar";
import { Shield, Lock, Zap, ArrowRight, Github } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-grid">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[20%] right-[10%] w-64 h-64 bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Algorand TestNet Live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            Decentralized Escrow <br />
            <span className="gradient-text">for Infinite Trust.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-12 leading-relaxed">
            Unlink funds from human decisions. TrustChain uses milestone-based smart contracts
            on Algorand to ensure freelancers get paid and clients get results.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/dashboard" className="btn-primary px-8">
              Launch App <ArrowRight size={20} />
            </Link>
            <Link href="https://github.com" className="btn-secondary px-8">
              <Github size={20} /> View Github
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            {[
              {
                icon: <Lock className="text-blue-400" size={32} />,
                title: "On-Chain Security",
                desc: "Funds are locked in immutable smart contracts. No admin can touch your money."
              },
              {
                icon: <Zap className="text-purple-400" size={32} />,
                title: "Milestone Payouts",
                desc: "Release funds instantly as project goals are met. Scalable to any project size."
              },
              {
                icon: <Shield className="text-green-400" size={32} />,
                title: "Client-Only Refund",
                desc: "Simple, transparent refund logic. Reclaim unused funds if goals aren't reached."
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card text-left group">
                <div className="mb-6 p-3 bg-white/5 w-fit rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-500" size={20} />
            <span className="font-bold">TrustChain</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 TrustChain Protocol. Built on Algorand TestNet.
          </p>
        </div>
      </footer>
    </div>
  );
}
