import { Timestamp } from 'firebase/firestore';

// ─── User Types ──────────────────────────────────────────────

export interface UserProfile {
    fullName: string;
    email: string;
    createdAt: Timestamp;
}

export interface StudentData {
    classLevel: string;
    examFocus: string[];
    linkedParentIds: string[];
    parentCode?: string;
}

export interface TutorAvailability {
    day: string;
    startTime: string;
    endTime: string;
}

export interface TutorData {
    isVerified: boolean;
    isActive?: boolean;
    subjects: string[];
    availability: TutorAvailability[];
    teachingMode: 'Online' | 'Offline' | 'Both';
    sessionPrice: number;
    walletBalance: number;
    aggregateRating: number;
    demoVideoUrl: string;
    bio?: string;
    experience?: string;
    hourlyRate?: number;
    verificationQuizScore?: number;
    qualification?: string;
}

export interface ParentData {
    linkedStudentIds: string[];
}

export interface MentoraUser {
    uid: string;
    roles: ('student' | 'tutor' | 'parent')[];
    profile: UserProfile;
    studentData: StudentData | null;
    tutorData: TutorData | null;
    parentData: ParentData | null;
}

// ─── Session Types ───────────────────────────────────────────

export type SessionStatus =
    | 'searching'
    | 'pending_payment'
    | 'pending_tutor_approval'
    | 'paid_waiting'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type MeetingType = 'on_demand' | 'scheduled';

export interface Session {
    sessionId: string;
    studentId: string;
    tutorId: string;
    topic: string;
    meetingType: MeetingType;
    status: SessionStatus;
    scheduledStartTime: Timestamp | null;
    actualStartTime: Timestamp | null;
    endTime: Timestamp | null;
    durationLimitMinutes: number;
    paymentTransactionId: string;
    paymentStatus: PaymentStatus;
    preAssessmentId: string;
    postAssessmentId: string;
    ratingId: string;
    sharedDocuments: string[];
    createdAt?: Timestamp;
    tutorJoinedAt?: Timestamp | null;
    studentName?: string;
    tutorName?: string;
}

// ─── Assessment Types ────────────────────────────────────────

export interface QuizQuestion {
    questionText: string;
    options: string[];
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
}

export interface ScoreData {
    totalScore: number;
    maxScore: number;
}

export type AssessmentType = 'pre_session' | 'post_session';

export interface Assessment {
    assessmentId: string;
    sessionId: string;
    userId: string;
    type: AssessmentType;
    topic: string;
    scoreData: ScoreData;
    quizPayload: QuizQuestion[];
    takenAt: Timestamp;
}

// ─── Rating Types ────────────────────────────────────────────

export interface RatingMetrics {
    studentStarRating: number;
    feedbackText: string;
    preTestScore: number;
    postTestScore: number;
    scoreDelta: number;
    finalCalculatedRating: number;
}

export interface Rating {
    ratingId: string;
    sessionId: string;
    tutorId: string;
    studentId: string;
    metrics: RatingMetrics;
    createdAt: Timestamp;
}

// ─── Doubt Types ─────────────────────────────────────────────

export type DoubtStatus = 'open' | 'matched' | 'resolved';

export interface Doubt {
    doubtId: string;
    studentId: string;
    imageUrl: string;
    description: string;
    tags: string[];
    status: DoubtStatus;
    matchedTutorId: string | null;
    sessionId: string | null;
    createdAt: Timestamp;
}

// ─── Shared Document Types ───────────────────────────────────

export interface SharedDocument {
    name: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
}

// ─── Wallet & Analytics Types ────────────────────────────────

export interface WalletInfo {
    totalEarnings: number;
    pendingAmount: number;
    completedSessions: number;
    transactions: WalletTransaction[];
}

export interface WalletTransaction {
    sessionId: string;
    amount: number;
    studentName: string;
    topic: string;
    date: string;
    status: 'completed' | 'pending';
}

export interface AnalyticsData {
    totalSessions: number;
    completedSessions: number;
    averageRating: number;
    totalStudents: number;
    averageScoreDelta: number;
    ratingDistribution: { [key: number]: number };
    subjectBreakdown: { subject: string; count: number }[];
    monthlySessionTrend: { month: string; count: number }[];
}
