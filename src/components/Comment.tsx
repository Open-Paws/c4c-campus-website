/**
 * Comment Component - Display individual discussion comment
 *
 * Features:
 * - User avatar and name display
 * - Teacher badge indicator
 * - Rich text content rendering
 * - Timestamp display (relative time)
 * - Reply button for threaded discussions
 * - Edit/delete for comment owner
 * - Moderation actions for teachers
 *
 * Reference: tests/integration/discussion-schema.test.ts
 */

import React, { useState } from 'react';
import type { LessonDiscussion, UserProfile } from '../types';
import { ModerationActions } from './ModerationActions';

interface CommentProps {
  comment: LessonDiscussion;
  author: UserProfile;
  currentUserId: string;
  isTeacher: boolean;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onPin?: (commentId: string, pinned: boolean) => void;
  depth?: number; // For nested replies (0 = top level)
  className?: string;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  author,
  currentUserId,
  isTeacher,
  onReply,
  onEdit,
  onDelete,
  onPin,
  depth = 0,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwnComment = comment.user_id === currentUserId;
  const canModerate = isTeacher;
  const maxDepth = 3; // Maximum nesting level

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div
      className={`flex gap-3 ${depth > 0 ? 'ml-8 md:ml-12' : ''} ${className}`}
      data-testid={`comment-${comment.id}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name || author.email}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {(author.name || author.email).charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-surface rounded-lg p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {author.name || author.email}
              </span>
              {comment.is_teacher_response && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Teacher
                </span>
              )}
              {comment.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 text-xs rounded font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  Pinned
                </span>
              )}
              <span className="text-xs text-text-muted">
                {formatRelativeTime(comment.created_at ?? '')}
              </span>
              {comment.created_at !== comment.updated_at && (
                <span className="text-xs text-text-muted">(edited)</span>
              )}
            </div>

            {/* Moderation Actions */}
            {canModerate && (
              <ModerationActions
                commentId={comment.id}
                isPinned={comment.is_pinned ?? false}
                onPin={onPin}
                onDelete={onDelete}
              />
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                placeholder="Edit your comment..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="btn btn-primary btn-sm"
                  disabled={!editContent.trim()}
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-primary prose prose-sm max-w-none">
              {comment.content}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        {!isEditing && (
          <div className="flex items-center gap-4 mt-2 px-2">
            {onReply && depth < maxDepth && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-text-muted hover:text-primary transition-colors"
              >
                Reply
              </button>
            )}
            {isOwnComment && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-text-muted hover:text-primary transition-colors"
              >
                Edit
              </button>
            )}
            {isOwnComment && onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Delete this comment?')) {
                    onDelete(comment.id);
                  }
                }}
                className="text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
