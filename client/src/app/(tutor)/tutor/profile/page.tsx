'use client';

import React, { useState } from 'react';
import { useTutor } from '@/hooks/useTutor';

const SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'English', 'Computer Science', 'History', 'Geography',
    'Economics', 'Psychology', 'Art', 'Music',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AvailabilitySlot {
    day: string;
    startTime: string;
    endTime: string;
}

export default function TutorProfilePage() {
    const { profile, loading, updateProfile } = useTutor();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [bio, setBio] = useState(profile?.tutorData?.bio || '');
    const [experience, setExperience] = useState(profile?.tutorData?.experience || '');
    const [hourlyRate, setHourlyRate] = useState(profile?.tutorData?.hourlyRate || 500);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile?.tutorData?.subjects || []);
    const [availability, setAvailability] = useState<AvailabilitySlot[]>(profile?.tutorData?.availability || []);

    // Sync state when profile loads
    React.useEffect(() => {
        if (profile?.tutorData) {
            setBio(profile.tutorData.bio || '');
            setExperience(profile.tutorData.experience || '');
            setHourlyRate(profile.tutorData.hourlyRate || 500);
            setSelectedSubjects(profile.tutorData.subjects || []);
            setAvailability(profile.tutorData.availability || []);
        }
    }, [profile]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    const toggleSubject = (subject: string) => {
        setSelectedSubjects((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
        );
    };

    const addSlot = () => {
        setAvailability([...availability, { day: 'Monday', startTime: '09:00', endTime: '17:00' }]);
    };

    const removeSlot = (index: number) => {
        setAvailability(availability.filter((_, i) => i !== index));
    };

    const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string) => {
        const updated = [...availability];
        updated[index] = { ...updated[index], [field]: value };
        setAvailability(updated);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage('');
            await updateProfile({ subjects: selectedSubjects, availability, bio, experience, hourlyRate });
            setMessage('Profile updated successfully!');
            setEditing(false);
        } catch {
            setMessage('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your tutor profile and availability</p>
                </div>
                {!editing ? (
                    <button className="btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
                ) : (
                    <div className="flex gap-3">
                        <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div
                    className="mb-6 p-4 rounded-xl text-sm font-medium"
                    style={{
                        background: message.includes('success') ? 'var(--success-light)' : 'var(--error-light)',
                        color: message.includes('success') ? 'var(--success)' : 'var(--error)',
                        border: `1px solid ${message.includes('success') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                >
                    {message}
                </div>
            )}

            {/* Profile Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>About</h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                            {editing ? (
                                <textarea className="input-styled" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{bio || 'No bio set'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Experience</label>
                            {editing ? (
                                <textarea className="input-styled" rows={2} value={experience} onChange={(e) => setExperience(e.target.value)} />
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{experience || 'No experience set'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Hourly Rate</label>
                            {editing ? (
                                <input type="number" className="input-styled" min={100} max={5000} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                            ) : (
                                <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>₹{hourlyRate}/hr</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Verification Status</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                            <span className={`badge ${profile?.tutorData?.isVerified ? 'badge-success' : 'badge-warning'}`}>
                                {profile?.tutorData?.isVerified ? '✓ Verified' : '⏳ Pending'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Quiz Score</span>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {profile?.tutorData?.verificationQuizScore || 0}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Joined</span>
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subjects */}
            <div className="card p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Subjects</h3>
                {editing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {SUBJECTS.map((subject) => (
                            <button
                                key={subject}
                                onClick={() => toggleSubject(subject)}
                                className="p-3 rounded-xl text-sm font-medium transition-all"
                                style={{
                                    background: selectedSubjects.includes(subject) ? 'var(--primary-light)' : 'var(--bg)',
                                    border: `1.5px solid ${selectedSubjects.includes(subject) ? 'var(--primary)' : 'var(--border)'}`,
                                    color: selectedSubjects.includes(subject) ? 'var(--primary)' : 'var(--text-primary)',
                                }}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {selectedSubjects.length > 0 ? selectedSubjects.map((s) => (
                            <span key={s} className="badge badge-info">{s}</span>
                        )) : (
                            <p style={{ color: 'var(--text-muted)' }}>No subjects selected</p>
                        )}
                    </div>
                )}
            </div>

            {/* Availability */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Availability</h3>
                    {editing && (
                        <button className="btn-secondary text-sm" onClick={addSlot}>+ Add Slot</button>
                    )}
                </div>
                {availability.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No availability slots configured</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {availability.map((slot, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 p-3 rounded-xl"
                                style={{ background: 'var(--bg)' }}
                            >
                                {editing ? (
                                    <>
                                        <select
                                            className="input-styled"
                                            style={{ flex: '1' }}
                                            value={slot.day}
                                            onChange={(e) => updateSlot(i, 'day', e.target.value)}
                                        >
                                            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <input
                                            type="time"
                                            className="input-styled"
                                            style={{ width: '140px' }}
                                            value={slot.startTime}
                                            onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                                        />
                                        <span style={{ color: 'var(--text-muted)' }}>to</span>
                                        <input
                                            type="time"
                                            className="input-styled"
                                            style={{ width: '140px' }}
                                            value={slot.endTime}
                                            onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                                        />
                                        <button
                                            onClick={() => removeSlot(i)}
                                            className="text-sm px-3 py-2 rounded-lg"
                                            style={{ color: 'var(--error)', background: 'var(--error-light)' }}
                                        >
                                            ✕
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-medium" style={{ color: 'var(--text-primary)', flex: '1' }}>{slot.day}</span>
                                        <span style={{ color: 'var(--primary)' }}>{slot.startTime} – {slot.endTime}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
