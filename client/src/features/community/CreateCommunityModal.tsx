'use client';

import { useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { X, Sparkles } from 'lucide-react';

interface CreateCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SUBJECT_OPTIONS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Computer Science', 'English', 'History', 'Geography',
    'Economics', 'General Knowledge', 'Mixed / Other',
];

const EMOJI_OPTIONS = ['📚', '🧪', '🔬', '💻', '🧮', '🎯', '🌍', '📐', '🎨', '🚀', '💡', '🏆', '🎓', '📖', '🔭', '⚡'];

const COLOR_OPTIONS = [
    '#4F46E5', '#2563EB', '#7C3AED', '#DB2777',
    '#059669', '#D97706', '#0891B2', '#DC2626',
    '#6D28D9', '#0284C7', '#0D9488', '#CA8A04',
];

export default function CreateCommunityModal({ isOpen, onClose, onCreated }: CreateCommunityModalProps) {
    const { mentoraUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        subject: '',
        tags: '',
        logoEmoji: '📚',
        bannerColor: '#4F46E5',
        isPublic: true,
        rules: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentoraUser || !formData.name || !formData.subject) return;

        setLoading(true);
        try {
            const userRole = mentoraUser.roles.includes('tutor') ? 'tutor' : 'student';
            const res = await fetch(`${API}/community`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                    createdBy: mentoraUser.uid,
                    createdByName: mentoraUser.profile.fullName,
                    createdByRole: userRole,
                }),
            });

            if (res.ok) {
                onCreated();
                onClose();
                setFormData({
                    name: '', description: '', subject: '', tags: '',
                    logoEmoji: '📚', bannerColor: '#4F46E5', isPublic: true, rules: '',
                });
            }
        } catch (err) {
            console.error('Failed to create community:', err);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="create-community-modal">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Create Community</h2>
                                <p className="text-xs text-slate-400">Build your learning clan</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Community Icon + Color Preview */}
                    <div className="flex justify-center">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg border-2 border-white transition-all"
                            style={{ background: `linear-gradient(135deg, ${formData.bannerColor}, ${formData.bannerColor}cc)` }}
                        >
                            {formData.logoEmoji}
                        </div>
                    </div>

                    {/* Emoji picker */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-2 block">Community Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, logoEmoji: emoji })}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${formData.logoEmoji === emoji
                                            ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110'
                                            : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color picker */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-2 block">Banner Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, bannerColor: color })}
                                    className={`w-8 h-8 rounded-full transition-all ${formData.bannerColor === color ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : 'hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Community Name *</label>
                        <input
                            required
                            maxLength={50}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Physics Masterminds"
                            className="input-styled"
                            id="community-name-input"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
                        <textarea
                            rows={3}
                            maxLength={250}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What is this community about?"
                            className="input-styled resize-none"
                            id="community-desc-input"
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subject / Agenda *</label>
                        <select
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="input-styled"
                            id="community-subject-input"
                        >
                            <option value="">Select a subject...</option>
                            {SUBJECT_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Tags</label>
                        <input
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="e.g., JEE, Optics, Quantum (comma separated)"
                            className="input-styled"
                        />
                    </div>

                    {/* Public toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                        <div>
                            <span className="text-sm font-medium text-slate-700">Public Community</span>
                            <p className="text-xs text-slate-400">Anyone can find and join</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                            className={`w-11 h-6 rounded-full transition-all duration-200 ${formData.isPublic ? 'bg-indigo-500' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${formData.isPublic ? 'translate-x-5.5' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !formData.name || !formData.subject}
                        className="btn-primary w-full !rounded-xl text-center disabled:opacity-50 disabled:cursor-not-allowed"
                        id="create-community-submit"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Create Community
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
