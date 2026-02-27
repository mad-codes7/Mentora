'use client';

import { useState, useEffect, useRef } from 'react';
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react';

interface SharedDoc {
    id: string;
    name: string;
    url: string;
    type: string;
    uploadedBy: string;
    uploaderName: string;
    uploadedAt: Timestamp;
}

interface DocumentViewerProps {
    sessionId: string;
    isTutor: boolean;
    isStudent: boolean;
}

export default function DocumentViewer({ sessionId, isTutor, isStudent }: DocumentViewerProps) {
    const { firebaseUser, mentoraUser } = useAuth();
    const [documents, setDocuments] = useState<SharedDoc[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Subscribe to shared docs in real-time
    useEffect(() => {
        const q = query(
            collection(db, 'sessions', sessionId, 'sharedDocs'),
            orderBy('uploadedAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as SharedDoc[];
            setDocuments(docs);
        });

        return () => unsubscribe();
    }, [sessionId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !firebaseUser) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `sessions/${sessionId}/docs/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress));
                },
                (error) => {
                    console.error('Upload error:', error);
                    setUploading(false);
                },
                async () => {
                    // Get download URL and save metadata to Firestore
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                    await addDoc(collection(db, 'sessions', sessionId, 'sharedDocs'), {
                        name: file.name,
                        url: downloadURL,
                        type: file.type,
                        uploadedBy: firebaseUser.uid,
                        uploaderName: mentoraUser?.profile?.fullName || firebaseUser.email || 'User',
                        uploadedAt: Timestamp.now(),
                    });

                    setUploading(false);
                    setUploadProgress(0);
                }
            );
        } catch (error) {
            console.error('Upload error:', error);
            setUploading(false);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-purple-400" />;
        if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-400" />;
        return <File className="h-4 w-4 text-blue-400" />;
    };

    return (
        <div className="flex flex-1 min-h-0 flex-col">
            {/* Header */}
            <div className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    📎 Documents ({documents.length})
                </h3>

                {/* Upload button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <Upload className="h-3 w-3" />
                    Upload
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                />
            </div>

            {/* Upload progress */}
            {uploading && (
                <div className="px-4 py-2 bg-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {documents.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <span className="text-3xl">📄</span>
                        <p className="mt-2 text-sm text-slate-400">
                            No documents shared yet.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Upload files to share with {isTutor ? 'your student' : 'your tutor'}.
                        </p>
                    </div>
                ) : (
                    documents.map((docItem) => (
                        <button
                            key={docItem.id}
                            onClick={() => setSelectedDoc(selectedDoc === docItem.url ? null : docItem.url)}
                            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm transition-colors ${selectedDoc === docItem.url
                                ? 'bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/30'
                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            {getFileIcon(docItem.type)}
                            <div className="flex-1 min-w-0">
                                <span className="block truncate text-xs font-medium">
                                    {docItem.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    by {docItem.uploaderName}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                                {selectedDoc === docItem.url ? '▲' : '▼'}
                            </span>
                        </button>
                    ))
                )}
            </div>

            {/* Preview Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative mx-4 max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
                        <button
                            onClick={() => setSelectedDoc(null)}
                            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {selectedDoc.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || selectedDoc.match(/image/) ? (
                            <img
                                src={selectedDoc}
                                alt="Shared document"
                                className="max-h-[85vh] rounded-2xl object-contain"
                            />
                        ) : selectedDoc.match(/\.pdf/i) ? (
                            <iframe
                                src={selectedDoc}
                                className="h-[85vh] w-[80vw] max-w-4xl rounded-2xl"
                                title="PDF Document"
                            />
                        ) : (
                            <div className="flex h-64 items-center justify-center p-8">
                                <div className="text-center">
                                    <span className="text-4xl">📎</span>
                                    <p className="mt-3 text-slate-600">
                                        Cannot preview this file type.
                                    </p>
                                    <a
                                        href={selectedDoc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
