"use client";
import { useEffect, useRef } from "react";

interface Beam {
    // Control points for a cubic bezier
    x0: number; y0: number;
    cx1: number; cy1: number;
    cx2: number; cy2: number;
    x1: number; y1: number;
    // Animation targets
    tx0: number; ty0: number;
    tcx1: number; tcy1: number;
    tcx2: number; tcy2: number;
    tx1: number; ty1: number;

    color1: string;
    color2: string;
    color3: string;
    width: number;
    speed: number;
    phase: number;
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function randomBetween(a: number, b: number) {
    return a + Math.random() * (b - a);
}

export default function AuroraCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let W = 0, H = 0, raf: number;

        const resize = () => {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        // Palette: violet, magenta, electric blue
        const PALETTES = [
            ["rgba(139,92,246,0)", "rgba(139,92,246,0.25)", "rgba(139,92,246,0)"],  // violet
            ["rgba(236,72,153,0)", "rgba(236,72,153,0.22)", "rgba(236,72,153,0)"],  // magenta
            ["rgba(0,212,255,0)", "rgba(0,212,255,0.20)", "rgba(0,212,255,0)"],   // electric blue
            ["rgba(168,85,247,0)", "rgba(168,85,247,0.28)", "rgba(168,85,247,0)"],  // purple
        ];

        const makeBeam = (idx: number): Beam => {
            const pal = PALETTES[idx % PALETTES.length];
            // Beams go edge to edge horizontally, varying heights
            const yBase = H * (0.15 + idx * 0.18);
            return {
                x0: -W * 0.1, y0: yBase + randomBetween(-H * 0.1, H * 0.1),
                cx1: W * 0.3, cy1: yBase + randomBetween(-H * 0.25, H * 0.25),
                cx2: W * 0.7, cy2: yBase + randomBetween(-H * 0.25, H * 0.25),
                x1: W * 1.1, y1: yBase + randomBetween(-H * 0.1, H * 0.1),

                tx0: -W * 0.1, ty0: yBase + randomBetween(-H * 0.15, H * 0.15),
                tcx1: W * 0.3, tcy1: yBase + randomBetween(-H * 0.3, H * 0.3),
                tcx2: W * 0.7, tcy2: yBase + randomBetween(-H * 0.3, H * 0.3),
                tx1: W * 1.1, ty1: yBase + randomBetween(-H * 0.15, H * 0.15),

                color1: pal[0], color2: pal[1], color3: pal[2],
                width: randomBetween(H * 0.12, H * 0.22),
                speed: randomBetween(0.0004, 0.0008),
                phase: Math.random() * Math.PI * 2,
            };
        };

        const beams: Beam[] = [0, 1, 2, 3].map(makeBeam);

        let t = 0;

        const pickNewTarget = (b: Beam, idx: number) => {
            const yBase = H * (0.15 + idx * 0.18);
            b.tx0 = -W * 0.1;
            b.ty0 = yBase + randomBetween(-H * 0.15, H * 0.15);
            b.tcx1 = W * 0.3;
            b.tcy1 = yBase + randomBetween(-H * 0.3, H * 0.3);
            b.tcx2 = W * 0.7;
            b.tcy2 = yBase + randomBetween(-H * 0.3, H * 0.3);
            b.tx1 = W * 1.1;
            b.ty1 = yBase + randomBetween(-H * 0.15, H * 0.15);
        };

        // Schedule target refreshes at different intervals
        const intervals = beams.map((b, i) =>
            window.setInterval(() => pickNewTarget(b, i), randomBetween(3000, 7000))
        );

        const draw = () => {
            t++;
            ctx.clearRect(0, 0, W, H);

            beams.forEach((b) => {
                // Very slow lerp toward target positions
                const sp = b.speed * 1.5;
                b.x0 = lerp(b.x0, b.tx0, sp);
                b.y0 = lerp(b.y0, b.ty0, sp);
                b.cx1 = lerp(b.cx1, b.tcx1, sp);
                b.cy1 = lerp(b.cy1, b.tcy1, sp);
                b.cx2 = lerp(b.cx2, b.tcx2, sp);
                b.cy2 = lerp(b.cy2, b.tcy2, sp);
                b.x1 = lerp(b.x1, b.tx1, sp);
                b.y1 = lerp(b.y1, b.ty1, sp);

                // Breathing factor
                const breathe = 0.8 + 0.2 * Math.sin(t * b.speed * 80 + b.phase);
                const hw = (b.width * breathe) / 2;

                // Normal vector to bezier midpoint (rough)
                const mx = (b.cx1 + b.cx2) / 2;
                const my = (b.cy1 + b.cy2) / 2;
                const dx = b.x1 - b.x0;
                const dy = b.y1 - b.y0;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;

                // Gradient perpendicular to beampath
                const gx0 = mx + nx * hw;
                const gy0 = my + ny * hw;
                const gx1 = mx - nx * hw;
                const gy1 = my - ny * hw;

                let grad: CanvasGradient;
                try {
                    grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
                } catch {
                    return;
                }
                grad.addColorStop(0, b.color1);
                grad.addColorStop(0.5, b.color2);
                grad.addColorStop(1, b.color3);

                // Draw thick bezier as a path with width using offset paths
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(b.x0 + nx * hw, b.y0 + ny * hw);
                ctx.bezierCurveTo(
                    b.cx1 + nx * hw, b.cy1 + ny * hw,
                    b.cx2 + nx * hw, b.cy2 + ny * hw,
                    b.x1 + nx * hw, b.y1 + ny * hw
                );
                ctx.bezierCurveTo(
                    b.cx2 - nx * hw, b.cy2 - ny * hw,
                    b.cx1 - nx * hw, b.cy1 - ny * hw,
                    b.x0 - nx * hw, b.y0 - ny * hw
                );
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.filter = "blur(48px)";
                ctx.fill();
                ctx.restore();
            });

            raf = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            intervals.forEach(clearInterval);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                display: "block",
            }}
        />
    );
}
