'use client';

import { useState, useEffect } from 'react';

interface SessionTimerProps {
    durationMinutes: number;
    startTime: Date | null;
    onTimeUp: () => void;
}

export default function SessionTimer({
    durationMinutes,
    startTime,
    onTimeUp,
}: SessionTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
        if (!startTime) {
            setTimeRemaining(durationMinutes * 60);
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const remaining = Math.max(0, durationMinutes * 60 - elapsed);

            setTimeRemaining(remaining);
            setIsWarning(remaining <= 300); // 5 min warning

            if (remaining <= 0) {
                onTimeUp();
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [startTime, durationMinutes, onTimeUp]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progressPercent =
        ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100;

    return (
        <div
            className={`flex items-center gap-3 rounded-lg px-4 py-2 ${isWarning
                    ? 'bg-red-100/80 text-red-700'
                    : 'bg-slate-800/60 text-white backdrop-blur-sm'
                }`}
        >
            {/* Timer Icon */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>

            {/* Time */}
            <span className="font-mono text-sm font-bold">{formatTime(timeRemaining)}</span>

            {/* Progress bar */}
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
                <div
                    className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-blue-400'
                        }`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
