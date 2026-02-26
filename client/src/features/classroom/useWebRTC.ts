'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    doc,
    collection,
    setDoc,
    getDoc,
    onSnapshot,
    addDoc,
    updateDoc,
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
    toggleAudio: () => void;
    toggleVideo: () => void;
    startCall: () => Promise<void>;
    endCall: () => void;
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
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setIsConnected(false);
    }, []);

    const startCall = useCallback(async () => {
        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Create peer connection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            // Create remote stream
            const remote = new MediaStream();
            setRemoteStream(remote);

            // Add local tracks to peer connection
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            // Listen for remote tracks
            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach((track) => {
                    remote.addTrack(track);
                });
                setRemoteStream(new MediaStream(remote.getTracks()));
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
        } catch (error) {
            console.error('WebRTC error:', error);
        }
    }, [sessionId, isCaller]);

    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsAudioMuted((prev) => !prev);
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff((prev) => !prev);
        }
    }, []);

    const endCall = useCallback(() => {
        cleanup();
    }, [cleanup]);

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
        toggleAudio,
        toggleVideo,
        startCall,
        endCall,
    };
}
