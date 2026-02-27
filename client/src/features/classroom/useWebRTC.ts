'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    doc,
    collection,
    setDoc,
    onSnapshot,
    addDoc,
    updateDoc,
    getDocs,
    deleteDoc,
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

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free TURN servers from Open Relay Project (metered.ca free tier)
        {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'e8dd65b92f6aaa95c5528e18',
            credential: '6JKtSKSoMOEaid/A',
        },
        {
            urls: 'turn:a.relay.metered.ca:80?transport=tcp',
            username: 'e8dd65b92f6aaa95c5528e18',
            credential: '6JKtSKSoMOEaid/A',
        },
        {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'e8dd65b92f6aaa95c5528e18',
            credential: '6JKtSKSoMOEaid/A',
        },
        {
            urls: 'turns:a.relay.metered.ca:443?transport=tcp',
            username: 'e8dd65b92f6aaa95c5528e18',
            credential: '6JKtSKSoMOEaid/A',
        },
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
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [isCallEnded, setIsCallEnded] = useState(false);
    const [endedBy, setEndedBy] = useState<string | null>(null);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream>(new MediaStream());
    const screenStreamRef = useRef<MediaStream | null>(null);
    const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const unsubscribersRef = useRef<Array<() => void>>([]);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const remoteDescSetRef = useRef(false);

    const cleanup = useCallback(() => {
        // Unsubscribe all Firestore listeners
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];

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
        remoteStreamRef.current = new MediaStream();
        pendingCandidatesRef.current = [];
        remoteDescSetRef.current = false;
        setLocalStream(null);
        setRemoteStream(null);
        setIsConnected(false);
        setIsScreenSharing(false);
    }, []);

    // ── Helper: flush buffered ICE candidates ──
    const flushCandidates = useCallback(async (pc: RTCPeerConnection) => {
        const candidates = [...pendingCandidatesRef.current];
        pendingCandidatesRef.current = [];
        for (const c of candidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {
                console.warn('Failed to add buffered candidate:', e);
            }
        }
    }, []);

    // ── Helper: add or buffer an ICE candidate ──
    const handleRemoteCandidate = useCallback(
        (pc: RTCPeerConnection, candidateData: RTCIceCandidateInit) => {
            if (remoteDescSetRef.current) {
                pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) =>
                    console.warn('addIceCandidate error:', e)
                );
            } else {
                pendingCandidatesRef.current.push(candidateData);
            }
        },
        []
    );

    // ── Helper: clear old signaling data (caller only) ──
    const clearSignaling = useCallback(async () => {
        const signalingRef = doc(db, 'sessions', sessionId, 'webrtc_signaling', 'signal');

        // Delete old caller candidates
        try {
            const callerSnap = await getDocs(
                collection(db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'callerCandidates')
            );
            const deletePromises = callerSnap.docs.map((d) => deleteDoc(d.ref));
            await Promise.all(deletePromises);
        } catch (e) { /* ignore */ }

        // Delete old callee candidates
        try {
            const calleeSnap = await getDocs(
                collection(db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'calleeCandidates')
            );
            const deletePromises = calleeSnap.docs.map((d) => deleteDoc(d.ref));
            await Promise.all(deletePromises);
        } catch (e) { /* ignore */ }

        // Delete old signal doc
        try {
            await deleteDoc(signalingRef);
        } catch (e) { /* ignore */ }
    }, [sessionId]);

    // ═══════════════════════════════════════════
    //  START CALL
    // ═══════════════════════════════════════════
    const startCall = useCallback(async () => {
        try {
            // 1) Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioMuted(false);
            setIsVideoOff(false);

            // 2) Clear old signaling if caller
            if (isCaller) {
                await clearSignaling();
            }

            // 3) Create peer connection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            // 4) Add local tracks to peer connection — CALLER ONLY
            //    Callee adds tracks AFTER receiving the offer (inside onSnapshot)
            if (isCaller) {
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });
            }

            // 5) Handle remote tracks — build a NEW MediaStream each time
            remoteStreamRef.current = new MediaStream();
            pc.ontrack = (event) => {
                console.log('[WebRTC] ontrack fired, track kind:', event.track.kind);

                // Add to our persist ref
                remoteStreamRef.current.addTrack(event.track);

                // Create a brand new MediaStream so React detects the change
                setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));

                // Also listen for track ending
                event.track.onended = () => {
                    console.log('[WebRTC] remote track ended:', event.track.kind);
                };
            };

            // 6) Connection state monitoring
            pc.onconnectionstatechange = () => {
                console.log('[WebRTC] connectionState:', pc.connectionState);
                setIsConnected(pc.connectionState === 'connected');
            };

            pc.oniceconnectionstatechange = () => {
                console.log('[WebRTC] iceConnectionState:', pc.iceConnectionState);
            };

            // 7) Signaling
            const signalingRef = doc(db, 'sessions', sessionId, 'webrtc_signaling', 'signal');

            if (isCaller) {
                // ── CALLER FLOW ──

                // ICE candidates → Firestore
                const callerCandidatesCol = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'callerCandidates'
                );
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        addDoc(callerCandidatesCol, event.candidate.toJSON());
                    }
                };

                // Create and send offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await setDoc(signalingRef, {
                    offer: { type: offer.type, sdp: offer.sdp },
                    callId: Date.now().toString(),
                });

                // Listen for answer
                const unsubAnswer = onSnapshot(signalingRef, async (snap) => {
                    const data = snap.data();
                    if (data?.answer && !remoteDescSetRef.current) {
                        console.log('[WebRTC] Caller got answer');
                        remoteDescSetRef.current = true;
                        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        await flushCandidates(pc);
                    }
                });
                unsubscribersRef.current.push(unsubAnswer);

                // Listen for callee ICE candidates
                const calleeCandidatesCol = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'calleeCandidates'
                );
                const unsubCalleeCandidates = onSnapshot(calleeCandidatesCol, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            handleRemoteCandidate(pc, change.doc.data() as RTCIceCandidateInit);
                        }
                    });
                });
                unsubscribersRef.current.push(unsubCalleeCandidates);
            } else {
                // ── CALLEE FLOW ──

                // ICE candidates → Firestore
                const calleeCandidatesCol = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'calleeCandidates'
                );
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        addDoc(calleeCandidatesCol, event.candidate.toJSON());
                    }
                };

                // Listen for offer, then create answer
                const unsubOffer = onSnapshot(signalingRef, async (snap) => {
                    const data = snap.data();
                    if (data?.offer && !remoteDescSetRef.current) {
                        console.log('[WebRTC] Callee got offer');
                        remoteDescSetRef.current = true;

                        // Set remote description FIRST
                        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

                        // NOW add local tracks — this ensures they match the offer's transceivers
                        stream.getTracks().forEach((track) => {
                            pc.addTrack(track, stream);
                        });

                        // Ensure all transceivers are sendrecv (belt-and-suspenders)
                        pc.getTransceivers().forEach((transceiver) => {
                            if (transceiver.direction === 'recvonly' || transceiver.direction === 'inactive') {
                                transceiver.direction = 'sendrecv';
                            }
                        });

                        await flushCandidates(pc);

                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        await updateDoc(signalingRef, {
                            answer: { type: answer.type, sdp: answer.sdp },
                        });
                        console.log('[WebRTC] Callee sent answer with sendrecv');
                    }
                });
                unsubscribersRef.current.push(unsubOffer);

                // Listen for caller ICE candidates
                const callerCandidatesCol = collection(
                    db, 'sessions', sessionId, 'webrtc_signaling', 'signal', 'callerCandidates'
                );
                const unsubCallerCandidates = onSnapshot(callerCandidatesCol, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            handleRemoteCandidate(pc, change.doc.data() as RTCIceCandidateInit);
                        }
                    });
                });
                unsubscribersRef.current.push(unsubCallerCandidates);
            }

            // 8) Listen for end-call signal
            const endCallRef = doc(db, 'sessions', sessionId, 'signals', 'endCall');
            const unsubEndCall = onSnapshot(endCallRef, (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (data?.ended) {
                        setIsCallEnded(true);
                        setEndedBy(data.by || null);
                        cleanup();
                    }
                }
            });
            unsubscribersRef.current.push(unsubEndCall);
        } catch (error) {
            console.error('[WebRTC] startCall error:', error);
            alert('Could not access camera/microphone. Please allow permissions and try again.');
        }
    }, [sessionId, isCaller, cleanup, clearSignaling, flushCandidates, handleRemoteCandidate]);

    // ═══════════════════════════════════════════
    //  TOGGLE AUDIO / VIDEO
    // ═══════════════════════════════════════════
    const toggleAudio = useCallback(() => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !track.enabled;
        });
        setIsAudioMuted((prev) => !prev);
    }, []);

    const toggleVideo = useCallback(() => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = !track.enabled;
        });
        setIsVideoOff((prev) => !prev);
    }, []);

    // ── SCREEN SHARE ──
    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenStreamRef.current = screenStream;

            const screenTrack = screenStream.getVideoTracks()[0];
            const pc = peerConnectionRef.current;
            if (!pc) return;

            const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (videoSender && localStreamRef.current) {
                originalVideoTrackRef.current = videoSender.track;
                await videoSender.replaceTrack(screenTrack);
            }

            setIsScreenSharing(true);
            screenTrack.onended = () => stopScreenShare();
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

    // ── END CALL ──
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

    // ── FLIP CAMERA ──
    const flipCamera = useCallback(async () => {
        try {
            const newFacing = isFrontCamera ? 'environment' : 'user';
            const constraints = { video: { facingMode: newFacing }, audio: false };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
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
                const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
                if (videoSender) await videoSender.replaceTrack(newVideoTrack);
            }

            setIsFrontCamera(!isFrontCamera);
        } catch (error) {
            console.error('Flip camera error:', error);
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
