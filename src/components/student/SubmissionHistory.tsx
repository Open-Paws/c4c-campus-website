/**
 * Submission History Component
 * View all submissions and history for an assignment
 */

import { useState, useEffect } from 'react';
import { formatFileSize, getFileIcon } from '@/lib/file-upload';
import type { Submission } from '@/types/assignment';

interface SubmissionHistoryProps {
  assignmentId: string;
  assignmentTitle: string;
  onClose: () => void;
}

export default function SubmissionHistory({
  assignmentId,
  assignmentTitle,
  onClose
}: SubmissionHistoryProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      // Use the API endpoint instead of direct Supabase query
      const response = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submissions');
      }

      setSubmissions(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (submissionId: string) => {
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

      window.open(result.url, '_blank');
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Submission History</h2>
              <p className="text-sm text-gray-600 mt-1">{assignmentTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

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

          {!loading && !error && submissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm mt-1">You haven't submitted to this assignment</p>
            </div>
          )}

          {!loading && !error && submissions.length > 0 && (
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <div
                  key={submission.id}
                  className={`border rounded-lg p-5 ${
                    index === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          Submission #{submission.submission_number}
                        </h3>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                            Current
                          </span>
                        )}
                        {submission.is_late && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                            Late
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600">
                        Submitted: {formatDate(submission.submitted_at ?? '')}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {submission.status === 'graded' ? (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {submission.score}
                          </div>
                          <div className="text-xs text-gray-600">
                            Graded {submission.graded_at && formatDate(submission.graded_at)}
                          </div>
                        </div>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileIcon(submission.file_name ?? 'unknown')}</span>
                      <div>
                        <p className="font-medium text-sm">{submission.file_name ?? 'Unknown file'}</p>
                        <p className="text-xs text-gray-600">
                          {formatFileSize(submission.file_size_bytes ?? 0)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(submission.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Download
                    </button>
                  </div>

                  {/* Feedback */}
                  {submission.feedback && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <span>💬</span> Teacher Feedback
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {submission.feedback}
                      </p>
                    </div>
                  )}

                  {/* Grade Details */}
                  {submission.score !== null && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-600">Score:</span>
                        <span className="ml-2 font-medium text-green-600">{submission.score}</span>
                      </div>
                      {submission.is_late && (
                        <p className="text-xs text-red-600 mt-2">
                          * Late submission
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
