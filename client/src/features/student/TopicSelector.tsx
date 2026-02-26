'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Crosshair, TrendingUp } from 'lucide-react';
import { SUBJECT_CATEGORIES, ALL_TOPIC_TAGS, POPULAR_SUBJECTS } from '@/config/subjects';

export default function TopicSelector() {
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const router = useRouter();

    const filteredTopics = search.trim()
        ? ALL_TOPIC_TAGS.filter((t) =>
            t.name.toLowerCase().includes(search.toLowerCase())
        )
        : activeCategory
            ? SUBJECT_CATEGORIES.find(c => c.label === activeCategory)?.tags || []
            : [];

    const handleSelect = (topic: string) => {
        setSearch(topic);
        setShowDropdown(false);
        router.push(`/assessment?topic=${encodeURIComponent(topic)}`);
    };

    return (
        <div className="relative">
            <div className="card p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                        <Crosshair className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Start Learning
                        </h2>
                        <p className="text-sm text-slate-400">
                            Pick a topic for your pre-assessment
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setShowDropdown(true);
                            setActiveCategory(null);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="input-styled pl-12"
                        placeholder="Search topics... e.g., JEE Maths, NEET Biology, Python"
                    />

                    {showDropdown && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDropdown(false)}
                            />
                            <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl bg-white py-2 shadow-xl border border-slate-100 animate-slide-down">
                                {/* Category tabs */}
                                {!search.trim() && (
                                    <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-b border-slate-100 mb-1">
                                        {SUBJECT_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.label}
                                                onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${activeCategory === cat.label
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {cat.icon} {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredTopics.length > 0 ? (
                                    filteredTopics.map((topic) => (
                                        <button
                                            key={topic.name}
                                            onClick={() => handleSelect(topic.name)}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-all hover:bg-indigo-50 hover:text-indigo-700 group"
                                        >
                                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${topic.color} transition-transform group-hover:scale-110`}>
                                                <span className="text-white text-xs font-bold">{topic.name.charAt(0)}</span>
                                            </span>
                                            <span className="font-medium">{topic.name}</span>
                                        </button>
                                    ))
                                ) : search.trim() ? (
                                    <p className="px-4 py-3 text-sm text-slate-400">
                                        No topics found for &quot;{search}&quot;
                                    </p>
                                ) : (
                                    <p className="px-4 py-3 text-sm text-slate-400">
                                        Select a category above or type to search
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Popular Topics */}
                <div className="mt-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        <TrendingUp className="h-3 w-3" />
                        Popular
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_SUBJECTS.map((name) => (
                            <button
                                key={name}
                                onClick={() => handleSelect(name)}
                                className="rounded-full px-3.5 py-1.5 text-sm font-medium bg-slate-50 text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-sm"
                            >
                                {name.replace(' – ', ': ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
