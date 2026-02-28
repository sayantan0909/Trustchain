'use client';
import { useEffect, useRef, useState } from 'react';

interface Stat { value: string; label: string; suffix?: string; icon: string; color: string; }

const STATS: Stat[] = [
    { value: '4.2', suffix: 'M', label: 'Total Value Locked', icon: '◈', color: '#e879f9' },
    { value: '1247', suffix: '+', label: 'Active Contracts', icon: '⬡', color: '#818cf8' },
    { value: '0.5', suffix: '%', label: 'Protocol Fee', icon: '❋', color: '#60a5fa' },
    { value: '3', suffix: 's', label: 'Settlement Time', icon: '⚡', color: '#34d399' },
];

function CountUp({ target, suffix = '' }: { target: string; suffix: string }) {
    const [display, setDisplay] = useState('0');
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true;
                const num = parseFloat(target);
                const isDecimal = target.includes('.');
                const dur = 1600;
                const start = performance.now();
                const run = (now: number) => {
                    const p = Math.min((now - start) / dur, 1);
                    const eased = 1 - Math.pow(1 - p, 4);
                    const cur = num * eased;
                    setDisplay(isDecimal ? cur.toFixed(1) : Math.floor(cur).toString());
                    if (p < 1) requestAnimationFrame(run);
                    else setDisplay(target);
                };
                requestAnimationFrame(run);
            }
        }, { threshold: 0.4 });

        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target]);

    return <span ref={ref}>{display}{suffix}</span>;
}

export function HeroStats() {
    return (
        <div className="hero-stats-bar">
            {STATS.map(({ value, label, suffix = '', icon, color }, i) => (
                <div
                    key={label}
                    className="hero-stat-cell group"
                    style={{ animationDelay: `${0.7 + i * 0.12}s` }}
                >
                    {/* Shimmer sweep on hover */}
                    <div className="hero-stat-shimmer" />

                    {/* Icon */}
                    <div
                        className="hero-stat-icon"
                        style={{ color, textShadow: `0 0 12px ${color}` }}
                    >
                        {icon}
                    </div>

                    {/* Value */}
                    <div className="hero-stat-value" style={{
                        backgroundImage: `linear-gradient(135deg, ${color} 0%, #ffffff 100%)`,
                    }}>
                        <CountUp target={value} suffix={suffix} />
                    </div>

                    {/* Label */}
                    <div className="hero-stat-label">{label}</div>

                    {/* Bottom glow accent */}
                    <div
                        className="hero-stat-glow"
                        style={{ background: `linear-gradient(90deg, transparent 0%, ${color}22 50%, transparent 100%)` }}
                    />
                </div>
            ))}
        </div>
    );
}
