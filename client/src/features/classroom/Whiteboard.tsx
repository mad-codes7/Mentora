'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface WhiteboardProps {
    sessionId: string;
}

export default function Whiteboard({ sessionId }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#1e293b');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const COLORS = [
        '#1e293b', // slate-800
        '#2563eb', // blue-600
        '#dc2626', // red-600
        '#16a34a', // green-600
        '#9333ea', // purple-600
        '#ea580c', // orange-600
    ];

    // Resize canvas
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            // Save current drawing
            const ctx = canvas.getContext('2d');
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            // Set white background
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                if (imageData) {
                    ctx.putImageData(imageData, 0, 0);
                }
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
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
            const coords = getCoords(e);
            if (!coords) return;
            setIsDrawing(true);
            lastPointRef.current = coords;
        },
        [getCoords]
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing) return;
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
        [isDrawing, color, lineWidth, tool, getCoords]
    );

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
        lastPointRef.current = null;
    }, []);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
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

                <button
                    onClick={clearCanvas}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                >
                    🗑 Clear
                </button>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="relative flex-1 cursor-crosshair bg-white">
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
