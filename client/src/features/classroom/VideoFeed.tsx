'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { User, MonitorUp, Maximize2, Minimize2 } from 'lucide-react';

interface VideoFeedProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    screenStream: MediaStream | null;
    isConnected: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    remoteScreenSharing: boolean;
    localLabel?: string;
    remoteLabel?: string;
}

export default function VideoFeed({
    localStream,
    remoteStream,
    screenStream,
    isConnected,
    isVideoOff,
    isScreenSharing,
    remoteScreenSharing,
    localLabel = 'You',
    remoteLabel = 'Remote',
}: VideoFeedProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const screenContainerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Listen for fullscreen changes (e.g. user presses Escape)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (!screenContainerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await screenContainerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (e) {
            console.error('Fullscreen error:', e);
        }
    }, []);

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
    }, [remoteStream, isConnected]);

    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
            screenVideoRef.current.play().catch(() => { });
        }
    }, [screenStream]);

    const remoteHasVideo = remoteStream?.getVideoTracks().some(t => t.enabled) ?? false;
    const showRemoteVideo = isConnected && remoteStream && remoteHasVideo;
    const anyScreenSharing = isScreenSharing || remoteScreenSharing;

    // ── SCREEN SHARE LAYOUT ──
    if (anyScreenSharing) {
        return (
            <>
                {/* Full-area shared screen */}
                <div ref={screenContainerRef} className="absolute inset-0 z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                    {/* Sharing indicator */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
                        <div className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600/90 to-indigo-600/90 backdrop-blur-md px-5 py-2 shadow-xl shadow-blue-500/20 border border-white/10">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                            </span>
                            <MonitorUp className="h-3.5 w-3.5 text-white/90" />
                            <span className="text-xs font-semibold text-white tracking-wide">
                                {isScreenSharing ? 'You are sharing your screen' : 'Tutor is sharing screen'}
                            </span>
                        </div>
                        {/* Fullscreen toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen
                                ? <Minimize2 className="h-3.5 w-3.5 text-white" />
                                : <Maximize2 className="h-3.5 w-3.5 text-white" />
                            }
                        </button>
                    </div>

                    {/* Screen content */}
                    {isScreenSharing && screenStream ? (
                        <video
                            ref={screenVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-contain"
                        />
                    ) : remoteScreenSharing && remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-16 w-16 rounded-2xl bg-slate-800/80 flex items-center justify-center">
                                <MonitorUp className="h-8 w-8 text-slate-600" />
                            </div>
                            <span className="text-sm text-slate-500 font-medium">Waiting for screen share...</span>
                        </div>
                    )}
                </div>

                {/* Remote video PiP (when local user is sharing) */}
                {isScreenSharing && (
                    <div className="absolute right-4 top-16 z-30 group">
                        <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/30 relative h-28 w-40 sm:h-32 sm:w-44 bg-slate-800 ring-1 ring-white/10 transition-transform group-hover:scale-105">
                            <video
                                ref={!remoteScreenSharing ? remoteVideoRef : undefined}
                                autoPlay
                                playsInline
                                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${showRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {!showRemoteVideo && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700/80 mb-1.5">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    {!isConnected && <span className="text-[10px] text-slate-500 animate-pulse">Connecting...</span>}
                                    {isConnected && !remoteHasVideo && remoteStream && <span className="text-[10px] text-slate-500">Camera off</span>}
                                </div>
                            )}
                        </div>
                        <p className="mt-1.5 text-center text-[11px] font-medium text-white/60">{remoteLabel}</p>
                    </div>
                )}

                {/* Local camera PiP */}
                <div className="absolute bottom-24 right-4 z-30 group">
                    <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/30 relative h-20 w-28 sm:h-24 sm:w-32 bg-slate-800 ring-1 ring-white/10 transition-transform group-hover:scale-105">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${(localStream && !isVideoOff) ? 'opacity-100' : 'opacity-0'}`}
                        />
                        {(!localStream || isVideoOff) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/80">
                                    <User className="h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="mt-1.5 text-center text-[11px] font-medium text-white/60">{localLabel}</p>
                </div>
            </>
        );
    }

    // ── NORMAL LAYOUT ──
    return (
        <>
            {/* Remote video (top-right) */}
            <div className="absolute right-4 top-4 z-30 group">
                <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/30 relative h-32 w-44 sm:h-40 sm:w-56 bg-slate-800 ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.03]">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${showRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {!showRemoteVideo && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/80 mb-2">
                                <User className="h-6 w-6 text-slate-400" />
                            </div>
                            {!isConnected && (
                                <span className="text-[10px] text-slate-500 animate-pulse">Connecting...</span>
                            )}
                            {isConnected && !remoteHasVideo && remoteStream && (
                                <span className="text-[10px] text-slate-500">Camera off</span>
                            )}
                        </div>
                    )}
                    {/* Connection dot indicator */}
                    <div className="absolute top-2 left-2">
                        <span className={`flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    </div>
                </div>
                <p className="mt-1.5 text-center text-[11px] font-medium text-white/60">{remoteLabel}</p>
            </div>

            {/* Local video (bottom-right PiP) */}
            <div className="absolute bottom-24 right-4 z-30 group">
                <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/30 relative h-24 w-32 sm:h-32 sm:w-44 bg-slate-800 ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.03]">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${(localStream && !isVideoOff) ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {(!localStream || isVideoOff) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/80">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                        </div>
                    )}
                </div>
                <p className="mt-1.5 text-center text-[11px] font-medium text-white/60">{localLabel}</p>
            </div>
        </>
    );
}
