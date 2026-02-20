/**
 * Submission Status Component
 * Visual status indicator for assignment submissions
 */

import type { Submission } from '@/types/assignment';
import type { AssignmentStatus } from '@/lib/assignment-status';

interface SubmissionStatusProps {
  submission: Submission | null;
  maxPoints: number;
  isPastDue?: boolean;
  lateAllowed?: boolean;
  /** Optional: Use pre-computed status from getAssignmentStatus() */
  status?: AssignmentStatus;
}

export default function SubmissionStatus({
  submission,
  maxPoints,
  isPastDue = false,
  lateAllowed = false
}: SubmissionStatusProps) {
  // Not submitted
  if (!submission) {
    if (isPastDue && !lateAllowed) {
      return (
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🔒</span>
            <div>
              <h3 className="text-lg font-bold text-gray-700">Not Submitted</h3>
              <p className="text-sm text-gray-600">Submissions are closed</p>
            </div>
          </div>
          <div className="mt-4 text-center py-3 bg-gray-200 rounded text-gray-600 font-medium">
            Assignment Closed
          </div>
        </div>
      );
    }

    if (isPastDue) {
      return (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">⏰</span>
            <div>
              <h3 className="text-lg font-bold text-orange-700">Not Submitted</h3>
              <p className="text-sm text-orange-600">Past due date</p>
            </div>
          </div>
          <div className="mt-4 text-center py-3 bg-orange-100 rounded text-orange-700 font-medium">
            Late Submission Available
          </div>
        </div>
      );
    }

    return (
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📝</span>
          <div>
            <h3 className="text-lg font-bold text-blue-700">Not Submitted</h3>
            <p className="text-sm text-blue-600">Ready to submit</p>
          </div>
        </div>
        <div className="mt-4 text-center py-3 bg-blue-100 rounded text-blue-700 font-medium">
          Submission Pending
        </div>
      </div>
    );
  }

  // Submitted but not graded
  if (submission.status !== 'graded') {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">✅</span>
          <div>
            <h3 className="text-lg font-bold text-yellow-700">Submitted</h3>
            <p className="text-sm text-yellow-600">Waiting for grade</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Submitted:</span>
            <span className="font-medium">
              {submission.submitted_at && new Date(submission.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          </div>

          {submission.is_late && (
            <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded text-center">
              ⚠️ Late Submission
            </div>
          )}

          <div className="text-center py-3 bg-yellow-100 rounded text-yellow-700 font-medium">
            Grading in Progress
          </div>
        </div>
      </div>
    );
  }

  // Graded
  const scoreValue = submission.score || 0;
  const percentage = (scoreValue / maxPoints) * 100;

  let gradeColor = 'gray';
  let gradeIcon = '📊';
  let gradeLabel = 'Graded';

  if (percentage >= 90) {
    gradeColor = 'green';
    gradeIcon = '🌟';
    gradeLabel = 'Excellent';
  } else if (percentage >= 80) {
    gradeColor = 'blue';
    gradeIcon = '✨';
    gradeLabel = 'Great';
  } else if (percentage >= 70) {
    gradeColor = 'yellow';
    gradeIcon = '👍';
    gradeLabel = 'Good';
  } else if (percentage >= 60) {
    gradeColor = 'orange';
    gradeIcon = '📈';
    gradeLabel = 'Pass';
  } else {
    gradeColor = 'red';
    gradeIcon = '📉';
    gradeLabel = 'Needs Improvement';
  }

  return (
    <div className={`bg-${gradeColor}-50 border-2 border-${gradeColor}-300 rounded-lg p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{gradeIcon}</span>
        <div>
          <h3 className={`text-lg font-bold text-${gradeColor}-700`}>Graded</h3>
          <p className={`text-sm text-${gradeColor}-600`}>{gradeLabel}</p>
        </div>
      </div>

      {/* Grade Display */}
      <div className="text-center mb-4">
        <div className={`text-6xl font-bold text-${gradeColor}-700 mb-1`}>
          {scoreValue}
        </div>
        <div className="text-gray-600 text-lg">
          out of {maxPoints} points
        </div>
        <div className={`text-2xl font-semibold text-${gradeColor}-600 mt-2`}>
          {percentage.toFixed(1)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className={`bg-${gradeColor}-500 h-3 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Graded:</span>
          <span className="font-medium">
            {submission.graded_at && new Date(submission.graded_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>

        {submission.is_late && (
          <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded text-center">
            ⚠️ Late submission
          </div>
        )}

        {submission.feedback && (
          <div className={`bg-${gradeColor}-100 border border-${gradeColor}-200 rounded p-3 mt-3`}>
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <span>💬</span> Teacher Feedback
            </h4>
            <p className={`text-sm text-${gradeColor}-800 whitespace-pre-wrap`}>
              {submission.feedback}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
