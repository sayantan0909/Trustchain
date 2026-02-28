"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const ACCENT_COLORS = ["#00ff88", "#00d4ff", "#ffb800", "#8b5cf6"];

const faqs = [
    {
        question: "What is TrustChain?",
        answer:
            "TrustChain is a decentralized escrow protocol built on the Algorand blockchain. It allows clients and freelancers to create milestone-based smart contracts where funds are released automatically when agreed goals are met — no middlemen, no disputes.",
    },
    {
        question: "How does milestone-based payment work?",
        answer:
            "When a project is created, the client deposits funds into a smart contract. As each milestone is completed and verified, the corresponding portion of funds is released directly to the freelancer on-chain — instantly and transparently.",
    },
    {
        question: "Is my money safe on TrustChain?",
        answer:
            "Yes. All funds are held in immutable smart contracts on Algorand. No admin, team member, or third party can access or move your funds. Only the contract logic — agreed upon upfront — controls when and how funds move.",
    },
    {
        question: "What happens if a milestone isn't reached?",
        answer:
            "If a milestone is not completed or a project is cancelled, the client can reclaim any unreleased funds through the contract's built-in refund logic. Every outcome is handled transparently and recorded permanently on-chain.",
    },
];

function AccordionItem({
    faq,
    index,
    isOpen,
    onToggle,
}: {
    faq: { question: string; answer: string };
    index: number;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const accent = ACCENT_COLORS[index];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="relative group"
        >
            {/* Left border accent when open */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-opacity duration-300"
                style={{
                    background: accent,
                    opacity: isOpen ? 1 : 0,
                }}
            />

            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-4 py-6 px-6 text-left focus:outline-none"
                aria-expanded={isOpen}
            >
                <span
                    className="text-base md:text-lg font-semibold text-white transition-colors duration-200"
                    style={{ color: isOpen ? "#ffffff" : "rgba(255,255,255,0.85)" }}
                >
                    {faq.question}
                </span>

                {/* Chevron icon */}
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 transition-colors duration-300"
                    style={{
                        background: isOpen ? `${accent}22` : "rgba(255,255,255,0.05)",
                        borderColor: isOpen ? `${accent}55` : "rgba(255,255,255,0.1)",
                        color: isOpen ? accent : "rgba(255,255,255,0.5)",
                    }}
                >
                    <ChevronDown size={16} />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <p className="px-6 pb-6 text-slate-400 leading-relaxed text-sm md:text-base">
                            {faq.answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Divider */}
            <div className="h-px bg-white/6 mx-6" />
        </motion.div>
    );
}

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

    return (
        <section
            className="relative py-28 px-6 overflow-hidden"
            style={{ background: "linear-gradient(180deg, #020617 0%, #06091a 100%)" }}
        >
            {/* Background blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-900/20 blur-[160px] rounded-full" />
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-14">
                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4"
                    >
                        FAQ
                    </motion.p>

                    <motion.h2
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-4"
                    >
                        Know About Us
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-slate-400 text-lg"
                    >
                        Everything you need to know about TrustChain Protocol.
                    </motion.p>
                </div>

                {/* Accordion */}
                <div
                    className="rounded-2xl border border-white/[0.07] overflow-hidden"
                    style={{ background: "#0c1220" }}
                >
                    {faqs.map((faq, i) => (
                        <AccordionItem
                            key={i}
                            faq={faq}
                            index={i}
                            isOpen={openIndex === i}
                            onToggle={() => toggle(i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
