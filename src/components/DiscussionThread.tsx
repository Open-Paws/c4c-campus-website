/**
 * DiscussionThread Component - Threaded lesson discussions
 *
 * Features:
 * - Threaded comment display (nested replies)
 * - Real-time updates via Supabase Realtime
 * - Pinned comments displayed first
 * - Reply functionality
 * - Teacher moderation
 * - Loading states and error handling
 * - Mobile responsive
 *
 * Reference: tests/integration/discussion-schema.test.ts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LessonDiscussion, UserProfile } from '../types';
import { Comment } from './Comment';
import { CommentInput } from './CommentInput';

// Removed manual createClient to use shared instance


interface DiscussionThreadProps {
  lessonId: number;
  cohortId: string;
  currentUserId: string;
  isTeacher: boolean;
  className?: string;
}

interface CommentWithAuthor extends LessonDiscussion {
  author: UserProfile;
  replies: CommentWithAuthor[];
}

export const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  lessonId,
  cohortId,
  currentUserId,
  isTeacher,
  className = '',
}) => {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Fetch comments and organize into threaded structure
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all discussions for this lesson
      const { data: discussions, error: discussionsError } = await supabase
        .from('lesson_discussions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('cohort_id', cohortId)
        .order('created_at', { ascending: true });

      if (discussionsError) throw discussionsError;

      if (!discussions || discussions.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Fetch unique user IDs
      const userIds = [...new Set(discussions.map((d) => d.user_id))];

      // Fetch user profiles (from applications table for now)
      const { data: profiles, error: profilesError } = await supabase
        .from('applications')
        .select('user_id, email, role')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create user map
      const userMap = new Map<string, UserProfile>(
        profiles?.map((p) => [
          p.user_id,
          {
            id: p.user_id,
            email: p.email,
            is_teacher: p.role === 'teacher',
          },
        ]) || []
      );

      // Organize into threaded structure
      const commentMap = new Map<string, CommentWithAuthor>();
      const rootComments: CommentWithAuthor[] = [];

      // First pass: Create all comment objects
      discussions.forEach((disc) => {
        const author = userMap.get(disc.user_id) || {
          id: disc.user_id,
          email: 'Unknown User',
        };

        commentMap.set(disc.id, {
          ...disc,
          author,
          replies: [],
        });
      });

      // Second pass: Build tree structure
      discussions.forEach((disc) => {
        const comment = commentMap.get(disc.id)!;

        if (disc.parent_id) {
          // This is a reply
          const parent = commentMap.get(disc.parent_id);
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          // This is a root comment
          rootComments.push(comment);
        }
      });

      // Sort: Pinned first, then by date
      rootComments.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setComments(rootComments);
    } catch (err: any) {
      console.error('Error fetching discussions:', err);
      setError(err.message || 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }, [lessonId, cohortId]);

  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`lesson-discussions-${lessonId}-${cohortId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_discussions',
          filter: `lesson_id=eq.${lessonId}`,
        },
        () => {
          // Refetch on any change
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId, cohortId, fetchComments]);

  // Post new comment
  const handlePostComment = async (content: string, parentId: string | null = null) => {
    try {
      const { error } = await supabase.from('lesson_discussions').insert({
        lesson_id: lessonId,
        cohort_id: cohortId,
        user_id: currentUserId,
        parent_id: parentId,
        content,
        is_teacher_response: isTeacher,
        is_pinned: false,
      });

      if (error) throw error;

      // Manually refetch to ensure UI updates immediately
      await fetchComments();

      setReplyingTo(null);
      // Real-time subscription will also trigger update, but manual fetch is safer

    } catch (err: any) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment: ' + err.message);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('lesson_discussions')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', currentUserId); // Only owner can edit

      if (error) throw error;
    } catch (err: any) {
      console.error('Error editing comment:', err);
      alert('Failed to edit comment: ' + err.message);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_discussions')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId); // Only owner can delete

      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment: ' + err.message);
    }
  };

  // Pin/unpin comment (teachers only)
  const handlePinComment = async (commentId: string, pinned: boolean) => {
    if (!isTeacher) return;

    try {
      const { error } = await supabase
        .from('lesson_discussions')
        .update({ is_pinned: pinned })
        .eq('id', commentId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error pinning comment:', err);
      alert('Failed to pin comment: ' + err.message);
    }
  };

  // Render comment tree recursively
  const renderComment = (comment: CommentWithAuthor, depth: number = 0) => {
    const isReplying = replyingTo === comment.id;

    return (
      <div key={comment.id} className="space-y-4">
        <Comment
          comment={comment}
          author={comment.author}
          currentUserId={currentUserId}
          isTeacher={isTeacher}
          onReply={() => setReplyingTo(comment.id)}
          onEdit={handleEditComment}
          onDelete={handleDeleteComment}
          onPin={handlePinComment}
          depth={depth}
        />

        {/* Reply Input */}
        {isReplying && (
          <div className={`${depth > 0 ? 'ml-8 md:ml-12' : ''}`}>
            <CommentInput
              onSubmit={(content) => handlePostComment(content, comment.id)}
              onCancel={() => setReplyingTo(null)}
              placeholder="Write your reply..."
              submitLabel="Post Reply"
              showCancel
              minHeight="80px"
              autoFocus
            />
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies.length > 0 && (
          <div className="space-y-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-surface rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface rounded w-1/4" />
                <div className="h-20 bg-surface rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card bg-red-50 border-red-200 ${className}`}>
        <p className="text-red-600">Error loading discussions: {error}</p>
        <button onClick={fetchComments} className="btn btn-sm btn-primary mt-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* New Comment Input */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Discussion</h3>
        <CommentInput
          onSubmit={(content) => handlePostComment(content)}
          placeholder="Ask a question or share your thoughts..."
          submitLabel="Post Comment"
        />
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg">No comments yet</p>
            <p className="text-sm mt-1">Be the first to start the discussion!</p>
          </div>
        ) : (
          <div>
            <h4 className="text-sm font-semibold text-text-muted mb-4">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </h4>
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  );
};
