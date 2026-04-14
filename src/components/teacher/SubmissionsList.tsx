/**
 * Submissions List Component
 * Shows all student submissions for an assignment
 */

import React, { useState, useEffect } from 'react';
import { formatFileSize, getFileIcon } from '@/lib/file-upload';
import AssignmentGrader from './AssignmentGrader';

interface Submission {
  id: number;
  user_id: string;
  file_name: string;
  file_size_bytes: number;
  submission_number: number;
  submitted_at: string;
  is_late: boolean;
  score: number | null;
  feedback: string | null;
  status: string;
  graded_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface SubmissionsListProps {
  assignmentId: number;
  assignmentTitle: string;
  maxPoints: number;
  onClose: () => void;
}

export default function SubmissionsList({
  assignmentId,
  assignmentTitle,
  maxPoints,
  onClose
}: SubmissionsListProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<'all' | 'graded' | 'ungraded'>('all');

  useEffect(() => {
    loadSubmissions();
  }, [assignmentId]);

  const loadSubmissions = async () => {
    try {
      const supabase = (window as any).supabase;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load submissions');
      }

      setSubmissions(result.data);
      setStats(result.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (submissionId: number, _fileName: string) => {
    try {
      const supabase = (window as any).supabase;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/submissions/${submissionId}/download`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get download URL');
      }

      // Open download URL in new tab
      window.open(result.url, '_blank');
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleGradeComplete = () => {
    setGradingSubmission(null);
    loadSubmissions(); // Reload to show updated grade
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'graded') return s.status === 'graded';
    if (filter === 'ungraded') return s.status !== 'graded';
    return true;
  });

  if (gradingSubmission) {
    return (
      <AssignmentGrader
        submission={gradingSubmission}
        assignmentTitle={assignmentTitle}
        maxPoints={maxPoints}
        onClose={() => setGradingSubmission(null)}
        onSuccess={handleGradeComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Submissions</h2>
              <p className="text-sm text-gray-600 mt-1">{assignmentTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-700">{stats.total_submissions}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Graded</p>
                <p className="text-2xl font-bold text-green-700">{stats.graded_submissions}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">Ungraded</p>
                <p className="text-2xl font-bold text-orange-700">
                  {stats.total_submissions - stats.graded_submissions}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">Average</p>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.average_grade ? stats.average_grade.toFixed(1) : 'N/A'}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs text-red-600 font-medium">Late</p>
                <p className="text-2xl font-bold text-red-700">{stats.late_submissions}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilter('ungraded')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'ungraded'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ungraded ({submissions.filter(s => s.status !== 'graded').length})
            </button>
            <button
              onClick={() => setFilter('graded')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'graded'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Graded ({submissions.filter(s => s.status === 'graded').length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading submissions...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!loading && !error && filteredSubmissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm mt-1">Students haven't submitted to this assignment</p>
            </div>
          )}

          {!loading && !error && filteredSubmissions.length > 0 && (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {submission.profiles.full_name}
                        </h3>
                        {submission.is_late && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                            LATE
                          </span>
                        )}
                        {submission.submission_number > 1 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Resubmission #{submission.submission_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>{getFileIcon(submission.file_name)}</span>
                        <span className="truncate">{submission.file_name}</span>
                        <span>({formatFileSize(submission.file_size_bytes)})</span>
                      </div>

                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(submission.submitted_at).toLocaleString()}
                      </p>

                      {submission.score !== null && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-lg font-bold text-green-600">
                            {submission.score} / {maxPoints}
                          </span>
                          {submission.graded_at && (
                            <span className="text-xs text-gray-500">
                              Graded: {new Date(submission.graded_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(submission.id, submission.file_name)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => setGradingSubmission(submission)}
                        className={`px-3 py-2 rounded transition-colors text-sm font-medium ${
                          submission.score !== null
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {submission.score !== null ? 'Edit Grade' : 'Grade'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
