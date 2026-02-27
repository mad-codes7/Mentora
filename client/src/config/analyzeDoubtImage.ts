// Analyze a doubt image using Gemini Vision API to auto-detect subject tags and description.
// Uses the same NEXT_PUBLIC_GEMINI_API_KEY already configured for quiz generation.

const KNOWN_TAGS = [
    'Algebra', 'Geometry', 'Calculus', 'Physics', 'Chemistry', 'Biology',
    'English', 'Computer Science', 'Statistics', 'Trigonometry',
    'Organic Chemistry', 'Mechanics',
];

export interface DoubtAnalysis {
    tags: string[];
    description: string;
}

/**
 * Send a base64-encoded image to Gemini Vision and get back
 * matching subject tags + a short description of the doubt.
 *
 * Returns empty result if API is unavailable or analysis fails.
 */
export async function analyzeDoubtImage(base64DataUrl: string): Promise<DoubtAnalysis> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('Gemini API key not configured — skipping image analysis');
        return { tags: [], description: '' };
    }

    // Strip the data URL prefix to get raw base64
    const base64Match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!base64Match) {
        console.warn('Invalid base64 data URL');
        return { tags: [], description: '' };
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    const prompt = `You are an academic doubt analyzer. Look at this image and:
1. Identify which academic subject(s) it relates to from EXACTLY this list: ${JSON.stringify(KNOWN_TAGS)}
2. Write a brief 1-sentence description of what the student is asking or struggling with.

Return ONLY a valid JSON object (no markdown, no code fences):
{"tags": ["matching tag1", "matching tag2"], "description": "Brief description of the doubt"}

Rules:
- tags MUST be exact matches from the provided list
- Pick 1-3 most relevant tags
- Description should be concise (under 100 characters)
- If you cannot determine the subject, return {"tags": [], "description": ""}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Data,
                                },
                            },
                            { text: prompt },
                        ],
                    }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
                }),
            }
        );

        if (!response.ok) {
            console.warn(`Gemini Vision API error: ${response.status}`);
            return { tags: [], description: '' };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return { tags: [], description: '' };

        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const result = JSON.parse(cleaned) as DoubtAnalysis;

        // Validate tags against known list
        const validTags = (result.tags || []).filter((t: string) =>
            KNOWN_TAGS.some(k => k.toLowerCase() === t.toLowerCase())
        );

        // Normalize tag case to match our known tags
        const normalizedTags = validTags.map((t: string) =>
            KNOWN_TAGS.find(k => k.toLowerCase() === t.toLowerCase()) || t
        );

        return {
            tags: normalizedTags,
            description: typeof result.description === 'string' ? result.description : '',
        };
    } catch (error) {
        console.warn('Doubt image analysis failed:', error);
        return { tags: [], description: '' };
    }
}
