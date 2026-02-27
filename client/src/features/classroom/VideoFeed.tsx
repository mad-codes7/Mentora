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
    }, [remoteStream]);

    // Check whether remote has video tracks enabled
    const remoteVideoTrackEnabled = remoteStream?.getVideoTracks().some(t => t.enabled) ?? false;

    return (
        <>
            {/* ── Remote video (top-right) ── Always shown once call started */}
            <div className="absolute right-4 top-4 z-30">
                <div className="overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/30 relative h-32 w-44 sm:h-40 sm:w-56">
                    {isConnected && remoteStream ? (
                        <>
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className={`h-full w-full object-cover ${!remoteVideoTrackEnabled ? 'opacity-0' : ''}`}
                            />
                            {!remoteVideoTrackEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-600">
                                        <User className="h-6 w-6 text-slate-400" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Waiting for other person */
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 mb-2">
                                <User className="h-6 w-6 text-slate-500" />
                            </div>
                            <span className="text-[10px] text-slate-500 animate-pulse">Connecting...</span>
                        </div>
                    )}
                </div>
                <p className="mt-1 text-center text-xs font-medium text-white/80 drop-shadow">
                    {remoteLabel}
                </p>
            </div>

            {/* ── Local video (bottom-right, PiP) ── Always shown */}
            <div className="absolute bottom-20 right-4 z-30">
                <div className="overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/30 relative h-24 w-32 sm:h-32 sm:w-44">
                    {localStream ? (
                        <>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`h-full w-full object-cover ${isVideoOff ? 'opacity-0' : ''}`}
                            />
                            {isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
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
