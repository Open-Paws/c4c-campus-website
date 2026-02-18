/**
 * BlogPostForm Component - Full blog post create/edit form
 *
 * Mounted as client:only="react" Astro island on admin blog page.
 * Handles title, slug, description, category, tags, featured image, content, and status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BlogEditor } from './BlogEditor';
import { BLOG_CATEGORIES } from '../types/index';
import type { BlogPost } from '../types/index';

interface BlogPostFormProps {
  post?: BlogPost | null;
  onSave: () => void;
  onCancel: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

export const BlogPostForm: React.FC<BlogPostFormProps> = ({ post, onSave, onCancel }) => {
  const isEditing = !!post;

  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [description, setDescription] = useState(post?.description || '');
  const [content, setContent] = useState(post?.content || '');
  const [category, setCategory] = useState(post?.category || 'News');
  const [tagsInput, setTagsInput] = useState(post?.tags?.join(', ') || '');
  const [authorName, setAuthorName] = useState(post?.author_name || 'C4C Team');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image || '');
  const [featuredImagePreview, setFeaturedImagePreview] = useState(post?.featured_image || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugManual, setSlugManual] = useState(isEditing);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const handleFeaturedImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Featured image must be under 5MB');
      return;
    }

    const token = await getToken();
    if (!token) {
      setError('Please log in to upload images');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/blog/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      setFeaturedImage(data.url);
      setFeaturedImagePreview(data.url);
      setError('');
    } catch (err) {
      console.error('Featured image upload failed:', err);
      setError('Failed to upload featured image');
    }
  }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required'); return; }
    if (!slug.trim()) { setError('Slug is required'); return; }
    if (!content.trim() || content === '<p></p>') { setError('Content is required'); return; }

    const token = await getToken();
    if (!token) { setError('Please log in'); return; }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      content,
      featured_image: featuredImage || null,
      category,
      tags: tags.length > 0 ? tags : null,
      author_name: authorName.trim() || 'C4C Team',
      status,
    };

    setSaving(true);

    try {
      const url = isEditing ? `/api/blog/${post.id}` : '/api/blog';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save post');
        return;
      }

      onSave();
    } catch (err) {
      console.error('Save post failed:', err);
      setError('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{isEditing ? 'Edit Post' : 'New Post'}</h2>
        <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-sm">
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Your blog post title"
        />
      </div>

      {/* Slug */}
      <div>
        <label className={labelClass}>
          Slug *
          {!slugManual && (
            <button
              type="button"
              onClick={() => setSlugManual(true)}
              className="ml-2 text-xs text-blue-600 hover:underline"
            >
              Edit manually
            </button>
          )}
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => { setSlugManual(true); setSlug(slugify(e.target.value)); }}
          className={`${inputClass} font-mono text-sm`}
          placeholder="your-post-slug"
          readOnly={!slugManual}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          rows={2}
          placeholder="Brief description for SEO and post previews"
        />
      </div>

      {/* Category + Author + Status row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={inputClass}>
            {BLOG_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Author Name</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className={inputClass}
            placeholder="C4C Team"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className={inputClass}
          placeholder="ai, animal-advocacy, announcement"
        />
      </div>

      {/* Featured Image */}
      <div>
        <label className={labelClass}>Featured Image</label>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFeaturedImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {featuredImage && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 truncate max-w-xs">{featuredImage}</span>
                <button
                  type="button"
                  onClick={() => { setFeaturedImage(''); setFeaturedImagePreview(''); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {featuredImagePreview && (
            <img src={featuredImagePreview} alt="Preview" className="w-24 h-16 object-cover rounded-lg border" />
          )}
        </div>
      </div>

      {/* Content Editor */}
      <div>
        <label className={labelClass}>Content *</label>
        <BlogEditor content={content} onChange={setContent} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
