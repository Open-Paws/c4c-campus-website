/**
 * Assignment Grader Component
 * Grade individual student submissions
 */

import { useState } from 'react';
import { formatFileSize, getFileIcon } from '@/lib/file-upload';

interface AssignmentGraderProps {
  submission: any;
  assignmentTitle: string;
  maxPoints: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignmentGrader({
  submission,
  assignmentTitle,
  maxPoints,
  onClose,
  onSuccess
}: AssignmentGraderProps) {
  const [grade, setGrade] = useState(submission.score?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (parseFloat(grade) > maxPoints) {
      setError(`Grade cannot exceed ${maxPoints} points`);
      setLoading(false);
      return;
    }

    try {
      const supabase = (window as any).supabase;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/assignments/${submission.assignment_id}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_id: submission.id,
          score: parseFloat(grade),
          feedback: feedback.trim() || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grade submission');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const supabase = (window as any).supabase;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/submissions/${submission.id}/download`, {
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

  const percentage = grade ? Math.round((parseFloat(grade) / maxPoints) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Grade Submission</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Student Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Student Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{submission.profiles.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{submission.profiles.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Submitted:</span>
                <span className="font-medium">
                  {new Date(submission.submitted_at).toLocaleString()}
                </span>
              </div>
              {submission.is_late && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-red-600">Late Submission</span>
                </div>
              )}
              {submission.submission_number > 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Resubmission:</span>
                  <span className="font-medium">#{submission.submission_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* File Info */}
          <div>
            <h3 className="font-semibold mb-3">Submitted File</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getFileIcon(submission.file_name)}</span>
                <div>
                  <p className="font-medium">{submission.file_name}</p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(submission.file_size_bytes)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Download
              </button>
            </div>
          </div>

          {/* Grading */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Grade (out of {maxPoints} points) *
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                required
                min="0"
                max={maxPoints}
                step="0.01"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                placeholder="0"
              />
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {percentage}%
                </div>
                <div className="text-xs text-gray-500">
                  {percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F'}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Feedback (optional, will be emailed to student)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide constructive feedback on the submission..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Markdown formatting supported
            </p>
          </div>

          {/* Quick Feedback Templates */}
          <div>
            <p className="text-sm font-medium mb-2">Quick Feedback:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Excellent work! All requirements met.',
                'Good job! Minor improvements needed.',
                'Meets basic requirements.',
                'Please review the instructions and resubmit.',
                'Great attention to detail!',
                'Code is well-documented and clean.'
              ].map((template, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFeedback((prev: string) => prev ? `${prev}\n\n${template}` : template)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !grade}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : submission.score !== null ? 'Update Grade' : 'Submit Grade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
