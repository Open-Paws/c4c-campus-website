/**
 * Assignment Status Helper Module
 * Centralizes all assignment status logic and badge generation
 * @module lib/assignment-status
 */

import type { AssignmentWithSubmission, Submission } from '@/types/assignment';

/**
 * Derived assignment status based on assignment rules and current state
 */
export interface AssignmentStatus {
  /** Whether the assignment is past its due date */
  isPastDue: boolean;
  /** Whether submissions are completely closed (past due + no late allowed) */
  isClosed: boolean;
  /** Whether late submissions are allowed and it's past due */
  isLateButAllowed: boolean;
  /** Whether the user has at least one submission */
  hasSubmission: boolean;
  /** Whether the most recent submission has been graded */
  isGraded: boolean;
  /** Whether the user can submit (or resubmit) */
  canSubmit: boolean;
  /** Whether the user can resubmit (already submitted + allowed + under limit) */
  canResubmit: boolean;
  /** Current submission number (0 if no submissions) */
  currentSubmissionNumber: number;
  /** Canonical status label for display */
  statusLabel: string;
  /** Badge variant for consistent styling */
  badgeVariant: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  /** Score as percentage (0-100) if graded */
  scorePercentage: number | null;
  /** The user's latest submission if any */
  latestSubmission: Submission | null;
}

/**
 * Compute comprehensive assignment status
 *
 * When `assignment.serverCanSubmit` is provided (from calling the database's
 * can_user_submit RPC), it takes precedence over local derivation for
 * canSubmit/canResubmit. This ensures the UI reflects exactly what the server
 * will accept.
 *
 * @param assignment - Assignment with user submission data (may include serverCanSubmit)
 * @param currentTime - Current time (defaults to now)
 * @returns Derived status object
 */
export function getAssignmentStatus(
  assignment: AssignmentWithSubmission,
  currentTime: Date = new Date()
): AssignmentStatus {
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
  const isPastDue = dueDate !== null && currentTime > dueDate;
  const isClosed = isPastDue && !assignment.allow_late_submissions;
  const isLateButAllowed = isPastDue && !!assignment.allow_late_submissions;

  const latestSubmission = assignment.user_submission || null;
  const hasSubmission = latestSubmission !== null;
  const isGraded = hasSubmission && latestSubmission.status === 'graded';

  const currentSubmissionNumber = latestSubmission?.submission_number || 0;
  const maxSubmissions = assignment.max_submissions || 1;

  // Determine if user can submit
  let canSubmit = false;
  let canResubmit = false;

  // If server-provided flag is present, use it as the authoritative source
  if (assignment.serverCanSubmit !== undefined) {
    canSubmit = assignment.serverCanSubmit;
    // Derive canResubmit from serverCanSubmit and hasSubmission
    canResubmit = canSubmit && hasSubmission;
  } else {
    // Fall back to local derivation when server flag is not available
    if (!isClosed) {
      if (!hasSubmission) {
        canSubmit = true;
      } else if (assignment.allow_resubmission && currentSubmissionNumber < maxSubmissions) {
        canSubmit = true;
        canResubmit = true;
      }
    }
  }

  // Compute score percentage if graded
  const scorePercentage = isGraded && latestSubmission.score !== null
    ? Math.round((latestSubmission.score / (assignment.max_points ?? 1)) * 100)
    : null;

  // Determine status label and badge variant
  const { statusLabel, badgeVariant } = computeStatusDisplay(
    hasSubmission,
    isGraded,
    isPastDue,
    isClosed,
    isLateButAllowed,
    latestSubmission,
    assignment.max_points ?? 0
  );

  return {
    isPastDue,
    isClosed,
    isLateButAllowed,
    hasSubmission,
    isGraded,
    canSubmit,
    canResubmit,
    currentSubmissionNumber,
    statusLabel,
    badgeVariant,
    scorePercentage,
    latestSubmission
  };
}

/**
 * Compute display status label and badge variant
 */
function computeStatusDisplay(
  hasSubmission: boolean,
  isGraded: boolean,
  _isPastDue: boolean,
  isClosed: boolean,
  isLateButAllowed: boolean,
  submission: Submission | null,
  maxPoints: number
): { statusLabel: string; badgeVariant: AssignmentStatus['badgeVariant'] } {
  // Not submitted cases
  if (!hasSubmission) {
    if (isClosed) {
      return { statusLabel: 'Closed', badgeVariant: 'red' };
    }
    if (isLateButAllowed) {
      return { statusLabel: 'Late', badgeVariant: 'orange' };
    }
    return { statusLabel: 'Not Submitted', badgeVariant: 'blue' };
  }

  // Graded case
  if (isGraded && submission && submission.score !== null) {
    const score = submission.score;
    const percentage = (score / maxPoints) * 100;
    const gradeLabel = `Graded: ${score}/${maxPoints}`;

    if (percentage >= 90) {
      return { statusLabel: gradeLabel, badgeVariant: 'green' };
    } else if (percentage >= 70) {
      return { statusLabel: gradeLabel, badgeVariant: 'blue' };
    } else if (percentage >= 60) {
      return { statusLabel: gradeLabel, badgeVariant: 'yellow' };
    } else {
      return { statusLabel: gradeLabel, badgeVariant: 'red' };
    }
  }

  // Submitted but not graded
  if (submission?.is_late) {
    return { statusLabel: 'Submitted (Late)', badgeVariant: 'yellow' };
  }
  return { statusLabel: 'Submitted', badgeVariant: 'green' };
}

/**
 * Get HTML badge markup for assignment status
 * @param status - Assignment status object
 * @returns HTML string for status badge
 */
export function getStatusBadgeHtml(status: AssignmentStatus): string {
  const colorClasses: Record<AssignmentStatus['badgeVariant'], string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  const classes = colorClasses[status.badgeVariant];
  return `<span class="px-3 py-1 ${classes} text-sm font-medium rounded-full">${status.statusLabel}</span>`;
}

/**
 * Get Tailwind CSS classes for badge styling (React components)
 * @param variant - Badge variant
 * @returns Object with bg and text class strings
 */
export function getBadgeClasses(variant: AssignmentStatus['badgeVariant']): {
  bgClass: string;
  textClass: string;
  fullClass: string;
} {
  const classes: Record<AssignmentStatus['badgeVariant'], { bgClass: string; textClass: string }> = {
    blue: { bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
    green: { bgClass: 'bg-green-100', textClass: 'text-green-700' },
    yellow: { bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
    orange: { bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
    red: { bgClass: 'bg-red-100', textClass: 'text-red-700' },
    gray: { bgClass: 'bg-gray-100', textClass: 'text-gray-700' }
  };

  const { bgClass, textClass } = classes[variant];
  return {
    bgClass,
    textClass,
    fullClass: `${bgClass} ${textClass}`
  };
}

/**
 * Format due date with urgency indicator
 * @param dueDate - Due date string or null
 * @param currentTime - Current time for comparison
 * @returns Formatted string with urgency context
 */
export function formatDueDateWithUrgency(
  dueDate: string | null,
  currentTime: Date = new Date()
): { text: string; isUrgent: boolean; isPast: boolean } {
  if (!dueDate) {
    return { text: 'No due date', isUrgent: false, isPast: false };
  }

  const due = new Date(dueDate);
  const isPast = currentTime > due;

  if (isPast) {
    return {
      text: `Due: ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      isUrgent: false,
      isPast: true
    };
  }

  const hoursUntilDue = (due.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

  let isUrgent = false;
  let text = '';

  if (hoursUntilDue < 24) {
    isUrgent = true;
    text = `Due in ${Math.round(hoursUntilDue)} hours`;
  } else if (hoursUntilDue < 48) {
    isUrgent = true;
    text = 'Due tomorrow';
  } else {
    text = `Due: ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return { text, isUrgent, isPast };
}
