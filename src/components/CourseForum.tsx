/**
 * CourseForum Component - General course discussions
 *
 * Features:
 * - Create new forum topics
 * - List all forum posts
 * - Thread replies
 * - Pin/lock topics (teachers)
 * - Real-time updates
 * - Sorting and filtering
 * - Mobile responsive
 *
 * Reference: tests/integration/discussion-schema.test.ts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { CourseForumPost, ForumReply, UserProfile } from '../types';
import { CommentInput } from './CommentInput';
import { ModerationActions } from './ModerationActions';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

interface CourseForumProps {
  courseId: number;
  cohortId: string;
  currentUserId: string;
  isTeacher: boolean;
  className?: string;
}

interface ForumPostWithDetails extends CourseForumPost {
  author: UserProfile;
  reply_count: number;
  latest_reply_at: string | null;
}

interface ForumReplyWithAuthor extends ForumReply {
  author: UserProfile;
}

export const CourseForum: React.FC<CourseForumProps> = ({
  courseId,
  cohortId,
  currentUserId,
  isTeacher,
  className = '',
}) => {
  const [posts, setPosts] = useState<ForumPostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPostWithDetails | null>(null);
  const [postReplies, setPostReplies] = useState<ForumReplyWithAuthor[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  // Fetch forum posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: forumPosts, error: postsError } = await supabase
        .from('course_forums')
        .select('*')
        .eq('course_id', courseId)
        .eq('cohort_id', cohortId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!forumPosts || forumPosts.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles
      const userIds = [...new Set(forumPosts.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('applications')
        .select('user_id, email, role')
        .in('user_id', userIds);

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

      // Fetch reply counts for each post
      const postsWithDetails: ForumPostWithDetails[] = await Promise.all(
        forumPosts.map(async (post) => {
          const { count } = await supabase
            .from('forum_replies')
            .select('*', { count: 'exact', head: true })
            .eq('forum_post_id', post.id);

          const { data: latestReply } = await supabase
            .from('forum_replies')
            .select('created_at')
            .eq('forum_post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...post,
            author: userMap.get(post.user_id) || { id: post.user_id, email: 'Unknown' },
            reply_count: count || 0,
            latest_reply_at: latestReply?.created_at || null,
          };
        })
      );

      setPosts(postsWithDetails);
    } catch (err: any) {
      console.error('Error fetching forum posts:', err);
      setError(err.message || 'Failed to load forum');
    } finally {
      setLoading(false);
    }
  }, [courseId, cohortId]);

  // Fetch replies for a post
  const fetchReplies = useCallback(async (postId: string) => {
    try {
      setLoadingReplies(true);

      const { data: replies, error: repliesError } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('forum_post_id', postId)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      if (!replies || replies.length === 0) {
        setPostReplies([]);
        setLoadingReplies(false);
        return;
      }

      // Fetch user profiles
      const userIds = [...new Set(replies.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('applications')
        .select('user_id, email, role')
        .in('user_id', userIds);

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

      const repliesWithAuthors = replies.map((reply) => ({
        ...reply,
        author: userMap.get(reply.user_id) || { id: reply.user_id, email: 'Unknown' },
      }));

      setPostReplies(repliesWithAuthors);
    } catch (err: any) {
      console.error('Error fetching replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`course-forum-${courseId}-${cohortId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_forums',
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_replies',
        },
        () => {
          if (selectedPost) {
            fetchReplies(selectedPost.id);
          }
          fetchPosts(); // Update reply counts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, cohortId, selectedPost, fetchPosts, fetchReplies]);

  // Create new topic
  const handleCreateTopic = async (content: string) => {
    if (!newTopicTitle.trim()) {
      alert('Please enter a topic title');
      return;
    }

    try {
      const { error } = await supabase.from('course_forums').insert({
        course_id: courseId,
        cohort_id: cohortId,
        user_id: currentUserId,
        title: newTopicTitle,
        content,
        is_pinned: false,
        is_locked: false,
      });

      if (error) throw error;

      setShowNewTopicForm(false);
      setNewTopicTitle('');
    } catch (err: any) {
      console.error('Error creating topic:', err);
      alert('Failed to create topic: ' + err.message);
    }
  };

  // Reply to post
  const handleReplyToPost = async (content: string) => {
    if (!selectedPost) return;

    try {
      const { error } = await supabase.from('forum_replies').insert({
        forum_post_id: selectedPost.id,
        user_id: currentUserId,
        content,
        is_teacher_response: isTeacher,
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error posting reply:', err);
      alert('Failed to post reply: ' + err.message);
    }
  };

  // Pin/unpin post
  const handlePinPost = async (postId: string, pinned: boolean) => {
    if (!isTeacher) return;

    try {
      const { error } = await supabase
        .from('course_forums')
        .update({ is_pinned: pinned })
        .eq('id', postId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error pinning post:', err);
      alert('Failed to pin post: ' + err.message);
    }
  };

  // Lock/unlock post
  const handleLockPost = async (postId: string, locked: boolean) => {
    if (!isTeacher) return;

    try {
      const { error } = await supabase
        .from('course_forums')
        .update({ is_locked: locked })
        .eq('id', postId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error locking post:', err);
      alert('Failed to lock post: ' + err.message);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!isTeacher) return;

    try {
      const { error } = await supabase.from('course_forums').delete().eq('id', postId);

      if (error) throw error;

      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post: ' + err.message);
    }
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

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-6 bg-surface rounded w-3/4 mb-2" />
              <div className="h-4 bg-surface rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card bg-red-50 border-red-200 ${className}`}>
        <p className="text-red-600">Error loading forum: {error}</p>
        <button onClick={fetchPosts} className="btn btn-sm btn-primary mt-2">
          Retry
        </button>
      </div>
    );
  }

  // Thread view
  if (selectedPost) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Back button */}
        <button
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Forum
        </button>

        {/* Post */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{selectedPost.title}</h2>
                {selectedPost.is_pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 text-xs rounded">
                    Pinned
                  </span>
                )}
                {selectedPost.is_locked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 text-gray-600 text-xs rounded">
                    Locked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
                <span className="font-medium">{selectedPost.author.email}</span>
                <span>•</span>
                <span>{formatRelativeTime(selectedPost.created_at)}</span>
              </div>
              <p className="text-text-primary">{selectedPost.content}</p>
            </div>
            {isTeacher && (
              <ModerationActions
                forumPostId={selectedPost.id}
                isPinned={selectedPost.is_pinned}
                isLocked={selectedPost.is_locked}
                onPin={handlePinPost}
                onLock={handleLockPost}
                onDelete={handleDeletePost}
              />
            )}
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {selectedPost.reply_count} {selectedPost.reply_count === 1 ? 'Reply' : 'Replies'}
          </h3>

          {loadingReplies ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {postReplies.map((reply) => (
                <div key={reply.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {reply.author.email.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">{reply.author.email}</span>
                        {reply.is_teacher_response && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded">
                            Teacher
                          </span>
                        )}
                        <span className="text-xs text-text-muted">
                          {formatRelativeTime(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary">{reply.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Reply input */}
          {!selectedPost.is_locked && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Add a reply</h4>
              <CommentInput
                onSubmit={handleReplyToPost}
                placeholder="Write your reply..."
                submitLabel="Post Reply"
                minHeight="100px"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Forum list view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Forum</h2>
        <button
          onClick={() => setShowNewTopicForm(!showNewTopicForm)}
          className="btn btn-primary"
        >
          + New Topic
        </button>
      </div>

      {/* New Topic Form */}
      {showNewTopicForm && (
        <div className="card bg-surface">
          <h3 className="text-lg font-semibold mb-4">Create New Topic</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Topic Title</label>
              <input
                type="text"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Best practices for workflow automation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <CommentInput
                onSubmit={handleCreateTopic}
                onCancel={() => {
                  setShowNewTopicForm(false);
                  setNewTopicTitle('');
                }}
                placeholder="Describe your topic in detail..."
                submitLabel="Create Topic"
                showCancel
                minHeight="150px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-text-muted card">
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
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
            <p className="text-lg">No forum topics yet</p>
            <p className="text-sm mt-1">Start a discussion with your cohort!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => {
                setSelectedPost(post);
                fetchReplies(post.id);
              }}
              className="card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    {post.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 text-xs rounded flex-shrink-0">
                        Pinned
                      </span>
                    )}
                    {post.is_locked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 text-gray-600 text-xs rounded flex-shrink-0">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{post.author.email}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(post.created_at)}</span>
                    <span>•</span>
                    <span>
                      {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                    </span>
                    {post.latest_reply_at && (
                      <>
                        <span>•</span>
                        <span>Last reply {formatRelativeTime(post.latest_reply_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
