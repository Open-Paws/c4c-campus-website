/**
 * Assignment Creator Component
 * Modal for creating and editing assignments
 */

import { useState, useEffect } from 'react';
import type { Assignment } from '@/types/assignment';

interface AssignmentCreatorProps {
  lessonId: number;
  courseName?: string;
  lessonName?: string;
  editingAssignment?: Assignment | null;
  onClose: () => void;
  onSuccess: (assignment: Assignment) => void;
}

export default function AssignmentCreator({
  lessonId,
  courseName,
  lessonName,
  editingAssignment,
  onClose,
  onSuccess
}: AssignmentCreatorProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    due_date: '',
    max_points: 100,
    max_file_size_mb: 10,
    allowed_file_types: ['pdf', 'doc', 'docx', 'txt', 'zip'],
    allow_late_submissions: false,
    late_penalty_percent: 0,
    allow_resubmission: false,
    max_submissions: 1,
    is_published: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingAssignment) {
      setFormData({
        title: editingAssignment.title,
        description: editingAssignment.description || '',
        instructions: editingAssignment.instructions || '',
        due_date: editingAssignment.due_date ? new Date(editingAssignment.due_date).toISOString().slice(0, 16) : '',
        max_points: editingAssignment.max_points,
        max_file_size_mb: editingAssignment.max_file_size_mb,
        allowed_file_types: editingAssignment.allowed_file_types,
        allow_late_submissions: editingAssignment.allow_late_submissions,
        late_penalty_percent: editingAssignment.late_penalty_percent,
        allow_resubmission: editingAssignment.allow_resubmission,
        max_submissions: editingAssignment.max_submissions,
        is_published: editingAssignment.is_published
      });
    }
  }, [editingAssignment]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = (window as any).supabase;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const url = editingAssignment
        ? `/api/assignments/${editingAssignment.id}`
        : '/api/assignments';

      const method = editingAssignment ? 'PUT' : 'POST';

      const payload = editingAssignment
        ? formData
        : { ...formData, lesson_id: lessonId };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save assignment');
      }

      onSuccess(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_file_types: prev.allowed_file_types.includes(type)
        ? prev.allowed_file_types.filter(t => t !== type)
        : [...prev.allowed_file_types, type]
    }));
  };

  const commonFileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'DOC' },
    { value: 'docx', label: 'DOCX' },
    { value: 'txt', label: 'TXT' },
    { value: 'zip', label: 'ZIP' },
    { value: 'png', label: 'PNG' },
    { value: 'jpg', label: 'JPG' },
    { value: 'py', label: 'Python' },
    { value: 'js', label: 'JavaScript' },
    { value: 'java', label: 'Java' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
              </h2>
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
              Assignment Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Week 1: Python Basics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Brief Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Short summary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Instructions (Markdown supported)
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Detailed instructions for the assignment..."
            />
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Max Points
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.max_points}
                onChange={(e) => setFormData({ ...formData, max_points: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* File Settings */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Allowed File Types
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {commonFileTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleFileType(type.value)}
                  className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                    formData.allowed_file_types.includes(type.value)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max File Size (MB)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.max_file_size_mb}
              onChange={(e) => setFormData({ ...formData, max_file_size_mb: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submission Settings */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="late_submissions"
                checked={formData.allow_late_submissions}
                onChange={(e) => setFormData({ ...formData, allow_late_submissions: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="late_submissions" className="ml-2 text-sm font-medium">
                Allow late submissions
              </label>
            </div>

            {formData.allow_late_submissions && (
              <div className="ml-6">
                <label className="block text-sm font-medium mb-2">
                  Late Penalty (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.late_penalty_percent}
                  onChange={(e) => setFormData({ ...formData, late_penalty_percent: parseInt(e.target.value) })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allow_resubmission"
                checked={formData.allow_resubmission}
                onChange={(e) => setFormData({ ...formData, allow_resubmission: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="allow_resubmission" className="ml-2 text-sm font-medium">
                Allow resubmissions
              </label>
            </div>

            {formData.allow_resubmission && (
              <div className="ml-6">
                <label className="block text-sm font-medium mb-2">
                  Max Submissions
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_submissions}
                  onChange={(e) => setFormData({ ...formData, max_submissions: parseInt(e.target.value) })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="published" className="ml-2 text-sm font-medium">
                Publish immediately
              </label>
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
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
