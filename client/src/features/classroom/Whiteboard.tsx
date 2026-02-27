'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface WhiteboardProps {
    sessionId: string;
    role: 'tutor' | 'student';
}

export default function Whiteboard({ sessionId, role }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#1e293b');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncingRef = useRef(false);

    const isTutor = role === 'tutor';

    const COLORS = [
        '#1e293b', // slate-800
        '#2563eb', // blue-600
        '#dc2626', // red-600
        '#16a34a', // green-600
        '#9333ea', // purple-600
        '#ea580c', // orange-600
    ];

    // ── SYNC: Push canvas snapshot to Firestore (tutor only) ──
    const pushCanvasToFirestore = useCallback(() => {
        if (!isTutor) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Debounce: clear previous timeout
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const dataUrl = canvas.toDataURL('image/png', 0.6);
                const whiteboardRef = doc(db, 'sessions', sessionId, 'whiteboard', 'current');
                await setDoc(whiteboardRef, {
                    imageData: dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    updatedAt: new Date().toISOString(),
                });
            } catch (error) {
                console.error('Whiteboard sync error:', error);
            }
        }, 300);
    }, [isTutor, sessionId]);

    // ── SYNC: Student subscribes to Firestore whiteboard updates ──
    useEffect(() => {
        if (isTutor) return;

        const whiteboardRef = doc(db, 'sessions', sessionId, 'whiteboard', 'current');
        const unsubscribe = onSnapshot(whiteboardRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (!data?.imageData) return;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            isSyncingRef.current = true;
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                isSyncingRef.current = false;
            };
            img.src = data.imageData;
        });

        return () => unsubscribe();
    }, [isTutor, sessionId]);

    // Resize canvas — uses ResizeObserver to handle container size changes (e.g. side panel open/close)
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const ctx = canvas.getContext('2d');
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                if (imageData) {
                    ctx.putImageData(imageData, 0, 0);
                }
            }
        };

        resizeCanvas();

        // ResizeObserver detects container resizes (e.g. when side panel opens)
        const container = containerRef.current;
        let observer: ResizeObserver | null = null;
        if (container) {
            observer = new ResizeObserver(() => resizeCanvas());
            observer.observe(container);
        }

        return () => {
            if (observer) observer.disconnect();
        };
    }, []);

    const getCoords = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();

            if ('touches' in e) {
                const touch = e.touches[0];
                return {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                };
            }
            return {
                x: (e as React.MouseEvent).clientX - rect.left,
                y: (e as React.MouseEvent).clientY - rect.top,
            };
        },
        []
    );

    const startDrawing = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isTutor) return;
            const coords = getCoords(e);
            if (!coords) return;
            setIsDrawing(true);
            lastPointRef.current = coords;
        },
        [getCoords, isTutor]
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isTutor || !isDrawing) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const coords = getCoords(e);
            if (!ctx || !coords || !lastPointRef.current) return;

            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            lastPointRef.current = coords;
        },
        [isTutor, isDrawing, color, lineWidth, tool, getCoords]
    );

    const stopDrawing = useCallback(() => {
        if (!isTutor) return;
        setIsDrawing(false);
        lastPointRef.current = null;
        // Push to Firestore when stroke ends
        pushCanvasToFirestore();
    }, [isTutor, pushCanvasToFirestore]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Push cleared canvas to Firestore
        pushCanvasToFirestore();
    };

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar – Tutor only */}
            {isTutor && (
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
                    {/* Colors */}
                    <div className="flex items-center gap-1.5">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => {
                                    setColor(c);
                                    setTool('pen');
                                }}
                                className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c && tool === 'pen'
                                    ? 'scale-125 border-slate-400'
                                    : 'border-transparent hover:scale-110'
                                    }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    {/* Line Width */}
                    <div className="flex items-center gap-1">
                        {[2, 3, 5].map((w) => (
                            <button
                                key={w}
                                onClick={() => setLineWidth(w)}
                                className={`rounded-lg p-1.5 transition-colors ${lineWidth === w ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                <div
                                    className="rounded-full bg-current"
                                    style={{ width: w * 2 + 4, height: w * 2 + 4 }}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    {/* Tools */}
                    <button
                        onClick={() => setTool('pen')}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${tool === 'pen'
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        ✏️ Pen
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${tool === 'eraser'
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        🧹 Eraser
                    </button>

                    <div className="flex-1" />

                    <span className="text-[10px] text-emerald-500 font-medium animate-pulse">● Live to student</span>

                    <button
                        onClick={clearCanvas}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                        🗑 Clear
                    </button>
                </div>
            )}

            {/* Student: read-only label */}
            {!isTutor && (
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                    <span className="text-xs font-medium text-slate-500">📋 Tutor&apos;s Whiteboard</span>
                    <span className="ml-auto text-[10px] text-emerald-500 font-medium animate-pulse">● Live</span>
                </div>
            )}

            {/* Canvas */}
            <div ref={containerRef} className={`relative flex-1 bg-white ${isTutor ? 'cursor-crosshair' : 'cursor-default'}`}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0"
                />
            </div>
        </div>
    );
}
