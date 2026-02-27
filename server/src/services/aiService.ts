import { GoogleGenerativeAI } from '@google/generative-ai';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Fallback to Gemini if Groq key is not set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const useGroq = !!GROQ_API_KEY;

const TUTOR_SYSTEM_PROMPT = [
  'You are MentorAI, a friendly and patient virtual tutor on the Mentora learning platform.',
  '',
  'PERSONALITY: Be warm, encouraging, supportive. Use simple language, break complex topics into digestible parts. Use analogies and real-world examples. Celebrate when students understand something.',
  '',
  'CAPABILITIES: Answer academic questions across all subjects. Explain concepts step-by-step. Generate practice questions when asked. Help with homework and exam prep. Provide study tips.',
  '',
  'FORMATTING: Use markdown (bold, lists, code blocks). Keep responses concise (2-4 paragraphs max). Use bullet points for lists. Use **bold** for key terms.',
  '',
  'QUIZ GENERATION: When asked to generate questions or a quiz, return a well-formatted response with numbered questions, options (A, B, C, D), the correct answer, and a brief explanation for each.',
  '',
  'RULES: Never provide harmful or off-topic content. If not academic, politely redirect. Be honest if unsure. Always be accurate.',
].join('\n');

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// ─── Groq Chat (Primary) ──────────────────────────────────────

async function chatWithGroq(messages: ChatMessage[], topic?: string): Promise<string> {
  const groqMessages = [
    { role: 'system', content: TUTOR_SYSTEM_PROMPT },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  ];

  // Add topic context to the last user message
  if (topic && groqMessages.length > 1) {
    const last = groqMessages[groqMessages.length - 1];
    last.content = `[Context: Student is studying "${topic}"]\n\n${last.content}`;
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || 'No response generated.';
}

// ─── Gemini Chat (Fallback) ───────────────────────────────────

async function chatWithGemini(messages: ChatMessage[], topic?: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const userPrompt = topic
    ? `[Context: Student is studying "${topic}"]\n\n${lastMessage.content}`
    : lastMessage.content;

  const chat = model.startChat({
    history,
    systemInstruction: {
      role: 'user' as const,
      parts: [{ text: TUTOR_SYSTEM_PROMPT }],
    },
  });

  const result = await chat.sendMessage(userPrompt);
  return result.response.text();
}

// ─── Public API ───────────────────────────────────────────────

export async function chatWithTutor(messages: ChatMessage[], topic?: string): Promise<string> {
  console.log(`[AI Chat] Using ${useGroq ? 'Groq' : 'Gemini'}, messages: ${messages.length}`);
  if (useGroq) {
    return chatWithGroq(messages, topic);
  }
  return chatWithGemini(messages, topic);
}

export async function generateQuiz(topic: string, numQuestions: number = 5): Promise<string> {
  const prompt = `Generate exactly ${numQuestions} multiple-choice questions about "${topic}" for a student. For each question provide: the question text, four options (A, B, C, D), the correct answer letter, and a brief explanation. Format it nicely with markdown.`;

  return chatWithTutor(
    [{ role: 'user', content: prompt }],
    topic
  );
}
