'use client';

import Link from 'next/link';

interface TutorCardProps {
    tutorId: string;
    name: string;
    subjects: string[];
    rating: number;
    price: number;
    isOnline?: boolean;
    onBook: (tutorId: string) => void;
}

export default function TutorCard({
    tutorId,
    name,
    subjects,
    rating,
    price,
    isOnline = false,
    onBook,
}: TutorCardProps) {
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <span
                key={i}
                className={`text-sm ${i < Math.round(rating) ? 'text-amber-400' : 'text-slate-200'
                    }`}
            >
                ★
            </span>
        ));
    };

    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between">
                {/* Avatar & Info */}
                <div className="flex items-start gap-4">
                    <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                            {name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                        </div>
                        {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">{name}</h3>
                        <div className="mt-0.5 flex items-center gap-1">
                            {renderStars(rating)}
                            <span className="ml-1 text-xs text-slate-500">
                                ({rating.toFixed(1)})
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {subjects.slice(0, 3).map((subject) => (
                                <span
                                    key={subject}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                >
                                    {subject}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Price */}
                <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">₹{price}</p>
                    <p className="text-xs text-slate-500">per session</p>
                </div>
            </div>

            {/* Book Button */}
            <button
                onClick={() => onBook(tutorId)}
                className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 group-hover:bg-blue-700"
            >
                Book Session
            </button>
        </div>
    );
}
