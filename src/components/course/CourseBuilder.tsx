/**
 * CourseBuilder Component - TDD Implementation
 * Reference: TEST_PLAN.md Section 2.2
 * Teacher interface for creating/editing courses
 */

import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import type { Course } from '@/types';

interface CourseBuilderProps {
  course?: Course;
  onSave: (courseData: any) => Promise<{ success: boolean }>;
  onPublish: (courseId: number, published: boolean) => Promise<{ success: boolean }>;
}

export default function CourseBuilder({ course, onSave, onPublish }: CourseBuilderProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    track: '',
    difficulty: '',
    default_duration_weeks: '',
    slug: '',
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Pre-fill form when editing existing course
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        track: course.track || '',
        difficulty: course.difficulty || '',
        default_duration_weeks: course.default_duration_weeks?.toString() || '',
        slug: course.slug || '',
      });
    }
  }, [course]);

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !course) {
      const generatedSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Remove duplicate hyphens
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.title, course]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setSaveError('');
  };

  const validate = (): boolean => {
    const validationErrors: string[] = [];

    if (!formData.title.trim()) {
      validationErrors.push('Course title is required');
    }

    if (!formData.track) {
      validationErrors.push('Track is required');
    }

    if (formData.default_duration_weeks) {
      const weeks = Number(formData.default_duration_weeks);
      if (isNaN(weeks) || weeks < 0) {
        validationErrors.push('Duration weeks must be positive');
      }
    }

    if (formData.title.length > 255) {
      validationErrors.push('Course title too long (max 255 characters)');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      // Sanitize user input (XSS prevention)
      const sanitizedData = {
        ...(course?.id && { id: course.id }),
        title: DOMPurify.sanitize(formData.title, { ALLOWED_TAGS: [] }),
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: formData.description ? DOMPurify.sanitize(formData.description, { ALLOWED_TAGS: [] }) : null,
        track: formData.track,
        difficulty: formData.difficulty,
        default_duration_weeks: formData.default_duration_weeks ? parseInt(formData.default_duration_weeks, 10) : null,
        is_published: course?.is_published || false,
      };

      const result = await onSave(sanitizedData);

      if (result.success) {
        setSaveSuccess(true);
      }
    } catch (err: any) {
      setSaveError('Failed to save course');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;

    try {
      const newPublishedState = !course.is_published;
      await onPublish(course.id, newPublishedState);
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  return (
    <div className="course-builder">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="course-title">Course Title</label>
          <input
            type="text"
            id="course-title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            aria-label="Course title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            aria-label="Description"
          />
        </div>

        <div className="form-group">
          <label htmlFor="track">Track</label>
          <select
            id="track"
            name="track"
            value={formData.track}
            onChange={handleChange}
            aria-label="Track"
          >
            <option value="">Select a track</option>
            <option value="animal_advocacy">Animal Advocacy</option>
            <option value="climate">Climate</option>
            <option value="ai_safety">AI Safety</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            aria-label="Difficulty"
          >
            <option value="">Select difficulty</option>
            <option value="beginner">beginner</option>
            <option value="intermediate">intermediate</option>
            <option value="advanced">advanced</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="default-duration-weeks">Duration (weeks)</label>
          <input
            type="number"
            id="default-duration-weeks"
            name="default_duration_weeks"
            value={formData.default_duration_weeks}
            onChange={handleChange}
            aria-label="Duration in weeks"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slug">Slug</label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            aria-label="Slug"
          />
          <small>Slug: {formData.slug}</small>
        </div>

        {errors.length > 0 && (
          <div role="alert" aria-live="polite" className="error-messages">
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}

        {saveSuccess && (
          <div className="success-message">
            <p>Course saved successfully</p>
          </div>
        )}

        {saveError && (
          <div className="error-message">
            <p>{saveError}</p>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSaving}
            role="button"
            aria-label="Save course"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          {course && (
            <button
              type="button"
              onClick={handlePublishToggle}
              role="button"
            >
              {course.is_published ? 'Unpublish' : 'Publish'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}