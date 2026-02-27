'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { useTutor } from '@/hooks/useTutor';
import { SUBJECT_CATEGORIES } from '@/config/subjects';
import { fetchQuizQuestions, QuizApiQuestion } from '@/config/mockQuizApi';

type Step = 'info' | 'subjects' | 'quiz' | 'result';

export default function TutorRegisterPage() {
    const router = useRouter();
    const { refreshUserData } = useAuth();
    const { registerTutor } = useTutor();
    const [step, setStep] = useState<Step>('info');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState('');
    const [hourlyRate, setHourlyRate] = useState(500);
    const [qualification, setQualification] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
    const [quizScore, setQuizScore] = useState(0);
    const [passed, setPassed] = useState(false);

    // AI-generated quiz state
    const [quizQuestions, setQuizQuestions] = useState<QuizApiQuestion[]>([]);
    const [quizLoading, setQuizLoading] = useState(false);

    const toggleSubject = (subject: string) => {
        setSelectedSubjects((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
        );
    };

    const generateQuiz = async () => {
        setQuizLoading(true);
        setError('');
        try {
            // Generate questions based on the first selected subject (or "Teaching" as a general topic)
            const topic = selectedSubjects[0] || 'Teaching';
            const questions = await fetchQuizQuestions(topic, 5);
            setQuizQuestions(questions);
            setQuizAnswers({});
        } catch {
            setError('Failed to generate quiz. Using fallback questions.');
            // Fallback to general teaching questions
            setQuizQuestions([
                { questionText: 'What is the primary goal of formative assessment?', options: ['Assign grades', 'Monitor student learning', 'Rank students', 'Replace teaching'], correctAnswer: 'Monitor student learning' },
                { questionText: 'Which learning theory emphasizes learning through social interaction?', options: ['Behaviorism', 'Cognitivism', 'Social Constructivism', 'Connectivism'], correctAnswer: 'Social Constructivism' },
                { questionText: 'What does differentiated instruction mean?', options: ['Teaching the same content to all students', 'Tailoring instruction to meet individual needs', 'Using only digital tools', 'Focusing only on advanced students'], correctAnswer: 'Tailoring instruction to meet individual needs' },
                { questionText: "Bloom's Taxonomy places which skill at the highest level?", options: ['Understanding', 'Applying', 'Analyzing', 'Creating'], correctAnswer: 'Creating' },
                { questionText: 'What is the Zone of Proximal Development (ZPD)?', options: ['Content a student has already mastered', 'Content too difficult for a student', 'The gap between what a learner can do alone and with help', 'The physical classroom environment'], correctAnswer: 'The gap between what a learner can do alone and with help' },
            ]);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleStartQuiz = async () => {
        await generateQuiz();
        setStep('quiz');
    };

    const handleQuizSubmit = async () => {
        let correct = 0;
        quizQuestions.forEach((q, i) => {
            if (quizAnswers[i] === q.correctAnswer) correct++;
        });
        const score = Math.round((correct / quizQuestions.length) * 100);
        setQuizScore(score);
        setPassed(score >= 70);
        setStep('result');

        try {
            setSubmitting(true);
            await registerTutor({
                subjects: selectedSubjects,
                bio,
                experience,
                hourlyRate,
                verificationQuizScore: score,
                qualification,
            });
            // Refresh AuthContext so it picks up the new tutor role
            await refreshUserData();
        } catch {
            setError('Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const steps = ['info', 'subjects', 'quiz', 'result'];

    return (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
                {steps.map((s, i) => (
                    <React.Fragment key={s}>
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all"
                            style={{
                                background: step === s || steps.indexOf(step) > i
                                    ? 'var(--primary)'
                                    : 'var(--bg-alt)',
                                color: step === s || steps.indexOf(step) > i
                                    ? 'white'
                                    : 'var(--text-muted)',
                            }}
                        >
                            {i + 1}
                        </div>
                        {i < 3 && (
                            <div
                                className="h-0.5 flex-1"
                                style={{
                                    background: steps.indexOf(step) > i
                                        ? 'var(--primary)'
                                        : 'var(--border)',
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Basic Info */}
            {step === 'info' && (
                <div className="card p-8">
                    <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                        📝 Basic Information
                    </h2>

                    <div className="flex flex-col gap-5">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                            <textarea
                                className="input-styled"
                                rows={3}
                                placeholder="Tell students about yourself..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Teaching Experience</label>
                            <textarea
                                className="input-styled"
                                rows={2}
                                placeholder="Describe your teaching experience..."
                                value={experience}
                                onChange={(e) => setExperience(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Qualification
                            </label>
                            <input
                                type="text"
                                className="input-styled"
                                placeholder="e.g. B.Tech CSE, M.Sc Physics, PhD Mathematics"
                                value={qualification}
                                onChange={(e) => setQualification(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Hourly Rate (₹)
                            </label>
                            <input
                                type="number"
                                className="input-styled"
                                min={100}
                                max={5000}
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(Number(e.target.value))}
                            />
                        </div>

                        <button
                            className="btn-primary mt-2"
                            disabled={!bio || !experience}
                            onClick={() => setStep('subjects')}
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Subject Selection */}
            {step === 'subjects' && (
                <div className="card p-8">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        📚 Select Your Subjects
                    </h2>
                    <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Choose at least one subject you can teach</p>

                    <div className="space-y-5 mb-6 max-h-[50vh] overflow-y-auto pr-1">
                        {SUBJECT_CATEGORIES.map((category) => (
                            <div key={category.label}>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {category.icon} {category.label}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {category.tags.map((tag) => (
                                        <button
                                            key={tag.name}
                                            onClick={() => toggleSubject(tag.name)}
                                            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                                            style={{
                                                background: selectedSubjects.includes(tag.name) ? 'var(--primary-light)' : 'var(--bg)',
                                                border: `1.5px solid ${selectedSubjects.includes(tag.name) ? 'var(--primary)' : 'var(--border)'}`,
                                                color: selectedSubjects.includes(tag.name) ? 'var(--primary)' : 'var(--text-primary)',
                                            }}
                                        >
                                            {selectedSubjects.includes(tag.name) && '✓ '}{tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedSubjects.length > 0 && (
                        <p className="text-sm font-medium text-indigo-600 mb-4">
                            {selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''} selected
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button className="btn-secondary flex-1" onClick={() => setStep('info')}>
                            ← Back
                        </button>
                        <button
                            className="btn-primary flex-1"
                            disabled={selectedSubjects.length === 0 || quizLoading}
                            onClick={handleStartQuiz}
                        >
                            {quizLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generating Quiz...
                                </span>
                            ) : (
                                'Take Quiz →'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Verification Quiz (AI-Generated) */}
            {step === 'quiz' && (
                <div className="card p-8">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        🧠 Verification Quiz
                    </h2>
                    <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Score at least 70% to get verified. Answer all questions below.
                    </p>
                    <p className="mb-6 text-xs px-3 py-1.5 rounded-lg inline-block" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        ✨ Questions generated by AI based on your selected subjects
                    </p>

                    {quizLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-3 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
                            <p style={{ color: 'var(--text-secondary)' }}>Generating personalized questions...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {quizQuestions.map((q, qIndex) => (
                                <div key={qIndex} className="p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                                    <p className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                                        {qIndex + 1}. {q.questionText}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {q.options.map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIndex]: option }))}
                                                className="text-left p-3 rounded-lg text-sm transition-all"
                                                style={{
                                                    background: quizAnswers[qIndex] === option ? 'var(--primary-light)' : 'var(--surface)',
                                                    border: `1.5px solid ${quizAnswers[qIndex] === option ? 'var(--primary)' : 'var(--border)'}`,
                                                    color: quizAnswers[qIndex] === option ? 'var(--primary)' : 'var(--text-primary)',
                                                    fontWeight: quizAnswers[qIndex] === option ? 600 : 400,
                                                }}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button className="btn-secondary flex-1" onClick={() => setStep('subjects')}>
                            ← Back
                        </button>
                        <button
                            className="btn-primary flex-1"
                            disabled={Object.keys(quizAnswers).length < quizQuestions.length || submitting || quizLoading}
                            onClick={handleQuizSubmit}
                        >
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && (
                <div className="card p-8 text-center">
                    <div className="text-6xl mb-4">{passed ? '🎉' : '😕'}</div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {passed ? 'Congratulations! You\'re Verified!' : 'Quiz Not Passed'}
                    </h2>
                    <p className="text-4xl font-bold my-4" style={{ color: passed ? 'var(--success)' : 'var(--error)' }}>
                        {quizScore}%
                    </p>
                    <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                        {passed
                            ? 'You can now accept tutoring sessions and start teaching!'
                            : 'You need at least 70% to pass. Your profile was saved but is not verified yet.'}
                    </p>
                    {error && <p className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
                    {passed ? (
                        <button className="btn-primary" onClick={() => router.push('/tutor')}>
                            Go to Dashboard →
                        </button>
                    ) : (
                        <button
                            className="btn-secondary"
                            onClick={async () => {
                                setQuizAnswers({});
                                await generateQuiz();
                                setStep('quiz');
                            }}
                        >
                            Retry Quiz (New Questions)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
