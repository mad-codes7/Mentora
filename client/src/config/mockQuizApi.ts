// Quiz API Service — powered by Google Gemini AI
// Generates topic-specific quiz questions using Gemini
// Falls back to curated topic-specific questions if API fails

export interface QuizApiQuestion {
    questionText: string;
    options: string[];
    correctAnswer: string;
}

// ─── Curated Question Banks (fallback) ──────────────────────────

const QUESTION_BANK: Record<string, QuizApiQuestion[]> = {
    Algebra: [
        { questionText: 'What is the solution of 2x + 5 = 15?', options: ['x = 3', 'x = 5', 'x = 10', 'x = 7'], correctAnswer: 'x = 5' },
        { questionText: 'Simplify: 3(x + 4) - 2x', options: ['x + 12', '5x + 4', 'x + 4', '3x + 12'], correctAnswer: 'x + 12' },
        { questionText: 'What is the value of x in x² = 49?', options: ['x = ±7', 'x = 7', 'x = 49', 'x = ±49'], correctAnswer: 'x = ±7' },
        { questionText: 'Factor: x² - 9', options: ['(x-3)(x+3)', '(x-9)(x+1)', '(x-3)²', '(x+3)²'], correctAnswer: '(x-3)(x+3)' },
        { questionText: 'If f(x) = 2x + 3, what is f(4)?', options: ['8', '11', '14', '7'], correctAnswer: '11' },
    ],
    Geometry: [
        { questionText: 'What is the area of a circle with radius 7?', options: ['49π', '14π', '7π', '21π'], correctAnswer: '49π' },
        { questionText: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctAnswer: '6' },
        { questionText: 'The sum of angles in a triangle is:', options: ['90°', '180°', '270°', '360°'], correctAnswer: '180°' },
        { questionText: 'What is the Pythagorean theorem?', options: ['a² + b² = c²', 'a + b = c', 'a² - b² = c²', '2a + 2b = c'], correctAnswer: 'a² + b² = c²' },
        { questionText: 'Area of a rectangle with l=8, w=5?', options: ['40', '26', '13', '80'], correctAnswer: '40' },
    ],
    Trigonometry: [
        { questionText: 'sin(90°) = ?', options: ['0', '1', '-1', '0.5'], correctAnswer: '1' },
        { questionText: 'cos(0°) = ?', options: ['0', '1', '-1', '0.5'], correctAnswer: '1' },
        { questionText: 'tan(45°) = ?', options: ['0', '1', '√2', '1/√2'], correctAnswer: '1' },
        { questionText: 'What is sin²θ + cos²θ?', options: ['0', '1', '2', 'tanθ'], correctAnswer: '1' },
        { questionText: 'Period of sin(x) is:', options: ['π', '2π', 'π/2', '4π'], correctAnswer: '2π' },
    ],
    Calculus: [
        { questionText: 'Derivative of x³ is:', options: ['3x²', 'x²', '3x', 'x³'], correctAnswer: '3x²' },
        { questionText: '∫2x dx = ?', options: ['x²+C', '2x²+C', 'x+C', '2+C'], correctAnswer: 'x²+C' },
        { questionText: 'Derivative of sin(x) is:', options: ['cos(x)', '-sin(x)', 'tan(x)', '-cos(x)'], correctAnswer: 'cos(x)' },
        { questionText: 'lim(x→0) sin(x)/x = ?', options: ['0', '1', '∞', '-1'], correctAnswer: '1' },
        { questionText: 'Derivative of eˣ is:', options: ['xeˣ⁻¹', 'eˣ', 'xe', '1/eˣ'], correctAnswer: 'eˣ' },
    ],
    Physics: [
        { questionText: 'F = ma is Newton\'s __ law', options: ['First', 'Second', 'Third', 'Fourth'], correctAnswer: 'Second' },
        { questionText: 'Unit of force is:', options: ['Joule', 'Newton', 'Watt', 'Pascal'], correctAnswer: 'Newton' },
        { questionText: 'Acceleration due to gravity is:', options: ['9.8 m/s²', '10 m/s', '9.8 m/s', '10 m/s²'], correctAnswer: '9.8 m/s²' },
        { questionText: 'Momentum = ?', options: ['m × v', 'm × a', 'F × t', 'F × d'], correctAnswer: 'm × v' },
        { questionText: 'Work done = ?', options: ['F × d', 'F × t', 'm × v', 'm × a'], correctAnswer: 'F × d' },
    ],
    Chemistry: [
        { questionText: 'What is the chemical formula for water?', options: ['H₂O', 'CO₂', 'NaCl', 'O₂'], correctAnswer: 'H₂O' },
        { questionText: 'pH of a neutral solution is:', options: ['0', '7', '14', '1'], correctAnswer: '7' },
        { questionText: 'Number of elements in the periodic table:', options: ['108', '118', '92', '100'], correctAnswer: '118' },
        { questionText: 'Avogadro\'s number is approximately:', options: ['6.022 × 10²³', '3.14 × 10⁸', '1.6 × 10⁻¹⁹', '9.8 × 10¹'], correctAnswer: '6.022 × 10²³' },
        { questionText: 'Which gas is most abundant in Earth\'s atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'], correctAnswer: 'Nitrogen' },
    ],
    Biology: [
        { questionText: 'Powerhouse of the cell is:', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body'], correctAnswer: 'Mitochondria' },
        { questionText: 'DNA stands for:', options: ['Deoxyribonucleic Acid', 'Deoxyribose Nucleic Acid', 'Di-Nucleic Acid', 'None'], correctAnswer: 'Deoxyribonucleic Acid' },
        { questionText: 'Photosynthesis occurs in:', options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'], correctAnswer: 'Chloroplast' },
        { questionText: 'Number of chromosomes in human cells:', options: ['23', '46', '44', '48'], correctAnswer: '46' },
        { questionText: 'Which blood group is universal donor?', options: ['A', 'B', 'AB', 'O'], correctAnswer: 'O' },
    ],
    'Data Structures': [
        { questionText: 'Which data structure uses FIFO?', options: ['Stack', 'Queue', 'Array', 'Tree'], correctAnswer: 'Queue' },
        { questionText: 'Time complexity of binary search is:', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctAnswer: 'O(log n)' },
        { questionText: 'A stack follows which principle?', options: ['FIFO', 'LIFO', 'Random', 'Priority'], correctAnswer: 'LIFO' },
        { questionText: 'Worst case of quicksort is:', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correctAnswer: 'O(n²)' },
        { questionText: 'Which is not a linear data structure?', options: ['Array', 'Linked List', 'Tree', 'Queue'], correctAnswer: 'Tree' },
    ],
    'Computer Science': [
        { questionText: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], correctAnswer: 'Central Processing Unit' },
        { questionText: 'Binary of decimal 10 is:', options: ['1010', '1100', '1001', '1110'], correctAnswer: '1010' },
        { questionText: 'Which is an OOP language?', options: ['C', 'Assembly', 'Java', 'Fortran'], correctAnswer: 'Java' },
        { questionText: 'HTTP stands for:', options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'Hyper Transfer Text Protocol', 'None'], correctAnswer: 'HyperText Transfer Protocol' },
        { questionText: 'Which is not an operating system?', options: ['Windows', 'Linux', 'Oracle', 'macOS'], correctAnswer: 'Oracle' },
    ],
    English: [
        { questionText: 'What is a synonym for "happy"?', options: ['Sad', 'Joyful', 'Angry', 'Bored'], correctAnswer: 'Joyful' },
        { questionText: 'Identify the noun: "The cat sat on the mat"', options: ['sat', 'on', 'the', 'cat'], correctAnswer: 'cat' },
        { questionText: 'Past tense of "run" is:', options: ['Runned', 'Ran', 'Running', 'Runs'], correctAnswer: 'Ran' },
        { questionText: 'An antonym of "ancient" is:', options: ['Old', 'Modern', 'Historic', 'Classic'], correctAnswer: 'Modern' },
        { questionText: '"She sings beautifully" — "beautifully" is a(n):', options: ['Adjective', 'Noun', 'Adverb', 'Verb'], correctAnswer: 'Adverb' },
    ],
    Statistics: [
        { questionText: 'Mean of 2, 4, 6, 8 is:', options: ['4', '5', '6', '20'], correctAnswer: '5' },
        { questionText: 'Median of 1, 3, 5, 7, 9 is:', options: ['3', '5', '7', '9'], correctAnswer: '5' },
        { questionText: 'Mode of 1, 2, 2, 3, 4 is:', options: ['1', '2', '3', '4'], correctAnswer: '2' },
        { questionText: 'Standard deviation measures:', options: ['Central tendency', 'Spread of data', 'Data size', 'Correlation'], correctAnswer: 'Spread of data' },
        { questionText: 'Probability of a certain event is:', options: ['0', '0.5', '1', '∞'], correctAnswer: '1' },
    ],
};

// ─── Groq AI Generation (Primary) ───────────────────────────────

async function generateWithGroq(topic: string, count: number): Promise<QuizApiQuestion[]> {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key not configured');

    const prompt = `Generate exactly ${count} multiple-choice quiz questions on the topic "${topic}" for a student assessment.

Return ONLY a valid JSON array. No markdown, no code fences, no explanation.

Each object must have this structure:
{"questionText": "the question", "options": ["A", "B", "C", "D"], "correctAnswer": "must match one option exactly"}

Rules:
- 4 options per question, correctAnswer must exactly match one
- High school to undergraduate level, mix of difficulties
- Clear, unambiguous questions

Return ONLY the JSON array.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from Groq');

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const questions: QuizApiQuestion[] = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid format');
    }

    return questions.slice(0, count).map((q) => ({
        questionText: q.questionText,
        options: q.options.slice(0, 4),
        correctAnswer: q.options.includes(q.correctAnswer) ? q.correctAnswer : q.options[0],
    }));
}

// ─── Gemini AI Generation (Secondary) ───────────────────────────

async function generateWithGemini(topic: string, count: number): Promise<QuizApiQuestion[]> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const prompt = `Generate exactly ${count} multiple-choice quiz questions on "${topic}". Return ONLY a JSON array: [{"questionText":"...","options":["A","B","C","D"],"correctAnswer":"must match one option"}]. No markdown.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
        }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response');

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const questions: QuizApiQuestion[] = JSON.parse(cleaned);

    return questions.slice(0, count).map((q) => ({
        questionText: q.questionText,
        options: q.options.slice(0, 4),
        correctAnswer: q.options.includes(q.correctAnswer) ? q.correctAnswer : q.options[0],
    }));
}

// ─── Main Export ─────────────────────────────────────────────────

export async function fetchQuizQuestions(topic: string, count: number = 5): Promise<QuizApiQuestion[]> {
    // 1. Try Groq (fastest, most reliable free tier)
    try {
        console.log(`🤖 Generating "${topic}" questions via Groq...`);
        const questions = await generateWithGroq(topic, count);
        console.log(`✅ Groq generated ${questions.length} questions`);
        return questions;
    } catch (error) {
        console.warn('⚠️ Groq failed:', error);
    }

    // 2. Try Gemini
    try {
        console.log(`🤖 Trying Gemini fallback...`);
        const questions = await generateWithGemini(topic, count);
        console.log(`✅ Gemini generated ${questions.length} questions`);
        return questions;
    } catch (error) {
        console.warn('⚠️ Gemini also failed:', error);
    }

    // 3. Curated topic-specific questions
    console.log('📚 Using curated question bank');

    // Try exact match, then partial match
    let questions: QuizApiQuestion[] | undefined = QUESTION_BANK[topic];
    if (!questions) {
        const topicLower = topic.toLowerCase();
        const key = Object.keys(QUESTION_BANK).find((k) =>
            k.toLowerCase().includes(topicLower) || topicLower.includes(k.toLowerCase())
        );
        questions = key ? QUESTION_BANK[key] : undefined;
    }

    if (questions) {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    // Last resort: random topic
    const allTopics = Object.keys(QUESTION_BANK);
    const randomTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
    const fallback = [...QUESTION_BANK[randomTopic]].sort(() => Math.random() - 0.5);
    return fallback.slice(0, count);
}
