/**
 * ModerationActions Component - Teacher moderation controls
 *
 * Features:
 * - Pin/unpin comments
 * - Delete comments
 * - Lock/unlock forum threads
 * - Dropdown menu with mobile-friendly design
 *
 * Reference: tests/integration/discussion-schema.test.ts
 */

import { useState, useRef, useEffect, type FC } from 'react';

interface ModerationActionsProps {
  commentId?: string;
  forumPostId?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  onPin?: (id: string, pinned: boolean) => void;
  onLock?: (id: string, locked: boolean) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const ModerationActions: FC<ModerationActionsProps> = ({
  commentId,
  forumPostId,
  isPinned = false,
  isLocked = false,
  onPin,
  onLock,
  onDelete,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const id = commentId || forumPostId;
  if (!id) return null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePin = () => {
    if (onPin) {
      onPin(id, !isPinned);
      setIsOpen(false);
    }
  };

  const handleLock = () => {
    if (onLock) {
      onLock(id, !isLocked);
      setIsOpen(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      const confirmMessage = forumPostId
        ? 'Delete this forum post and all its replies?'
        : 'Delete this comment?';

      if (window.confirm(confirmMessage)) {
        onDelete(id);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-surface-hover"
        title="Moderation actions"
        aria-label="Moderation actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-border z-50 py-1"
          role="menu"
        >
          {/* Pin/Unpin */}
          {onPin && (
            <button
              onClick={handlePin}
              className="w-full px-4 py-2 text-left text-sm hover:bg-surface-hover transition-colors flex items-center gap-2"
              role="menuitem"
            >
              {isPinned ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Unpin
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  Pin
                </>
              )}
            </button>
          )}

          {/* Lock/Unlock (Forum posts only) */}
          {onLock && forumPostId && (
            <button
              onClick={handleLock}
              className="w-full px-4 py-2 text-left text-sm hover:bg-surface-hover transition-colors flex items-center gap-2"
              role="menuitem"
            >
              {isLocked ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                  Unlock Thread
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Lock Thread
                </>
              )}
            </button>
          )}

          {/* Divider */}
          {(onPin || onLock) && onDelete && (
            <div className="my-1 border-t border-border" />
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
