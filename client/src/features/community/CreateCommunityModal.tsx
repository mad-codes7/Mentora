'use client';

import { useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { X, Plus, Lock, Unlock } from 'lucide-react';

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
                setFormData({ name: '', description: '', subject: '', tags: '', logoEmoji: '📚', bannerColor: '#4F46E5', isPublic: true, rules: '' });
            }
        } catch (err) {
            console.error('Failed to create community:', err);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="create-community-modal">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-800">Create Community</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Accent color */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-2 block">Accent Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, bannerColor: color })}
                                    className={`w-7 h-7 rounded-full transition-all ${formData.bannerColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Name <span className="text-red-400">*</span></label>
                        <input
                            required
                            maxLength={50}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Physics Masterminds"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                            id="community-name-input"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                        <textarea
                            rows={2}
                            maxLength={250}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What's this community about?"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors resize-none"
                            id="community-desc-input"
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Subject <span className="text-red-400">*</span></label>
                        <select
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-300 transition-colors"
                            id="community-subject-input"
                        >
                            <option value="">Select subject</option>
                            {SUBJECT_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Tags</label>
                        <input
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="JEE, Optics, Quantum (comma separated)"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                        />
                    </div>

                    {/* Public toggle */}
                    <div className="flex items-center justify-between py-3 px-3 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            {formData.isPublic ? <Unlock className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-slate-400" />}
                            <div>
                                <span className="text-sm font-medium text-slate-700">{formData.isPublic ? 'Public' : 'Private'}</span>
                                <p className="text-[11px] text-slate-400">{formData.isPublic ? 'Anyone can join' : 'Invite only'}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                            className={`w-10 h-5.5 rounded-full relative transition-colors ${formData.isPublic ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${formData.isPublic ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.name || !formData.subject}
                            className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            id="create-community-submit"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Create
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
