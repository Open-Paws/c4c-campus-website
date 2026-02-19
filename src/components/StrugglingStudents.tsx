/**
 * StrugglingStudents Component
 * Alert widget that highlights students who need attention:
 * - Less than 20% completion rate
 * - Inactive for more than 7 days
 * - Dropped status
 *
 * Provides quick actions to reach out to students
 */

import { useState } from 'react';
import type { StudentWithProgress } from '../types';
import EmailComposeModal from './EmailComposeModal';

interface StrugglingStudentsProps {
  students: StudentWithProgress[];
  allStudents?: StudentWithProgress[];
  cohortId?: string;
  teacherName?: string;
  loading?: boolean;
}

export default function StrugglingStudents({ students, allStudents, cohortId, teacherName, loading = false }: StrugglingStudentsProps) {
  const [sortBy, setSortBy] = useState<'completion' | 'activity'>('completion');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<StudentWithProgress[]>([]);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎉</span>
          <h3 className="text-lg font-bold">All Students on Track!</h3>
        </div>
        <p className="text-text-muted">Great news! All students are making good progress.</p>
      </div>
    );
  }

  // Sort students based on selected criteria
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'completion') {
      return a.completion_percentage - b.completion_percentage;
    } else {
      return b.days_since_activity - a.days_since_activity;
    }
  });

  const getStatusBadge = (student: StudentWithProgress) => {
    if (student.status === 'dropped') {
      return { text: 'Dropped', color: 'bg-red-500 text-white' };
    }
    if (student.days_since_activity > 14) {
      return { text: 'Very Inactive', color: 'bg-red-500/10 text-red-600' };
    }
    if (student.days_since_activity > 7) {
      return { text: 'Inactive', color: 'bg-orange-500/10 text-orange-600' };
    }
    if (student.completion_percentage < 10) {
      return { text: 'Low Progress', color: 'bg-yellow-500/10 text-yellow-600' };
    }
    return { text: 'At Risk', color: 'bg-orange-500/10 text-orange-600' };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 10) return 'bg-red-500';
    if (percentage < 20) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const handleEmailStudent = (student: StudentWithProgress) => {
    if (cohortId) {
      setEmailRecipients([student]);
      setShowEmailModal(true);
    } else {
      // Fallback to mailto if cohortId not available
      const subject = encodeURIComponent(`Checking in on your course progress`);
      const body = encodeURIComponent(`Hi ${student.name},\n\nI noticed you haven't been active in the course recently. Is everything okay? Let me know if there's anything I can do to help you get back on track.\n\nBest regards`);
      window.open(`mailto:${student.email}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🆘</span>
          <div>
            <h3 className="text-lg font-bold">Students Needing Attention</h3>
            <p className="text-sm text-text-muted">{students.length} student{students.length !== 1 ? 's' : ''} require support</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('completion')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              sortBy === 'completion'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            }`}
          >
            By Progress
          </button>
          <button
            onClick={() => setSortBy('activity')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              sortBy === 'activity'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            }`}
          >
            By Activity
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-medium text-red-800">Action Required</p>
            <p className="text-sm text-red-700 mt-1">
              These students have either low completion rates or haven't been active recently.
              Consider reaching out to offer support.
            </p>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {sortedStudents.map((student) => {
          const badge = getStatusBadge(student);

          return (
            <div
              key={student.user_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Student Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-base truncate">{student.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>

                  <p className="text-sm text-text-muted mb-3 truncate">{student.email}</p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text-muted">Progress</span>
                      <span className="font-medium">{student.completion_percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(student.completion_percentage)} transition-all duration-500`}
                        style={{ width: `${student.completion_percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {student.completed_lessons} of {student.total_lessons} lessons completed
                    </p>
                  </div>

                  {/* Activity Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-text-muted">Last active:</span>
                      <span className="ml-1 font-medium">
                        {student.days_since_activity === 0 ? 'Today' :
                         student.days_since_activity === 1 ? 'Yesterday' :
                         `${student.days_since_activity} days ago`}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Time spent:</span>
                      <span className="ml-1 font-medium">{student.time_spent_hours}h</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEmailStudent(student)}
                    className="btn btn-sm btn-primary whitespace-nowrap"
                    title="Send email"
                  >
                    📧 Email
                  </button>
                  <a
                    href={cohortId ? `/teacher/cohorts/${cohortId}` : `/teacher/progress`}
                    className="btn btn-sm btn-ghost text-center whitespace-nowrap"
                    title={cohortId ? "View in cohort" : "View progress"}
                  >
                    👁️ View
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Actions */}
      {students.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (cohortId) {
                setEmailRecipients(students);
                setShowEmailModal(true);
              } else {
                const emails = students.map(s => s.email).join(',');
                const subject = encodeURIComponent('Checking in on your course progress');
                window.open(`mailto:${emails}?subject=${subject}`, '_blank');
              }
            }}
            className="btn btn-secondary w-full"
          >
            📧 Email All Students
          </button>
        </div>
      )}

      {showEmailModal && cohortId && (
        <EmailComposeModal
          recipients={emailRecipients.map(s => ({ user_id: s.user_id, name: s.name, email: s.email }))}
          allStudents={allStudents?.map(s => ({ user_id: s.user_id, name: s.name, email: s.email }))}
          cohortId={cohortId}
          teacherName={teacherName || 'Your Teacher'}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
