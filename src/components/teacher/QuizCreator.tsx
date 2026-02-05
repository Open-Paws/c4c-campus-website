/**
 * Quiz Creator Component
 * Modal for creating quiz metadata (title, settings, etc.)
 *
 * Note: This creates the quiz shell only. Question management
 * requires a separate question editor (future work).
 *
 * Pattern: Follows AssignmentCreator.tsx exactly
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createDefaultQuizFormData, quizFormToCreateRequest } from '@/types/quiz';
import type { QuizFormData } from '@/types/quiz';

interface QuizCreatorProps {
  lessonId: number;
  courseName?: string;
  lessonName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuizCreator({
  lessonId,
  courseName,
  lessonName,
  onClose,
  onSuccess
}: QuizCreatorProps) {
  const [formData, setFormData] = useState<QuizFormData>(createDefaultQuizFormData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      // Use the existing utility to convert form data to API request
      // The API derives courseId and moduleId from the lesson
      const requestBody = quizFormToCreateRequest(formData, 0, undefined, lessonId);

      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create quiz');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create Quiz</h2>
              {courseName && lessonName && (
                <p className="text-sm text-gray-600 mt-1">
                  {courseName} / {lessonName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Module 1 Knowledge Check"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the quiz..."
            />
          </div>

          {/* Quiz Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={formData.timeLimit ?? ''}
                onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="No limit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.passingScore}
                onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Max Attempts
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">0 = unlimited attempts</p>
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="shuffle_questions"
                checked={formData.shuffleQuestions}
                onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="shuffle_questions" className="ml-2 text-sm font-medium">
                Shuffle question order
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_correct_answers"
                checked={formData.showCorrectAnswers}
                onChange={(e) => setFormData({ ...formData, showCorrectAnswers: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="show_correct_answers" className="ml-2 text-sm font-medium">
                Show correct answers after attempt
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_results"
                checked={formData.showResultsImmediately}
                onChange={(e) => setFormData({ ...formData, showResultsImmediately: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="show_results" className="ml-2 text-sm font-medium">
                Show results immediately
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="published"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="published" className="ml-2 text-sm font-medium">
                Publish immediately
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
            This creates the quiz settings. Questions can be added after the quiz is created.
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
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
