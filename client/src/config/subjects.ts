// Shared subject/topic configuration used by both student and tutor modules.
// Organized by category: Class Level, Exam Focus, Languages, and Coding.

export interface SubjectTag {
    name: string;
    color: string; // Tailwind gradient for pills
}

export interface SubjectCategory {
    label: string;
    icon: string;
    tags: SubjectTag[];
}

const c = (from: string, to: string) => `from-${from} to-${to}`;

export const SUBJECT_CATEGORIES: SubjectCategory[] = [
    {
        label: 'Class 6–8 (Foundation)',
        icon: '📗',
        tags: [
            { name: 'Basic Mathematics', color: c('blue-500', 'indigo-500') },
            { name: 'General Science', color: c('emerald-500', 'teal-500') },
            { name: 'Social Studies', color: c('amber-500', 'yellow-500') },
            { name: 'English Grammar', color: c('indigo-500', 'blue-500') },
            { name: 'Hindi', color: c('orange-500', 'red-500') },
            { name: 'Sanskrit', color: c('yellow-600', 'amber-600') },
            { name: 'Mental Ability', color: c('violet-500', 'purple-500') },
        ],
    },
    {
        label: 'Class 9–10 (Board Prep)',
        icon: '📘',
        tags: [
            { name: 'Algebra', color: c('blue-500', 'indigo-500') },
            { name: 'Geometry', color: c('violet-500', 'purple-500') },
            { name: 'Trigonometry', color: c('pink-500', 'rose-500') },
            { name: 'Statistics', color: c('cyan-500', 'blue-500') },
            { name: 'Physics – Mechanics', color: c('emerald-500', 'teal-500') },
            { name: 'Physics – Light & Sound', color: c('sky-500', 'cyan-500') },
            { name: 'Chemistry – Acids & Bases', color: c('green-500', 'emerald-500') },
            { name: 'Chemistry – Metals & Non-Metals', color: c('slate-500', 'gray-500') },
            { name: 'Biology – Life Processes', color: c('green-500', 'lime-500') },
            { name: 'Biology – Heredity', color: c('rose-500', 'pink-500') },
            { name: 'English Literature', color: c('purple-500', 'violet-500') },
            { name: 'Social Science – History', color: c('amber-500', 'orange-500') },
            { name: 'Social Science – Geography', color: c('teal-500', 'emerald-500') },
            { name: 'Social Science – Civics', color: c('indigo-500', 'violet-500') },
            { name: 'Social Science – Economics', color: c('yellow-500', 'amber-500') },
        ],
    },
    {
        label: 'Class 11–12 (Senior Secondary)',
        icon: '📙',
        tags: [
            { name: 'Calculus', color: c('amber-500', 'orange-500') },
            { name: 'Linear Algebra', color: c('blue-600', 'indigo-600') },
            { name: 'Probability & Statistics', color: c('cyan-500', 'blue-500') },
            { name: 'Physics – Thermodynamics', color: c('red-500', 'orange-500') },
            { name: 'Physics – Electromagnetism', color: c('yellow-500', 'amber-500') },
            { name: 'Physics – Optics', color: c('sky-500', 'cyan-500') },
            { name: 'Physics – Modern Physics', color: c('violet-500', 'indigo-500') },
            { name: 'Chemistry – Organic', color: c('green-500', 'emerald-500') },
            { name: 'Chemistry – Inorganic', color: c('slate-500', 'gray-500') },
            { name: 'Chemistry – Physical', color: c('teal-500', 'cyan-500') },
            { name: 'Biology – Botany', color: c('green-500', 'lime-500') },
            { name: 'Biology – Zoology', color: c('rose-500', 'pink-500') },
            { name: 'Biology – Genetics & Evolution', color: c('fuchsia-500', 'pink-500') },
            { name: 'Accountancy', color: c('emerald-500', 'green-500') },
            { name: 'Business Studies', color: c('blue-500', 'sky-500') },
            { name: 'Economics', color: c('yellow-500', 'amber-500') },
            { name: 'Political Science', color: c('indigo-500', 'violet-500') },
            { name: 'Psychology', color: c('pink-500', 'purple-500') },
        ],
    },
    {
        label: 'Exam Focus',
        icon: '🎯',
        tags: [
            { name: 'JEE Mains – Maths', color: c('blue-600', 'indigo-600') },
            { name: 'JEE Mains – Physics', color: c('emerald-600', 'teal-600') },
            { name: 'JEE Mains – Chemistry', color: c('green-600', 'emerald-600') },
            { name: 'JEE Advanced', color: c('red-600', 'rose-600') },
            { name: 'NEET – Physics', color: c('sky-600', 'blue-600') },
            { name: 'NEET – Chemistry', color: c('teal-600', 'green-600') },
            { name: 'NEET – Biology', color: c('lime-600', 'green-600') },
            { name: 'CUET Preparation', color: c('violet-600', 'purple-600') },
            { name: 'CBSE Board Prep', color: c('indigo-500', 'blue-500') },
            { name: 'ICSE Board Prep', color: c('amber-500', 'yellow-500') },
            { name: 'State Board Prep', color: c('orange-500', 'red-500') },
            { name: 'NTSE / Olympiad', color: c('fuchsia-600', 'pink-600') },
            { name: 'SAT / ACT', color: c('slate-600', 'gray-600') },
            { name: 'IELTS / TOEFL', color: c('cyan-600', 'blue-600') },
            { name: 'GRE / GMAT', color: c('purple-600', 'violet-600') },
            { name: 'GATE', color: c('rose-600', 'red-600') },
            { name: 'UPSC Foundations', color: c('amber-600', 'orange-600') },
        ],
    },
    {
        label: 'Languages',
        icon: '🌐',
        tags: [
            { name: 'English – Speaking', color: c('indigo-500', 'blue-500') },
            { name: 'English – Writing', color: c('blue-500', 'sky-500') },
            { name: 'Hindi', color: c('orange-500', 'red-500') },
            { name: 'Sanskrit', color: c('yellow-600', 'amber-600') },
            { name: 'French', color: c('blue-400', 'indigo-400') },
            { name: 'German', color: c('slate-500', 'gray-500') },
            { name: 'Spanish', color: c('red-500', 'orange-500') },
            { name: 'Japanese', color: c('pink-500', 'rose-500') },
            { name: 'Korean', color: c('violet-500', 'purple-500') },
        ],
    },
    {
        label: 'Coding & Tech',
        icon: '💻',
        tags: [
            { name: 'Computer Science', color: c('blue-600', 'indigo-600') },
            { name: 'Python Programming', color: c('yellow-500', 'green-500') },
            { name: 'Java Programming', color: c('red-500', 'orange-500') },
            { name: 'C/C++ Programming', color: c('blue-500', 'cyan-500') },
            { name: 'JavaScript / Web Dev', color: c('yellow-400', 'amber-500') },
            { name: 'Data Structures', color: c('orange-500', 'red-500') },
            { name: 'Algorithms', color: c('fuchsia-500', 'purple-500') },
            { name: 'Machine Learning', color: c('emerald-500', 'teal-500') },
            { name: 'DBMS / SQL', color: c('sky-500', 'blue-500') },
            { name: 'Competitive Programming', color: c('rose-500', 'red-500') },
        ],
    },
    {
        label: 'Creative & Other',
        icon: '🎨',
        tags: [
            { name: 'Art & Drawing', color: c('pink-500', 'rose-500') },
            { name: 'Music – Vocal', color: c('violet-500', 'purple-500') },
            { name: 'Music – Instrument', color: c('indigo-500', 'violet-500') },
            { name: 'Graphic Design', color: c('cyan-500', 'blue-500') },
            { name: 'Video Editing', color: c('red-500', 'pink-500') },
            { name: 'Public Speaking', color: c('amber-500', 'orange-500') },
        ],
    },
];

// Flat list of all subject names (for quick lookups)
export const ALL_SUBJECTS: string[] = SUBJECT_CATEGORIES.flatMap(cat => cat.tags.map(t => t.name));

// Flat list of all tags with colors (for TopicSelector dropdown)
export const ALL_TOPIC_TAGS: SubjectTag[] = SUBJECT_CATEGORIES.flatMap(cat => cat.tags);

// Popular subjects for quick selection
export const POPULAR_SUBJECTS = [
    'Algebra', 'Physics – Mechanics', 'Chemistry – Organic',
    'Data Structures', 'JEE Mains – Maths', 'NEET – Biology',
    'Python Programming', 'English – Speaking',
];

// Subject names grouped by category label (for tutor registration)
export const SUBJECTS_BY_CATEGORY: Record<string, string[]> = Object.fromEntries(
    SUBJECT_CATEGORIES.map(cat => [cat.label, cat.tags.map(t => t.name)])
);

// ─── Match Groups ────────────────────────────────────────────
// Tags in the same group will match each other during tutor search.
// A tag can belong to multiple groups.

const MATCH_GROUPS: Record<string, string[]> = {
    maths: [
        'Mathematics', 'Maths', 'Math',
        'Basic Mathematics', 'Algebra', 'Geometry', 'Trigonometry', 'Calculus',
        'Linear Algebra', 'Statistics', 'Probability & Statistics', 'Mental Ability',
        'JEE Mains – Maths', 'NTSE / Olympiad',
    ],
    physics: [
        'Physics',
        'General Science',
        'Physics – Mechanics', 'Physics – Light & Sound',
        'Physics – Thermodynamics', 'Physics – Electromagnetism',
        'Physics – Optics', 'Physics – Modern Physics',
        'JEE Mains – Physics', 'JEE Advanced', 'NEET – Physics',
    ],
    chemistry: [
        'Chemistry',
        'General Science',
        'Chemistry – Acids & Bases', 'Chemistry – Metals & Non-Metals',
        'Chemistry – Organic', 'Chemistry – Inorganic', 'Chemistry – Physical',
        'JEE Mains – Chemistry', 'JEE Advanced', 'NEET – Chemistry',
    ],
    biology: [
        'Biology',
        'General Science',
        'Biology – Life Processes', 'Biology – Heredity',
        'Biology – Botany', 'Biology – Zoology', 'Biology – Genetics & Evolution',
        'NEET – Biology',
    ],
    english: [
        'English',
        'English Grammar', 'English Literature',
        'English – Speaking', 'English – Writing',
        'IELTS / TOEFL', 'SAT / ACT',
    ],
    socialscience: [
        'Social Studies', 'History', 'Geography', 'Civics', 'Political Science',
        'Social Science – History', 'Social Science – Geography',
        'Social Science – Civics', 'Social Science – Economics',
    ],
    coding: [
        'Computer Science', 'Python Programming', 'Java Programming',
        'C/C++ Programming', 'JavaScript / Web Dev',
        'Data Structures', 'Algorithms', 'Machine Learning',
        'DBMS / SQL', 'Competitive Programming', 'GATE',
    ],
    commerce: [
        'Accountancy', 'Business Studies', 'Economics',
    ],
    jee: [
        'JEE Mains – Maths', 'JEE Mains – Physics', 'JEE Mains – Chemistry', 'JEE Advanced',
    ],
    neet: [
        'NEET – Physics', 'NEET – Chemistry', 'NEET – Biology',
    ],
    boardprep: [
        'CBSE Board Prep', 'ICSE Board Prep', 'State Board Prep', 'CUET Preparation',
    ],
    music: [
        'Music – Vocal', 'Music – Instrument',
    ],
    hindi: ['Hindi'],
    sanskrit: ['Sanskrit'],
    french: ['French'],
    german: ['German'],
    spanish: ['Spanish'],
    japanese: ['Japanese'],
    korean: ['Korean'],
};

// Build a reverse lookup: tag name → set of group keys
const _tagToGroups: Record<string, Set<string>> = {};
for (const [group, tags] of Object.entries(MATCH_GROUPS)) {
    for (const tag of tags) {
        const key = tag.toLowerCase();
        if (!_tagToGroups[key]) _tagToGroups[key] = new Set();
        _tagToGroups[key].add(group);
    }
}

/** Get all match groups a tag belongs to */
export function getMatchGroups(tagName: string): Set<string> {
    return _tagToGroups[tagName.toLowerCase()] || new Set();
}

/** Check if two tags should match each other */
export function doTagsMatch(tagA: string, tagB: string): boolean {
    if (tagA.toLowerCase() === tagB.toLowerCase()) return true;
    const groupsA = getMatchGroups(tagA);
    const groupsB = getMatchGroups(tagB);
    for (const g of groupsA) {
        if (groupsB.has(g)) return true;
    }
    return false;
}
