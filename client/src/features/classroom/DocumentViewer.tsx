'use client';

import { useState } from 'react';

interface DocumentViewerProps {
    documents: string[];
}

export default function DocumentViewer({ documents }: DocumentViewerProps) {
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

    if (documents.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <span className="text-3xl">📄</span>
                <p className="mt-2 text-sm text-slate-400">
                    No documents shared yet.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    Documents uploaded by your tutor will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-slate-800">
            {/* Header */}
            <div className="border-b border-slate-700 px-4 py-3">
                <h3 className="text-sm font-semibold text-white">
                    📎 Shared Documents ({documents.length})
                </h3>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {documents.map((docUrl, index) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(docUrl) || docUrl.startsWith('data:image');
                    const isPdf = /\.pdf$/i.test(docUrl);
                    const fileName = docUrl.startsWith('data:')
                        ? `Image ${index + 1}`
                        : decodeURIComponent(docUrl.split('/').pop()?.split('?')[0] || `Document ${index + 1}`);

                    return (
                        <button
                            key={index}
                            onClick={() => setSelectedDoc(selectedDoc === docUrl ? null : docUrl)}
                            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm transition-colors ${selectedDoc === docUrl
                                    ? 'bg-blue-600/20 text-blue-300'
                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <span className="text-lg">
                                {isImage ? '🖼️' : isPdf ? '📕' : '📄'}
                            </span>
                            <span className="flex-1 truncate text-xs">
                                {fileName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {selectedDoc === docUrl ? '▲' : '▼'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Preview Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative mx-4 max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedDoc(null)}
                            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                        >
                            ✕
                        </button>

                        {/* Content */}
                        {selectedDoc.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(selectedDoc) ? (
                            <img
                                src={selectedDoc}
                                alt="Shared document"
                                className="max-h-[85vh] rounded-2xl object-contain"
                            />
                        ) : /\.pdf$/i.test(selectedDoc) ? (
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
