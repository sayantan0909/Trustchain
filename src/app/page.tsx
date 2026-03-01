"use client";

import { Navbar } from "@/components/Navbar";
import { FeaturesSection } from "@/components/FeaturesSection";
import { FAQSection } from "@/components/FAQSection";
import { HeroOrbs } from "@/components/HeroOrbs";
import { HeroStats } from "@/components/HeroStats";
import AuroraCanvas from "@/components/AuroraCanvas";
import { Shield, ArrowRight, Github, Zap, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
const GridScan = dynamic(() => import("@/components/GridScan").then(mod => mod.GridScan), { ssr: false });

/* ═══════════════════════════════════════════════
   TYPEWRITER + GLITCH EFFECT
═══════════════════════════════════════════════ */
const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#@$%&|01".split("");

function useTypewriterGlitch(text: string, delay = 1200) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    let timeout: ReturnType<typeof setTimeout>;
    let charIndex = 0;
    let glitchRounds = 0;

    const scheduleNext = () => {
      if (charIndex > text.length) {
        setDone(true);
        return;
      }

      if (glitchRounds < 3) {
        const glitchChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        setDisplayed(text.slice(0, charIndex) + glitchChar);
        glitchRounds++;
        timeout = setTimeout(scheduleNext, 40 + Math.random() * 30);
      } else {
        glitchRounds = 0;
        charIndex++;
        setDisplayed(text.slice(0, charIndex));
        timeout = setTimeout(scheduleNext, 45 + Math.random() * 35);
      }
    };

    const startTimeout = setTimeout(() => {
      scheduleNext();
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeout);
    };
  }, [text, delay]);

  return { displayed, done };
}

/* ═══════════════════════════════════════════════
   CHROME HEADLINE — mouse-reactive iridescent
═══════════════════════════════════════════════ */
function ChromeHeadline({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const angle = Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * (180 / Math.PI);
    ref.current.style.setProperty("--bx", `${x}%`);
    ref.current.style.setProperty("--by", `${y}%`);
    ref.current.style.setProperty("--angle", `${angle}deg`);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  return (
    <span ref={ref} className="hero-headline-chrome" style={{ "--bx": "50%", "--by": "50%", "--angle": "0deg" } as React.CSSProperties}>
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   PARTICLE FIELD (micro dots, full-bleed)
═══════════════════════════════════════════════ */
function MicroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number, W = 0, H = 0;

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string; life: number; maxLife: number; };
    const COLS = ["rgba(139,92,246,", "rgba(0,212,255,", "rgba(236,72,153,", "rgba(167,139,250,"];
    const particles: P[] = [];

    const spawn = (): P => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22, vy: -Math.random() * 0.35 - 0.1,
      r: Math.random() * 1.5 + 0.3, alpha: 0,
      color: COLS[Math.floor(Math.random() * COLS.length)],
      life: 0, maxLife: Math.random() * 300 + 200,
    });

    for (let i = 0; i < 70; i++) { const p = spawn(); p.life = Math.random() * p.maxLife; particles.push(p); }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.life++;
        const prog = p.life / p.maxLife;
        p.alpha = prog < 0.15 ? prog / 0.15 : prog > 0.75 ? (1 - prog) / 0.25 : 1;
        p.x += p.vx; p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha * 0.65})`;
        ctx.fill();
        if (p.life >= p.maxLife) Object.assign(p, { ...spawn(), life: 0 });
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: "block" }} />;
}

/* ═══════════════════════════════════════════════
   ANIMATION HELPERS
═══════════════════════════════════════════════ */
const ease = [0.16, 1, 0.3, 1] as const;

const TRUST = [
  { icon: <Zap size={10} />, text: "Non-custodial" },
  { icon: <Lock size={10} />, text: "Audited Contracts" },
  { icon: <Shield size={10} />, text: "Algorand L1" },
];

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function Home() {
  const SUBTITLE = "Unlink funds from human decisions — TrustChain uses milestone-based smart contracts on Algorand.";
  const { displayed, done } = useTypewriterGlitch(SUBTITLE, 1800);

  return (
    <div className="relative min-h-screen bg-[#020617]">
      {/* Floating parallax orbs behind everything */}
      <HeroOrbs />
      <Navbar />

      {/* ═══════════
          HERO
      ═══════════ */}
      <section
        style={{
          position: "relative",
          width: "100vw",
          minHeight: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, #0d0a1e 0%, #020617 70%)",
        }}
      >
        {/* ── Layer 1: Aurora beams (full-bleed) ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <AuroraCanvas />
        </div>

        {/* ── Layer 2: Micro particles ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <MicroParticles />
        </div>

        {/* ── Layer 3: Grid Scan (Replacing solid grid) ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 3, opacity: 0.6 }}>
          <GridScan
            linesColor="#1e1b4b"
            scanColor="#8b5cf6"
            scanOpacity={0.5}
            gridScale={0.15}
            scanDuration={4}
            scanDelay={1}
            bloomIntensity={0.8}
            enablePost={true}
          />
        </div>

        {/* ── Layer 4: Radial bloom center ── */}
        <div
          style={{
            position: "absolute",
            top: "35%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: "70vw", height: "70vw",
            maxWidth: 800, maxHeight: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(0,212,255,0.04) 40%, transparent 70%)",
            filter: "blur(60px)",
            animation: "glowPulse 4s ease-in-out infinite",
            zIndex: 4,
            pointerEvents: "none",
          }}
        />

        {/* ── Hero Content ── */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            padding: "160px 24px 80px",
            width: "100%",
            maxWidth: "72rem",
            margin: "0 auto",
          }}
        >
          {/* Trust pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0, ease }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 20 }}
          >
            {TRUST.map(({ icon, text }) => (
              <span key={text} className="trust-pill">{icon}{text}</span>
            ))}
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}
          >
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Algorand TestNet Live
            </div>
          </motion.div>

          {/* ── HEADLINE ── */}
          <motion.h1
            className="hero-headline"
            initial={{ opacity: 0, y: 60, filter: "blur(16px)", skewY: 3 }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", skewY: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease }}
            style={{ marginBottom: "0.1rem" }}
          >
            {/* Line 1: chrome reactive */}
            <ChromeHeadline>Where Freelancers Get Paid</ChromeHeadline>
            <br />
            {/* Line 2: animated gradient */}
            <span className="hero-headline-gradient">
              and Clients Stay Protected.
            </span>
          </motion.h1>

          {/* ── TYPEWRITER GLITCH SUBTITLE ── */}
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {displayed}
            {!done && <span className="glitch-cursor" />}
          </motion.p>

          {/* ── CTA BUTTONS ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6, ease }}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 72 }}
          >
            <Link href="/dashboard" className="btn-primary">
              <span style={{ display: "contents" }}>
                Launch App <ArrowRight size={18} />
              </span>
            </Link>
            <Link href="https://github.com/sayantan0909/Trustchain" className="btn-secondary">
              <Github size={18} /> View Github
            </Link>
          </motion.div>

          {/* ── STATS BAR ── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.8, ease }}
          >
            <HeroStats />
          </motion.div>

          {/* ── SCROLL HINT ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            style={{ display: "flex", justifyContent: "center", marginTop: 56 }}
          >
            <div className="hero-scroll-hint">
              <div className="hero-scroll-dot" />
            </div>
          </motion.div>
        </div>
      </section>

      <FeaturesSection />
      <FAQSection />

      {/* Footer */}
      <footer style={{ padding: "48px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image
              src="/logo.png"
              alt="TrustChain Logo"
              width={24}
              height={24}
              className="object-contain rounded-xl"
            />
            <span style={{ fontWeight: 700 }}>TrustChain</span>
          </div>
          <p style={{ color: "#475569", fontSize: "0.85rem" }}>
            © 2026 TrustChain Protocol. Built on Algorand TestNet.
          </p>
        </div>
      </footer>
    </div>
  );
}
