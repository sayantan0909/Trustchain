"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Lock, Zap, Shield, Search } from "lucide-react";

const PALETTE = ["#c084fc", "#00d4ff", "#ffb800", "#8b5cf6"];

const features = [
    {
        icon: <Lock size={28} />,
        accent: "#00d4ff",
        accentBg: "rgba(0,212,255,0.12)",
        title: "On-Chain Security",
        description:
            "Funds are locked in immutable smart contracts. No admin can touch your money.",
        side: "left" as const,
    },
    {
        icon: <Zap size={28} />,
        accent: "#8b5cf6",
        accentBg: "rgba(139,92,246,0.12)",
        title: "Milestone Payouts",
        description:
            "Release funds instantly as project goals are met. Scalable to any project size.",
        side: "right" as const,
    },
    {
        icon: <Shield size={28} />,
        accent: "#c084fc",
        accentBg: "rgba(192,132,252,0.12)",
        title: "Client-Only Refund",
        description:
            "Simple, transparent refund logic. Reclaim unused funds if goals aren't reached.",
        side: "left" as const,
    },
    {
        icon: <Search size={28} />,
        accent: "#ffb800",
        accentBg: "rgba(255,184,0,0.12)",
        title: "Transparent Audit Trail",
        description:
            "Every transaction and milestone update is permanently recorded on-chain. Anyone can verify project progress in real time.",
        side: "right" as const,
    },
];

/* ── Vertical Timeline (center column) ── */
function VerticalTimeline({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const [activeCard, setActiveCard] = useState(-1);

    useEffect(() => {
        const measure = () => {
            if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [containerRef]);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end center"],
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 80,
        damping: 24,
        mass: 0.6,
    });

    // Dot Y position
    const dotY = useTransform(smoothProgress, [0, 1], [0, containerHeight]);

    // Dot color cycles through palette
    const dotColor = useTransform(smoothProgress, [0, 0.33, 0.66, 1], PALETTE);

    // Line opacity
    const lineOpacity = useTransform(smoothProgress, [0, 0.1], [0.3, 1]);

    // Pulse on card crossing
    useEffect(() => {
        const unsubscribe = smoothProgress.on("change", (val) => {
            const cardIndex = Math.floor(val * 4);
            const clamped = Math.min(cardIndex, 3);
            if (clamped !== activeCard && val > 0) {
                setActiveCard(clamped);
            }
        });
        return unsubscribe;
    }, [smoothProgress, activeCard]);

    return (
        <div
            ref={trackRef}
            className="relative flex flex-col items-center h-full"
            style={{ minHeight: containerHeight }}
        >
            {/* Static track */}
            <motion.div
                className="absolute top-0 bottom-0 w-[2px] rounded-full"
                style={{
                    background: "rgba(255,255,255,0.07)",
                    opacity: lineOpacity,
                }}
            />

            {/* Moving dot */}
            <motion.div
                style={{ y: dotY, backgroundColor: dotColor }}
                className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-10 shadow-lg"
                animate={{
                    scale: [1, 1.5, 1],
                }}
                key={activeCard}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />

            <motion.div
                style={{ y: dotY }}
                className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full -translate-y-3 opacity-40 blur-xl z-0"
            >
                <div
                    className="w-full h-full rounded-full"
                    style={{
                        background: `
                radial-gradient(circle,
                    rgba(168,85,247,0.5),
                    rgba(192,132,252,0.4),
                    rgba(139,92,246,0.3),
                    transparent 70%)
            `
                    }}
                />
            </motion.div>
        </div>
    );
}

/* ── Feature Card ── */
function FeatureCard({
    feature,
    index,
}: {
    feature: (typeof features)[0];
    index: number;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const isLeft = feature.side === "left";

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.25 } }}
            className="relative rounded-2xl p-6 border border-white/8 shadow-xl overflow-hidden group cursor-default"
            style={{ background: "#0f1729" }}
        >
            {/* Subtle gradient top-edge glow on hover */}
            <div
                className="absolute inset-x-0 top-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, transparent, ${feature.accent}, transparent)` }}
            />

            {/* Card inner glow */}
            <div
                className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
                style={{
                    background: `
            radial-gradient(circle at center,
                rgba(168,85,247,0.5) 0%,
                rgba(192,132,252,0.4) 40%,
                rgba(139,92,246,0.3) 70%,
                transparent 100%)
        `
                }}
            />

            {/* Icon */}
            <div
                className="mb-5 p-3 w-fit rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: feature.accentBg, color: feature.accent }}
            >
                {feature.icon}
            </div>

            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
        </motion.div>
    );
}

/* ── Main FeaturesSection ── */
export function FeaturesSection() {
    const sectionRef = useRef<HTMLElement>(null);

    return (
        <section
            ref={sectionRef}
            className="relative py-28 px-6 overflow-hidden"
            style={{ background: "linear-gradient(180deg, #020617 0%, #080e22 50%, #020617 100%)" }}
        >
            {/* Background blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-700/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-700/10 blur-[150px] rounded-full" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-5"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
                            Built on Algorand
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight"
                    >
                        Everything you need.{" "}
                        <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400">
                            Nothing you don&apos;t.
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-slate-400 text-lg max-w-xl mx-auto"
                    >
                        TrustChain brings escrow primitives directly on-chain — no middlemen, no surprises.
                    </motion.p>
                </div>

                {/* 3-Column flex row: left cards | timeline | right cards */}
                <div className="hidden md:flex flex-row gap-8 items-stretch">
                    {/* Left column — cards 0 and 2 */}
                    <div className="flex-1 flex flex-col gap-10 justify-around">
                        <FeatureCard feature={features[0]} index={0} />
                        <FeatureCard feature={features[2]} index={2} />
                    </div>

                    {/* Center — vertical timeline */}
                    <div className="w-16 shrink-0 relative flex justify-center">
                        <VerticalTimeline containerRef={sectionRef} />
                    </div>

                    {/* Right column — cards 1 and 3 */}
                    <div className="flex-1 flex flex-col gap-10 justify-around">
                        <FeatureCard feature={features[1]} index={1} />
                        <FeatureCard feature={features[3]} index={3} />
                    </div>
                </div>

                {/* Mobile: single column stack */}
                <div className="flex flex-col gap-6 md:hidden">
                    {features.map((feature, i) => (
                        <FeatureCard key={i} feature={feature} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}