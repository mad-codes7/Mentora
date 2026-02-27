'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { analyzeDoubtImage } from '@/config/analyzeDoubtImage';
import { Camera, Upload, X, Rocket, Sparkles, Loader2 } from 'lucide-react';

const SUBJECT_TAGS = [
    { label: 'Algebra', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'Geometry', color: 'bg-violet-50 text-violet-600 border-violet-200' },
    { label: 'Calculus', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { label: 'Physics', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Chemistry', color: 'bg-green-50 text-green-600 border-green-200' },
    { label: 'Biology', color: 'bg-rose-50 text-rose-600 border-rose-200' },
    { label: 'English', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { label: 'Computer Science', color: 'bg-sky-50 text-sky-600 border-sky-200' },
    { label: 'Statistics', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { label: 'Trigonometry', color: 'bg-pink-50 text-pink-600 border-pink-200' },
    { label: 'Organic Chemistry', color: 'bg-teal-50 text-teal-600 border-teal-200' },
    { label: 'Mechanics', color: 'bg-orange-50 text-orange-600 border-orange-200' },
];

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800;
                let { width, height } = img;
                if (width > height && width > MAX_SIZE) {
                    height = (height * MAX_SIZE) / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width = (width * MAX_SIZE) / height;
                    height = MAX_SIZE;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function DoubtUpload() {
    const { firebaseUser } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // AI analysis state
    const [analyzing, setAnalyzing] = useState(false);
    const [aiSuggested, setAiSuggested] = useState(false);
    const [userEditedTags, setUserEditedTags] = useState(false);
    const [userEditedDesc, setUserEditedDesc] = useState(false);

    // Trigger AI analysis when an image is uploaded
    useEffect(() => {
        if (!imagePreview) return;
        let cancelled = false;

        const runAnalysis = async () => {
            setAnalyzing(true);
            try {
                const result = await analyzeDoubtImage(imagePreview);
                if (cancelled) return;

                // Auto-fill tags only if user hasn't manually selected any
                if (!userEditedTags && result.tags.length > 0) {
                    setSelectedTags(result.tags);
                }
                // Auto-fill description only if user hasn't manually typed anything
                if (!userEditedDesc && result.description) {
                    setDescription(result.description);
                }
                if (result.tags.length > 0 || result.description) {
                    setAiSuggested(true);
                }
            } catch (err) {
                console.warn('AI analysis failed:', err);
            } finally {
                if (!cancelled) setAnalyzing(false);
            }
        };

        runAnalysis();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imagePreview]);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5MB');
            return;
        }
        setImageFile(file);
        setAiSuggested(false);
        setUserEditedTags(false);
        setUserEditedDesc(false);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const toggleTag = (tag: string) => {
        setUserEditedTags(true);
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setAiSuggested(false);
        setAnalyzing(false);
        setSelectedTags([]);
        setDescription('');
        setUserEditedTags(false);
        setUserEditedDesc(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!firebaseUser || !imageFile) return;
        setUploading(true);

        try {
            const compressedBase64 = await compressImage(imageFile);

            // If user didn't select tags or describe, run AI analysis one more time as fallback
            let finalTags = selectedTags;
            let finalDescription = description.trim();

            if (finalTags.length === 0 || !finalDescription) {
                try {
                    const result = await analyzeDoubtImage(compressedBase64);
                    if (finalTags.length === 0 && result.tags.length > 0) {
                        finalTags = result.tags;
                    }
                    if (!finalDescription && result.description) {
                        finalDescription = result.description;
                    }
                } catch {
                    // Proceed without AI tags — not a blocker
                }
            }

            const doubtData = {
                studentId: firebaseUser.uid,
                imageUrl: compressedBase64,
                description: finalDescription,
                tags: finalTags,
                status: 'open',
                matchedTutorId: null,
                sessionId: null,
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, 'doubts'), doubtData);

            const tagParams = finalTags.length > 0
                ? `?tags=${encodeURIComponent(finalTags.join(','))}`
                : '';
            router.push(`/find-tutor${tagParams}`);
        } catch (error) {
            console.error('Error uploading doubt:', error);
            alert('Failed to upload doubt. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">
                        Instant Doubt
                    </h3>
                    <p className="text-sm text-slate-400">
                        Snap a photo — AI detects the subject instantly
                    </p>
                </div>
            </div>

            {/* Image Upload Area */}
            {!imagePreview ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-all duration-300 ${dragOver
                        ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                        : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/50'
                        }`}
                >
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 transition-transform hover:scale-110">
                        <Upload className="h-6 w-6 text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                        Click to upload or drag & drop
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        PNG, JPG up to 5MB
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleInputChange}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="relative mb-4 animate-scale-in">
                    <img
                        src={imagePreview}
                        alt="Doubt preview"
                        className="max-h-64 w-full rounded-2xl border border-slate-100 object-contain bg-slate-50 shadow-sm"
                    />
                    <button
                        onClick={removeImage}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Description + Tags (show after image) */}
            {imagePreview && (
                <div className="animate-fade-in-up">
                    {/* AI Analysis Status */}
                    {analyzing && (
                        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5 mb-4">
                            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                            <span className="text-sm font-medium text-indigo-600">
                                AI is analyzing your doubt...
                            </span>
                        </div>
                    )}

                    {aiSuggested && !analyzing && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 mb-4">
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-600">
                                AI auto-detected subject & description
                            </span>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Describe your doubt <span className="text-slate-400 font-normal">(optional — AI fills if blank)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                setUserEditedDesc(true);
                            }}
                            rows={2}
                            placeholder="e.g. I'm stuck on question 5, can't figure out the integral..."
                            className="input-styled resize-none text-sm"
                        />
                    </div>

                    {/* Subject Tags */}
                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Subject tags <span className="text-slate-400 font-normal">(auto-detected or pick manually)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SUBJECT_TAGS.map((tag) => (
                                <button
                                    key={tag.label}
                                    type="button"
                                    onClick={() => toggleTag(tag.label)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-200 ${selectedTags.includes(tag.label)
                                        ? 'gradient-primary text-white border-transparent shadow-sm scale-105'
                                        : `${tag.color} hover:shadow-sm`
                                        }`}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="btn-primary mt-5 w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Rocket className="h-4 w-4" />
                                Find a Tutor for This Doubt
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
