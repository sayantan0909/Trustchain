'use client';
import { useEffect, useRef } from 'react';

export function HeroOrbs() {
    const orb1 = useRef<HTMLDivElement>(null);
    const orb2 = useRef<HTMLDivElement>(null);
    const orb3 = useRef<HTMLDivElement>(null);
    const orb4 = useRef<HTMLDivElement>(null);
    const ring1 = useRef<HTMLDivElement>(null);
    const ring2 = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let raf: number;
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        let cx = 0, cy = 0, tx = 0, ty = 0;

        const onMove = (e: MouseEvent) => {
            tx = (e.clientX / window.innerWidth - 0.5) * 2;
            ty = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('mousemove', onMove);

        const tick = () => {
            cx = lerp(cx, tx, 0.035);
            cy = lerp(cy, ty, 0.035);
            if (orb1.current) orb1.current.style.transform = `translate(${cx * 45}px, ${cy * 30}px)`;
            if (orb2.current) orb2.current.style.transform = `translate(${-cx * 28}px, ${-cy * 22}px)`;
            if (orb3.current) orb3.current.style.transform = `translate(${cx * 18}px, ${cy * 38}px)`;
            if (orb4.current) orb4.current.style.transform = `translate(${-cx * 12}px, ${cy * 15}px)`;
            if (ring1.current) ring1.current.style.transform = `translate(${cx * 20}px, ${cy * 12}px) rotate(${cx * 8}deg)`;
            if (ring2.current) ring2.current.style.transform = `translate(${-cx * 15}px, ${-cy * 10}px) rotate(${-cx * 6}deg)`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
            {/* Primary fuchsia mega-orb */}
            <div
                ref={orb1}
                className="absolute -top-48 -left-48 w-[900px] h-[900px] rounded-full"
                style={{
                    background: 'radial-gradient(circle at 40% 40%, rgba(233,71,245,0.18) 0%, rgba(168,85,247,0.08) 40%, transparent 70%)',
                    filter: 'blur(90px)',
                    animation: 'orbFloat1 18s ease-in-out infinite',
                }}
            />
            {/* Blue/indigo right orb */}
            <div
                ref={orb2}
                className="absolute top-1/4 -right-64 w-[750px] h-[750px] rounded-full"
                style={{
                    background: 'radial-gradient(circle at 60% 50%, rgba(47,75,192,0.2) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)',
                    filter: 'blur(100px)',
                    animation: 'orbFloat2 22s ease-in-out infinite',
                }}
            />
            {/* Violet bottom-center orb */}
            <div
                ref={orb3}
                className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(167,139,250,0.06) 50%, transparent 70%)',
                    filter: 'blur(85px)',
                    animation: 'orbFloat1 14s ease-in-out infinite reverse',
                }}
            />
            {/* Cyan accent orb top-right */}
            <div
                ref={orb4}
                className="absolute top-8 right-1/4 w-[400px] h-[400px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 65%)',
                    filter: 'blur(70px)',
                    animation: 'orbFloat2 10s ease-in-out infinite 3s',
                }}
            />

            {/* Neon ring 1 — fuchsia */}
            <div
                ref={ring1}
                className="absolute top-[12%] left-[8%] w-[320px] h-[320px] rounded-full"
                style={{
                    border: '1px solid rgba(233,71,245,0.12)',
                    boxShadow: '0 0 40px rgba(233,71,245,0.06), inset 0 0 40px rgba(233,71,245,0.04)',
                    animation: 'ringPulse1 6s ease-in-out infinite',
                }}
            />
            {/* Neon ring 2 — indigo */}
            <div
                ref={ring2}
                className="absolute bottom-[15%] right-[6%] w-[240px] h-[240px] rounded-full"
                style={{
                    border: '1px solid rgba(99,102,241,0.14)',
                    boxShadow: '0 0 30px rgba(99,102,241,0.07), inset 0 0 30px rgba(99,102,241,0.04)',
                    animation: 'ringPulse2 8s ease-in-out infinite 1.5s',
                }}
            />

            {/* Subtle grid noise overlay */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle at 20% 80%, rgba(233,71,245,0.04) 0%, transparent 50%),
                                      radial-gradient(circle at 80% 20%, rgba(47,75,192,0.04) 0%, transparent 50%)`,
                }}
            />
        </div>
    );
}
