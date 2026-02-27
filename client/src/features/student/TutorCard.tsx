'use client';

interface AvailabilitySlot {
    day: string;
    startTime: string;
    endTime: string;
}

interface TutorCardProps {
    tutorId: string;
    name: string;
    subjects: string[];
    rating: number;
    price: number;
    isOnline?: boolean;
    isBooking?: boolean;
    isMatched?: boolean;
    matchedSubjects?: string[];
    availability?: AvailabilitySlot[];
    qualification?: string;
    onBook: (tutorId: string) => void;
    onRequest?: (tutorId: string) => void;
}

export default function TutorCard({
    tutorId,
    name,
    subjects,
    rating,
    price,
    isOnline = false,
    isBooking = false,
    isMatched = false,
    matchedSubjects = [],
    availability = [],
    qualification,
    onBook,
    onRequest,
}: TutorCardProps) {
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <span
                key={i}
                className={`text-sm ${i < Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`}
            >
                ★
            </span>
        ));
    };

    // Show at most 3 availability slots
    const displaySlots = availability.slice(0, 3);

    return (
        <div className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${isMatched ? 'border-emerald-200 hover:border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 hover:border-blue-200'}`}>
            {/* Matched badge */}
            {isMatched && (
                <div className="flex items-center gap-1.5 mb-3 -mt-1">
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-100">
                        <span className="text-[10px]">✓</span> Matches your topic
                    </span>
                    {matchedSubjects.length > 0 && (
                        <span className="text-xs text-slate-400">
                            via {matchedSubjects.slice(0, 2).join(', ')}
                        </span>
                    )}
                </div>
            )}

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
                        {qualification && (
                            <p className="text-xs text-slate-500 mt-0.5">{qualification}</p>
                        )}
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
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${matchedSubjects.includes(subject)
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}
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
                    <p className="text-xs text-slate-500">per hour</p>
                </div>
            </div>

            {/* Availability Slots */}
            {displaySlots.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {displaySlots.map((slot, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100"
                        >
                            <span className="text-[10px]">🕐</span>
                            {slot.day.slice(0, 3)} {slot.startTime}–{slot.endTime}
                        </span>
                    ))}
                    {availability.length > 3 && (
                        <span className="text-[11px] text-slate-400 self-center">
                            +{availability.length - 3} more
                        </span>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => onBook(tutorId)}
                    disabled={isBooking}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 ${isMatched
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isBooking ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Booking...
                        </>
                    ) : (
                        '⚡ Book Now'
                    )}
                </button>
                {onRequest && (
                    <button
                        onClick={() => onRequest(tutorId)}
                        className="flex-1 rounded-xl py-2.5 text-sm font-semibold border-2 border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                    >
                        📅 Request Slot
                    </button>
                )}
            </div>
        </div>
    );
}
