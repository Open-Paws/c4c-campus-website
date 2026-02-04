/**
 * CommentInput Component - Rich text input for discussion comments
 *
 * Features:
 * - Tiptap rich text editor
 * - Basic formatting (bold, italic, lists)
 * - Link insertion
 * - Character count
 * - Submit and cancel actions
 * - Mobile responsive toolbar
 *
 * Reference: Tiptap documentation
 */

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
// Link extension import removed - not currently used

interface CommentInputProps {
  onSubmit: (content: string) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  initialContent?: string;
  submitLabel?: string;
  showCancel?: boolean;
  minHeight?: string;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  onCancel,
  placeholder = 'Write your comment...',
  initialContent = '',
  submitLabel = 'Post Comment',
  showCancel = false,
  minHeight = '120px',
  autoFocus = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings in comments
      }),
      Placeholder.configure({
        placeholder,
      }),
      /* Link extension duplicated
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary-dark',
        },
      }),
      */
    ],
    content: initialContent,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  const handleSubmit = async () => {
    if (!editor) return;

    const content = editor.getText().trim();
    if (!content) {
      alert('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      editor.commands.clearContent();
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      editor?.commands.clearContent();
    }
  };

  // setLink function removed - Link extension is disabled

  if (!editor) {
    return <div className="animate-pulse bg-surface rounded-lg h-32" />;
  }

  const characterCount = editor.getText().length;
  const maxCharacters = 2000;
  const isNearLimit = characterCount > maxCharacters * 0.9;

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-surface flex-wrap">
        {/* Bold */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-text-muted'
            }`}
          title="Bold (Ctrl+B)"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 12h8a4 4 0 010 8H6V4h7a4 4 0 010 8"
            />
          </svg>
        </button>

        {/* Italic */}
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-text-muted'
            }`}
          title="Italic (Ctrl+I)"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 4h4M14 4L10 20M6 20h4"
            />
          </svg>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Bullet List */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-text-muted'
            }`}
          title="Bullet List"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Ordered List */}
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('orderedList') ? 'bg-primary/10 text-primary' : 'text-text-muted'
            }`}
          title="Numbered List"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h1v5H3V4zm0 7h1v5H3v-5zm0 7h1v2H3v-2zm3-10h15M6 11h15M6 18h15"
            />
          </svg>
        </button>

        {/* Link button removed - extension is disabled */}

        {/* Character Count */}
        <div className="flex-1" />
        <span
          className={`text-xs ${isNearLimit ? 'text-orange-600' : 'text-text-muted'
            }`}
        >
          {characterCount}/{maxCharacters}
        </span>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-border bg-surface">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || characterCount === 0 || characterCount > maxCharacters}
          className="btn btn-primary btn-sm"
        >
          {isSubmitting ? 'Posting...' : submitLabel}
        </button>
        {showCancel && (
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
