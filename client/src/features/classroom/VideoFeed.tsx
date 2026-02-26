'use client';

import { useEffect, useRef } from 'react';

interface VideoFeedProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isConnected: boolean;
}

export default function VideoFeed({
    localStream,
    remoteStream,
    isConnected,
}: VideoFeedProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <>
            {/* Remote Video (if connected) */}
            {isConnected && remoteStream && (
                <div className="absolute right-4 top-4 z-30">
                    <div className="overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/30">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="h-32 w-44 object-cover sm:h-40 sm:w-56"
                        />
                    </div>
                    <p className="mt-1 text-center text-xs font-medium text-white/80 drop-shadow">
                        Remote
                    </p>
                </div>
            )}

            {/* Local Video (PiP) */}
            {localStream && (
                <div className="absolute bottom-20 right-4 z-30">
                    <div className="overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/30">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-24 w-32 object-cover sm:h-32 sm:w-44"
                        />
                    </div>
                    <p className="mt-1 text-center text-xs font-medium text-white/80 drop-shadow">
                        You
                    </p>
                </div>
            )}

            {/* Connection Status */}
            {!isConnected && (
                <div className="absolute right-4 top-4 z-30 rounded-xl bg-black/50 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400" />
                        <span className="text-sm font-medium text-white">
                            Waiting for connection...
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
