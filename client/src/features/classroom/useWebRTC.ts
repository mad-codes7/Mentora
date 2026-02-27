'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    doc,
    collection,
    setDoc,
    onSnapshot,
    addDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

interface UseWebRTCOptions {
    sessionId: string;
    userId: string;
    isCaller: boolean;
}

interface UseWebRTCReturn {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isConnected: boolean;
    isAudioMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isFrontCamera: boolean;
    isCallEnded: boolean;
    endedBy: string | null;
    toggleAudio: () => void;
    toggleVideo: () => void;
    startCall: () => Promise<void>;
    endCall: () => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => void;
    flipCamera: () => Promise<void>;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export default function useWebRTC({
    sessionId,
    userId,
    isCaller,
}: UseWebRTCOptions): UseWebRTCReturn {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    // ── DEFAULT ON — media flows immediately ──
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [isCallEnded, setIsCallEnded] = useState(false);
    const [endedBy, setEndedBy] = useState<string | null>(null);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const endCallUnsubRef = useRef<(() => void) | null>(null);

    const cleanup = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }
        if (endCallUnsubRef.current) {
            endCallUnsubRef.current();
            endCallUnsubRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setIsConnected(false);
        setIsScreenSharing(false);
    }, []);

    const startCall = useCallback(async () => {
        try {
            // Get user media — tracks start ENABLED so media flows immediately
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioMuted(false);
            setIsVideoOff(false);

            // Create peer connection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            // Add local tracks to peer connection
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            // Listen for remote tracks — use the stream WebRTC provides directly
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            // Connection state
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    setIsConnected(true);
                } else if (
                    pc.connectionState === 'disconnected' ||
                    pc.connectionState === 'failed'
                ) {
                    setIsConnected(false);
                }
            };

            const signalingRef = doc(db, 'sessions', sessionId, 'webrtc_signaling', 'signal');

            if (isCaller) {
                // Caller: create offer
                const candidatesCollection = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'callerCandidates'
                );

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        addDoc(candidatesCollection, event.candidate.toJSON());
                    }
                };

                const offerDescription = await pc.createOffer();
                await pc.setLocalDescription(offerDescription);

                await setDoc(signalingRef, {
                    offer: {
                        type: offerDescription.type,
                        sdp: offerDescription.sdp,
                    },
                });

                // Listen for answer
                onSnapshot(signalingRef, (snap) => {
                    const data = snap.data();
                    if (data?.answer && !pc.currentRemoteDescription) {
                        const answerDescription = new RTCSessionDescription(data.answer);
                        pc.setRemoteDescription(answerDescription);
                    }
                });

                // Listen for callee ICE candidates
                const calleeCandidates = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'calleeCandidates'
                );
                onSnapshot(calleeCandidates, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            pc.addIceCandidate(candidate);
                        }
                    });
                });
            } else {
                // Callee: wait for offer, then create answer
                const candidatesCollection = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'calleeCandidates'
                );

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        addDoc(candidatesCollection, event.candidate.toJSON());
                    }
                };

                // Listen for offer
                onSnapshot(signalingRef, async (snap) => {
                    const data = snap.data();
                    if (data?.offer && !pc.currentRemoteDescription) {
                        const offerDescription = new RTCSessionDescription(data.offer);
                        await pc.setRemoteDescription(offerDescription);

                        const answerDescription = await pc.createAnswer();
                        await pc.setLocalDescription(answerDescription);

                        await updateDoc(signalingRef, {
                            answer: {
                                type: answerDescription.type,
                                sdp: answerDescription.sdp,
                            },
                        });
                    }
                });

                // Listen for caller ICE candidates
                const callerCandidates = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'callerCandidates'
                );
                onSnapshot(callerCandidates, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            pc.addIceCandidate(candidate);
                        }
                    });
                });
            }

            // ── LISTEN FOR END-CALL SIGNAL ──
            const endCallRef = doc(db, 'sessions', sessionId, 'signals', 'endCall');
            endCallUnsubRef.current = onSnapshot(endCallRef, (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (data?.ended) {
                        setIsCallEnded(true);
                        setEndedBy(data.by || null);
                        cleanup();
                    }
                }
            });
        } catch (error) {
            console.error('WebRTC error:', error);
        }
    }, [sessionId, isCaller, cleanup]);

    const toggleAudio = useCallback(async () => {
        if (!localStreamRef.current) return;

        const audioTracks = localStreamRef.current.getAudioTracks();
        const liveTrack = audioTracks.find(t => t.readyState === 'live');

        if (liveTrack) {
            // Track is alive, just toggle enabled
            liveTrack.enabled = !liveTrack.enabled;
            setIsAudioMuted(!liveTrack.enabled);
        } else {
            // Track is dead or missing — re-acquire audio
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newTrack = newStream.getAudioTracks()[0];
                newTrack.enabled = true;

                // Remove old dead tracks
                audioTracks.forEach(t => { t.stop(); localStreamRef.current!.removeTrack(t); });
                localStreamRef.current.addTrack(newTrack);

                // Replace on peer connection
                const pc = peerConnectionRef.current;
                if (pc) {
                    const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio' || (!s.track));
                    if (audioSender) await audioSender.replaceTrack(newTrack);
                    else pc.addTrack(newTrack, localStreamRef.current);
                }

                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                setIsAudioMuted(false);
            } catch (err) {
                console.error('Could not re-acquire audio:', err);
            }
        }
    }, []);

    const toggleVideo = useCallback(async () => {
        if (!localStreamRef.current) return;

        const videoTracks = localStreamRef.current.getVideoTracks();
        const liveTrack = videoTracks.find(t => t.readyState === 'live');

        if (liveTrack) {
            // Track is alive, just toggle enabled
            liveTrack.enabled = !liveTrack.enabled;
            setIsVideoOff(!liveTrack.enabled);
        } else {
            // Track is dead or missing — re-acquire video
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newTrack = newStream.getVideoTracks()[0];
                newTrack.enabled = true;

                // Remove old dead tracks
                videoTracks.forEach(t => { t.stop(); localStreamRef.current!.removeTrack(t); });
                localStreamRef.current.addTrack(newTrack);

                // Replace on peer connection
                const pc = peerConnectionRef.current;
                if (pc) {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || (!s.track));
                    if (videoSender) await videoSender.replaceTrack(newTrack);
                    else pc.addTrack(newTrack, localStreamRef.current);
                }

                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                setIsVideoOff(false);
            } catch (err) {
                console.error('Could not re-acquire video:', err);
            }
        }
    }, []);

    // ── SCREEN SHARE ──
    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });
            screenStreamRef.current = screenStream;

            const screenTrack = screenStream.getVideoTracks()[0];
            const pc = peerConnectionRef.current;
            if (!pc) return;

            // Find the video sender and replace track
            const videoSender = pc.getSenders().find(
                (s) => s.track?.kind === 'video'
            );
            if (videoSender && localStreamRef.current) {
                originalVideoTrackRef.current = videoSender.track;
                await videoSender.replaceTrack(screenTrack);
            }

            setIsScreenSharing(true);

            // When user stops sharing via browser UI
            screenTrack.onended = () => {
                stopScreenShare();
            };
        } catch (error) {
            console.error('Screen share error:', error);
        }
    }, []);

    const stopScreenShare = useCallback(() => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        // Restore original video track
        if (originalVideoTrackRef.current) {
            const videoSender = pc.getSenders().find(
                (s) => s.track?.kind === 'video' || s.track === null
            );
            if (videoSender) {
                videoSender.replaceTrack(originalVideoTrackRef.current);
            }
            originalVideoTrackRef.current = null;
        }

        setIsScreenSharing(false);
    }, []);

    // ── END CALL (writes signal to Firestore) ──
    const endCall = useCallback(async () => {
        try {
            const endCallRef = doc(db, 'sessions', sessionId, 'signals', 'endCall');
            await setDoc(endCallRef, {
                ended: true,
                by: userId,
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            console.error('Error signaling end call:', e);
        }
        cleanup();
        setIsCallEnded(true);
        setEndedBy(userId);
    }, [cleanup, sessionId, userId]);

    // ── FLIP CAMERA (front/back for mobile) ──
    const flipCamera = useCallback(async () => {
        try {
            const newFacing = isFrontCamera ? 'environment' : 'user';
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: newFacing } },
                audio: false,
            });

            const newVideoTrack = newStream.getVideoTracks()[0];
            // Preserve current mute state
            newVideoTrack.enabled = !isVideoOff;

            // Replace track in local stream
            if (localStreamRef.current) {
                const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
                if (oldVideoTrack) {
                    localStreamRef.current.removeTrack(oldVideoTrack);
                    oldVideoTrack.stop();
                }
                localStreamRef.current.addTrack(newVideoTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }

            // Replace track on peer connection sender
            const pc = peerConnectionRef.current;
            if (pc) {
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(newVideoTrack);
                }
            }

            setIsFrontCamera(!isFrontCamera);
        } catch (error) {
            console.error('Flip camera error:', error);
            // Fallback: device may not support exact facingMode, try without exact
            try {
                const newFacing = isFrontCamera ? 'environment' : 'user';
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: newFacing },
                    audio: false,
                });
                const newVideoTrack = newStream.getVideoTracks()[0];
                newVideoTrack.enabled = !isVideoOff;

                if (localStreamRef.current) {
                    const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
                    if (oldVideoTrack) {
                        localStreamRef.current.removeTrack(oldVideoTrack);
                        oldVideoTrack.stop();
                    }
                    localStreamRef.current.addTrack(newVideoTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                }

                const pc = peerConnectionRef.current;
                if (pc) {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender) {
                        await videoSender.replaceTrack(newVideoTrack);
                    }
                }

                setIsFrontCamera(!isFrontCamera);
            } catch (fallbackError) {
                console.error('Flip camera fallback error:', fallbackError);
            }
        }
    }, [isFrontCamera, isVideoOff]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        localStream,
        remoteStream,
        isConnected,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        isFrontCamera,
        isCallEnded,
        endedBy,
        toggleAudio,
        toggleVideo,
        startCall,
        endCall,
        startScreenShare,
        stopScreenShare,
        flipCamera,
    };
}
