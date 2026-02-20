/**
 * Quiz System Type Definitions
 *
 * Comprehensive TypeScript types for the quiz and assessment system.
 *
 * NOTE: These types are thin wrappers over the Supabase-generated types in ./generated.ts
 * When modifying types, ensure they remain compatible with the generated schema types.
 * Run `npm run db:types` to regenerate types from the database schema.
 */

import type {
  QuizRow,
  QuizQuestionRow,
  QuizAttemptRow,
} from './generated';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

// NOTE: Must match schema.sql quiz_questions.question_type CHECK constraint
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'multiple_select';

// NOTE: Must match schema.sql quiz_attempts.grading_status CHECK constraint
export type GradingStatus = 'pending' | 'auto_graded' | 'needs_review';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Quiz - matches schema.sql quizzes table
 * All IDs are UUIDs (strings)
 *
 * Extends QuizRow with required created_by field in application context.
 */
export interface Quiz extends Omit<QuizRow, 'created_by'> {
  created_by: string; // UUID - required in application context
}

/**
 * QuizQuestion - matches schema.sql quiz_questions table
 *
 * Extends QuizQuestionRow with typed options array instead of generic Json.
 */
export interface QuizQuestion extends Omit<QuizQuestionRow, 'options' | 'question_type'> {
  question_type: QuestionType;
  options: QuestionOption[] | null; // Typed JSONB structure
}

export interface QuestionOption {
  id: string; // e.g., "a", "b", "c", "d"
  text: string;
}

/**
 * QuizAttempt - matches schema.sql quiz_attempts table
 * NOTE: Uses answers_json (not answers) to match DB column name
 *
 * Extends QuizAttemptRow with typed answers_json array and grading_status.
 */
export interface QuizAttempt extends Omit<QuizAttemptRow, 'answers_json' | 'grading_status'> {
  answers_json: QuestionAnswer[] | null; // Typed JSONB structure
  grading_status: GradingStatus;
  teacher_feedback?: string | null; // Optional teacher feedback (application-layer field)
}

export interface QuestionAnswer {
  question_id: string; // UUID - matches schema
  answer: string | string[]; // Single answer or array for multiple choice
  is_correct: boolean | null;
  points_earned: number;
  feedback: string | null;
}

export interface QuestionBankItem {
  id: number;
  teacher_id: string; // UUID
  category: string | null;
  difficulty: QuestionDifficulty | null;
  tags: string[] | null;

  // Question data (same as QuizQuestion)
  type: QuestionType;
  question_text: string;
  question_image_url: string | null;
  explanation: string | null;
  options_json: QuestionOption[] | null;
  correct_answer: string | null;
  correct_answers_json: string[] | null;
  case_sensitive: boolean;
  points: number;

  // Usage
  times_used: number;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Request type for creating a new quiz.
 *
 * Field mapping notes (view-layer names -> database column names):
 * - timeLimit -> time_limit_minutes (in database)
 * - shuffleQuestions -> randomize_questions (in database)
 *
 * All IDs referencing UUID-backed columns should be strings.
 */
export interface CreateQuizRequest {
  courseId: number;
  moduleId?: number;
  lessonId?: number;
  title: string;
  description?: string;
  /**
   * Time limit in minutes. Maps to `time_limit_minutes` column in database.
   * Use null or omit for no time limit.
   */
  timeLimit?: number;
  passingScore?: number;
  maxAttempts?: number;
  /**
   * Whether to randomize question order. Maps to `randomize_questions` column in database.
   */
  shuffleQuestions?: boolean;
  showCorrectAnswers?: boolean;
  showResultsImmediately?: boolean;
  availableFrom?: string;
  availableUntil?: string;
  published?: boolean;
}

/**
 * Request type for updating an existing quiz.
 *
 * Note: `id` is a UUID string (not number) matching schema.sql quizzes.id
 */
export interface UpdateQuizRequest extends Partial<CreateQuizRequest> {
  id: string; // UUID - matches schema.sql quizzes.id
}

/**
 * Request type for creating a new quiz question.
 *
 * Note: `quizId` is a UUID string (not number) matching schema.sql quiz_questions.quiz_id
 */
export interface CreateQuestionRequest {
  quizId: string; // UUID - matches schema.sql quiz_questions.quiz_id
  type: QuestionType;
  questionText: string;
  questionImageUrl?: string;
  explanation?: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  correctAnswers?: string[];
  caseSensitive?: boolean;
  points?: number;
  orderIndex: number;
}

/**
 * Request type for updating an existing quiz question.
 *
 * Note: `id` is a UUID string (not number) matching schema.sql quiz_questions.id
 */
export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {
  id: string; // UUID - matches schema.sql quiz_questions.id
}

/**
 * Request to start a new quiz attempt
 */
export interface StartQuizAttemptRequest {
  cohortId?: string; // UUID - matches schema
}

/**
 * Canonical answer format for API requests.
 * This is the PUBLIC interface for answer submission.
 *
 * Each answer contains:
 * - questionId: UUID string of the question
 * - answer: string for single-answer questions (multiple_choice, true_false, short_answer, essay)
 *           string[] for multiple_select questions (array of selected option IDs)
 *
 * Example:
 * ```typescript
 * [
 *   { questionId: "uuid-1", answer: "option-a" },           // multiple_choice
 *   { questionId: "uuid-2", answer: ["opt-1", "opt-3"] },   // multiple_select
 *   { questionId: "uuid-3", answer: "true" },               // true_false
 *   { questionId: "uuid-4", answer: "My short answer" },    // short_answer
 * ]
 * ```
 */
export type StudentAnswer = {
  questionId: string; // UUID - matches schema
  answer: string | string[];
};

/**
 * Request to save answers in progress (without submitting)
 *
 * The `answers` array uses the canonical StudentAnswer format.
 * API handlers validate this structure before processing.
 */
export interface SaveAnswersRequest {
  answers: StudentAnswer[];
}

/**
 * Request to submit a quiz attempt for grading
 *
 * The `answers` array uses the canonical StudentAnswer format.
 * API handlers validate this structure and normalize to the canonical
 * array form before passing to grading functions.
 */
export interface SubmitQuizAttemptRequest {
  answers: StudentAnswer[];
}

export interface GradeAttemptRequest {
  answers: Array<{
    questionId: string; // UUID - matches schema
    pointsEarned: number;
    feedback?: string;
  }>;
  teacherFeedback?: string;
}

export interface ReorderQuestionsRequest {
  questionIds: string[]; // UUIDs - matches schema
}

export interface ImportFromBankRequest {
  questionBankId: string; // UUID - matches schema
  orderIndex: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface QuizWithDetails extends Quiz {
  questions?: QuizQuestion[];
  userAttempts?: QuizAttempt[];
  canAttempt?: boolean;
  attemptsRemaining?: number;
}

export interface QuizAttemptWithQuestions extends QuizAttempt {
  quiz: Quiz;
  questions: QuizQuestionWithAnswer[];
}

export interface QuizQuestionWithAnswer extends QuizQuestion {
  your_answer?: string | string[];
  is_correct?: boolean | null;
  points_earned?: number;
}

export interface StartAttemptResponse {
  success: true;
  attempt: {
    id: string; // UUID
    attemptNumber: number;
    startedAt: string;
    timeLimit: number | null; // time_limit_minutes from quiz
  };
  questions: QuizQuestionForStudent[];
}

export interface QuizQuestionForStudent {
  id: string; // UUID - matches schema
  type: QuestionType;
  questionText: string;
  questionImageUrl: string | null;
  options: QuestionOption[] | null;
  points: number;
  orderIndex: number;
  // Note: Does NOT include correct_answer or correct_answers_json
}

export interface SubmitAttemptResponse {
  success: true;
  attempt: {
    id: string; // UUID - matches schema
    score: number;
    pointsEarned: number;
    totalPoints: number;
    passed: boolean;
    gradingStatus: GradingStatus;
    submittedAt: string;
  };
  results?: {
    questions: Array<{
      id: string; // UUID - matches schema
      questionText: string;
      yourAnswer: string | string[];
      correctAnswer?: string | string[];
      isCorrect?: boolean | null;
      pointsEarned: number;
      explanation?: string;
    }>;
  };
}

export interface QuizResultsResponse {
  quiz: Quiz;
  results: StudentQuizResult[];
  stats: QuizStats;
}

export interface StudentQuizResult {
  userId: string;
  userName: string;
  userEmail: string;
  attempts: number;
  bestScore: number;
  latestScore: number;
  passed: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  needsGrading: boolean;
  lastAttemptAt: string | null;
}

export interface QuizStats {
  totalStudents: number;
  completed: number;
  passed: number;
  averageScore: number;
  averageAttempts: number;
  needsGrading: number;
}

export interface PendingGradingResponse {
  attempts: Array<{
    id: string; // UUID - matches schema
    userId: string;
    userName: string;
    userEmail: string;
    attemptNumber: number;
    startedAt: string;
    submittedAt: string;
    autoGradedScore: number;
    essayQuestions: Array<{
      questionId: string; // UUID - matches schema
      questionText: string;
      studentAnswer: string;
      points: number;
    }>;
  }>;
}

export interface QuizAnalyticsResponse {
  questionAnalytics: Array<{
    questionId: string; // UUID - matches schema
    questionText: string;
    type: QuestionType;
    totalAnswers: number;
    correctAnswers: number;
    successRate: number;
    averagePoints: number;
    commonWrongAnswers?: Array<{ answer: string; count: number }>;
  }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  timeAnalytics: {
    averageTime: number; // seconds
    medianTime: number;
    quickest: number;
    longest: number;
  };
}

export interface AttemptsHistoryResponse {
  attempts: Array<{
    id: string; // UUID - matches schema
    attemptNumber: number;
    score: number;
    pointsEarned: number;
    totalPoints: number;
    passed: boolean;
    startedAt: string;
    submittedAt: string | null;
    gradingStatus: GradingStatus;
    time_taken_seconds: number | null; // matches schema column name
  }>;
  canRetake: boolean;
  attemptsRemaining: number | null;
}

// ============================================================================
// VALIDATION & GRADING TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GradingResult {
  isCorrect: boolean | null; // null for essay questions
  pointsEarned: number;
  feedback?: string;
}

export interface AutoGradeResult {
  answers: QuestionAnswer[];
  totalPoints: number;
  pointsEarned: number;
  score: number; // percentage
  passed: boolean;
  gradingStatus: GradingStatus;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface QuizTimerState {
  startTime: number;
  endTime: number;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface QuizProgress {
  questionsAnswered: number;
  totalQuestions: number;
  percentComplete: number;
}

export interface QuizAvailability {
  isAvailable: boolean;
  reason?: 'not_published' | 'not_yet_available' | 'deadline_passed' | 'max_attempts_reached' | 'not_enrolled';
  availableFrom?: string;
  availableUntil?: string;
  attemptsRemaining?: number;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface QuizCardProps {
  quiz: QuizWithDetails;
  userAttempts?: QuizAttempt[];
  canAttempt: boolean;
  onStart?: () => void;
}

export interface QuizTakingProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  questions: QuizQuestionForStudent[];
  onSubmit: (answers: SaveAnswersRequest['answers']) => Promise<void>;
  onSave: (answers: SaveAnswersRequest['answers']) => Promise<void>;
}

export interface QuizReviewProps {
  attempt: QuizAttemptWithQuestions;
  showCorrectAnswers: boolean;
}

/**
 * Props for QuizBuilder component.
 *
 * Note: courseId is required; moduleId and lessonId are optional associations.
 */
export interface QuizBuilderProps {
  quiz?: QuizWithDetails;
  courseId: number;
  moduleId?: number;
  lessonId?: number;
  onSave: (quiz: CreateQuizRequest | UpdateQuizRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for QuestionEditor component.
 *
 * Note: `quizId` is a UUID string (not number) matching schema.sql quiz_questions.quiz_id
 */
export interface QuestionEditorProps {
  question?: QuizQuestion;
  quizId: string; // UUID - matches schema.sql quiz_questions.quiz_id
  orderIndex: number;
  onSave: (question: CreateQuestionRequest | UpdateQuestionRequest) => Promise<void>;
  onCancel: () => void;
}

export interface QuizResultsProps {
  quiz: Quiz;
  results: StudentQuizResult[];
  stats: QuizStats;
}

export interface GradingQueueProps {
  quiz: Quiz;
  pendingAttempts: PendingGradingResponse['attempts'];
  onGrade: (attemptId: string, grading: GradeAttemptRequest) => Promise<void>;
}

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isMultipleChoiceQuestion(question: QuizQuestion): boolean {
  return question.question_type === 'multiple_choice';
}

export function isTrueFalseQuestion(question: QuizQuestion): boolean {
  return question.question_type === 'true_false';
}

export function isShortAnswerQuestion(question: QuizQuestion): boolean {
  return question.question_type === 'short_answer';
}

export function isEssayQuestion(question: QuizQuestion): boolean {
  return question.question_type === 'essay';
}

export function isMultipleSelectQuestion(question: QuizQuestion): boolean {
  return question.question_type === 'multiple_select';
}

export function needsManualGrading(question: QuizQuestion): boolean {
  return question.question_type === 'essay';
}

export function canAutoGrade(question: QuizQuestion): boolean {
  return !needsManualGrading(question);
}

// ============================================================================
// DTO TYPES - Separate types for UI forms vs API requests
// ============================================================================
// These types help avoid conflating schema-driven types with presentation-layer types.
// Use Form types for React component state/props, and API types for server communication.

/**
 * Quiz form data for UI components (QuizBuilder, etc.).
 *
 * Uses presentation-layer field names that are more intuitive for UI:
 * - timeLimit (maps to time_limit_minutes in DB)
 * - shuffleQuestions (maps to randomize_questions in DB)
 *
 * This type is used for form state management before converting to API request types.
 */
export interface QuizFormData {
  title: string;
  description: string;
  /** Time limit in minutes. Displayed as "Time Limit" in UI. Maps to time_limit_minutes in DB. */
  timeLimit: number | null;
  passingScore: number;
  maxAttempts: number;
  /** Whether to shuffle question order. Displayed as "Shuffle Questions" in UI. Maps to randomize_questions in DB. */
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  showResultsImmediately: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  isPublished: boolean;
}

/**
 * Question form data for UI components (QuestionEditor, etc.).
 *
 * Uses presentation-layer field names suitable for forms.
 */
export interface QuestionFormData {
  type: QuestionType;
  questionText: string;
  questionImageUrl: string;
  options: QuestionOption[];
  correctAnswer: string;
  correctAnswers: string[];
  explanation: string;
  points: number;
  caseSensitive: boolean;
}

/**
 * Converts QuizFormData to CreateQuizRequest for API calls.
 *
 * Handles the mapping from presentation-layer names to API/DB names:
 * - timeLimit -> timeLimit (API accepts this, server maps to time_limit_minutes)
 * - shuffleQuestions -> shuffleQuestions (API accepts this, server maps to randomize_questions)
 */
export function quizFormToCreateRequest(
  formData: QuizFormData,
  courseId: number,
  moduleId?: number,
  lessonId?: number
): CreateQuizRequest {
  return {
    courseId,
    moduleId,
    lessonId,
    title: formData.title,
    description: formData.description || undefined,
    timeLimit: formData.timeLimit ?? undefined,
    passingScore: formData.passingScore,
    maxAttempts: formData.maxAttempts,
    shuffleQuestions: formData.shuffleQuestions,
    showCorrectAnswers: formData.showCorrectAnswers,
    showResultsImmediately: formData.showResultsImmediately,
    availableFrom: formData.availableFrom ?? undefined,
    availableUntil: formData.availableUntil ?? undefined,
    published: formData.isPublished,
  };
}

/**
 * Converts QuizFormData to UpdateQuizRequest for API calls.
 */
export function quizFormToUpdateRequest(
  formData: QuizFormData,
  quizId: string
): UpdateQuizRequest {
  return {
    id: quizId,
    title: formData.title,
    description: formData.description || undefined,
    timeLimit: formData.timeLimit ?? undefined,
    passingScore: formData.passingScore,
    maxAttempts: formData.maxAttempts,
    shuffleQuestions: formData.shuffleQuestions,
    showCorrectAnswers: formData.showCorrectAnswers,
    showResultsImmediately: formData.showResultsImmediately,
    availableFrom: formData.availableFrom ?? undefined,
    availableUntil: formData.availableUntil ?? undefined,
    published: formData.isPublished,
  };
}

/**
 * Creates default QuizFormData values for a new quiz form.
 */
export function createDefaultQuizFormData(): QuizFormData {
  return {
    title: '',
    description: '',
    timeLimit: null,
    passingScore: 70,
    maxAttempts: 3,
    shuffleQuestions: false,
    showCorrectAnswers: true,
    showResultsImmediately: true,
    availableFrom: null,
    availableUntil: null,
    isPublished: false,
  };
}

/**
 * Converts a Quiz (database type) to QuizFormData for editing.
 */
export function quizToFormData(quiz: Quiz): QuizFormData {
  return {
    title: quiz.title,
    description: quiz.description ?? '',
    timeLimit: quiz.time_limit_minutes,
    passingScore: quiz.passing_score ?? 70,
    maxAttempts: quiz.max_attempts ?? 3,
    shuffleQuestions: quiz.randomize_questions ?? false,
    showCorrectAnswers: quiz.show_correct_answers ?? true,
    showResultsImmediately: quiz.show_results_immediately ?? true,
    availableFrom: quiz.available_from,
    availableUntil: quiz.available_until,
    isPublished: quiz.is_published ?? false,
  };
}
