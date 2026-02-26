'use client';

import { FileEdit } from 'lucide-react';

interface QuizCardProps {
    questionNumber: number;
    totalQuestions: number;
    questionText: string;
    options: string[];
    selectedAnswer: string | null;
    onSelectAnswer: (answer: string) => void;
    showResult?: boolean;
    correctAnswer?: string;
}

export default function QuizCard({
    questionNumber,
    totalQuestions,
    questionText,
    options,
    selectedAnswer,
    onSelectAnswer,
    showResult = false,
    correctAnswer,
}: QuizCardProps) {
    const getOptionStyle = (option: string) => {
        if (!showResult) {
            return selectedAnswer === option
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 scale-[1.01]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30 hover:scale-[1.005]';
        }

        if (option === correctAnswer) {
            return 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20';
        }
        if (option === selectedAnswer && option !== correctAnswer) {
            return 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-400/20';
        }
        return 'border-slate-100 bg-white text-slate-400';
    };

    const getLetterBg = (option: string) => {
        if (!showResult) {
            return selectedAnswer === option
                ? 'gradient-primary text-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600';
        }
        if (option === correctAnswer) return 'bg-emerald-500 text-white';
        if (option === selectedAnswer && option !== correctAnswer) return 'bg-red-400 text-white';
        return 'bg-slate-100 text-slate-400';
    };

    const getResultIcon = (option: string) => {
        if (!showResult) return null;
        if (option === correctAnswer) return '✓';
        if (option === selectedAnswer && option !== correctAnswer) return '✗';
        return null;
    };

    return (
        <div className="card p-6 animate-scale-in">
            {/* Question Header */}
            <div className="mb-5 flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-full gradient-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                    <FileEdit className="h-3.5 w-3.5" />
                    Question {questionNumber} of {totalQuestions}
                </span>
                {showResult && selectedAnswer === correctAnswer && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 animate-bounce-in">
                        ✓ Correct!
                    </span>
                )}
                {showResult && selectedAnswer !== correctAnswer && (
                    <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 animate-bounce-in">
                        ✗ Incorrect
                    </span>
                )}
            </div>

            {/* Question */}
            <h3 className="mb-6 text-lg font-bold text-slate-900 leading-relaxed">
                {questionText}
            </h3>

            {/* Options */}
            <div className="space-y-3">
                {options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => !showResult && onSelectAnswer(option)}
                        disabled={showResult}
                        className={`group flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-medium transition-all duration-200 ${getOptionStyle(option)}`}
                    >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 ${getLetterBg(option)}`}>
                            {getResultIcon(option) || String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {selectedAnswer === option && !showResult && (
                            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
