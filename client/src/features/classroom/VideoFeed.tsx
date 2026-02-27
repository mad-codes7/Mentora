'use client';

import { useEffect, useRef } from 'react';
import { User } from 'lucide-react';

interface VideoFeedProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isConnected: boolean;
    isVideoOff: boolean;
    localLabel?: string;
    remoteLabel?: string;
}

export default function VideoFeed({
    localStream,
    remoteStream,
    isConnected,
    isVideoOff,
    localLabel = 'You',
    remoteLabel = 'Remote',
}: VideoFeedProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // ── Set srcObject whenever stream OR connection state changes ──
    // CRITICAL: depends on isConnected too, so it re-runs when video element becomes visible
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(() => { });
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => { });
        }
    }, [remoteStream, isConnected]); // ← also re-run when isConnected changes

    const remoteHasVideo = remoteStream?.getVideoTracks().some(t => t.enabled) ?? false;
    const showRemoteVideo = isConnected && remoteStream && remoteHasVideo;

    return (
        <>
            {/* ── Remote video (top-right) ── */}
            <div className="absolute right-4 top-4 z-30">
                <div className="overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/30 relative h-32 w-44 sm:h-40 sm:w-56 bg-slate-800">
                    {/* Video element is ALWAYS in DOM — never conditionally removed */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`absolute inset-0 h-full w-full object-cover ${showRemoteVideo ? '' : 'opacity-0 pointer-events-none'}`}
                    />

                    {/* Overlay: avatar or connecting state */}
                    {!showRemoteVideo && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 mb-2">
                                <User className="h-6 w-6 text-slate-500" />
                            </div>
                            {!isConnected && (
                                <span className="text-[10px] text-slate-500 animate-pulse">Connecting...</span>
                            )}
                            {isConnected && !remoteHasVideo && remoteStream && (
                                <span className="text-[10px] text-slate-500">Camera off</span>
                            )}
                        </div>
                    )}
                </div>
                <p className="mt-1 text-center text-xs font-medium text-white/80 drop-shadow">
                    {remoteLabel}
                </p>
            </div>

            {/* ── Local video (bottom-right, PiP) ── */}
            <div className="absolute bottom-20 right-4 z-30">
                <div className="overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/30 relative h-24 w-32 sm:h-32 sm:w-44 bg-slate-800">
                    {/* Video element is ALWAYS in DOM */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`absolute inset-0 h-full w-full object-cover ${(localStream && !isVideoOff) ? '' : 'opacity-0 pointer-events-none'}`}
                    />

                    {/* Overlay when video is off */}
                    {(!localStream || isVideoOff) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                                <User className="h-5 w-5 text-slate-500" />
                            </div>
                        </div>
                    )}
                </div>
                <p className="mt-1 text-center text-xs font-medium text-white/80 drop-shadow">
                    {localLabel}
                </p>
            </div>
        </>
    );
}
