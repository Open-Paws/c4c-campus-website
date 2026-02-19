/**
 * EmailComposeModal Component
 * Modal for teachers to compose and send emails to students via Resend.
 * Supports sending to selected students or all enrolled students in a cohort.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Recipient {
  user_id: string;
  name: string;
  email: string;
}

interface EmailComposeModalProps {
  recipients: Recipient[];
  allStudents?: Recipient[];
  cohortId: string;
  teacherName: string;
  onClose: () => void;
  onSuccess?: (sentCount: number) => void;
}

export default function EmailComposeModal({
  recipients,
  allStudents,
  cohortId,
  teacherName,
  onClose,
  onSuccess,
}: EmailComposeModalProps) {
  const [recipientMode, setRecipientMode] = useState<'selected' | 'all'>('selected');
  const [subject, setSubject] = useState('Checking in on your course progress');
  const [body, setBody] = useState(
    `Hi there,\n\nI noticed you haven't been active in the course recently. Is everything okay? Let me know if there's anything I can do to help you get back on track.\n\nBest regards,\n${teacherName}`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeRecipients = recipientMode === 'all' && allStudents ? allStudents : recipients;
  const hasAllStudents = allStudents && allStudents.length > 0 && allStudents.length !== recipients.length;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sending, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !sending) {
      onClose();
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Message body is required');
      return;
    }
    if (activeRecipients.length === 0) {
      setError('No recipients selected');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/teacher/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: cohortId,
          subject: subject.trim(),
          body: body.trim(),
          recipient_user_ids: activeRecipients.map(r => r.user_id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to send emails');
        setSending(false);
        return;
      }

      setSuccess(result.sent_count);
      setTimeout(() => {
        onSuccess?.(result.sent_count);
        onClose();
      }, 2000);
    } catch (err) {
      setError('Network error. Please try again.');
      setSending(false);
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold">Compose Email</h2>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Success banner */}
          {success !== null && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              Successfully sent to {success} student{success !== 1 ? 's' : ''}.
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Recipient toggle */}
          {hasAllStudents && (
            <div>
              <label className="block text-sm font-medium mb-2">Send to</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRecipientMode('selected')}
                  disabled={sending}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    recipientMode === 'selected'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                  }`}
                >
                  Selected Students ({recipients.length})
                </button>
                <button
                  onClick={() => setRecipientMode('all')}
                  disabled={sending}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    recipientMode === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                  }`}
                >
                  All Enrolled Students ({allStudents!.length})
                </button>
              </div>
            </div>
          )}

          {/* Recipient list preview */}
          <div>
            <button
              onClick={() => setShowRecipients(!showRecipients)}
              className="text-sm text-text-muted hover:text-text transition-colors flex items-center gap-1"
            >
              <span className="transform transition-transform" style={{ display: 'inline-block', transform: showRecipients ? 'rotate(90deg)' : 'none' }}>
                ▶
              </span>
              {activeRecipients.length} recipient{activeRecipients.length !== 1 ? 's' : ''}
            </button>
            {showRecipients && (
              <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {activeRecipients.map(r => (
                  <div key={r.user_id} className="text-text-muted">
                    {r.name} <span className="text-gray-400">({r.email})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending || success !== null}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending || success !== null}
              rows={8}
              maxLength={5000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Write your message..."
            />
            <p className="text-xs text-text-muted mt-1">{body.length}/5000</p>
          </div>

          {/* Info note */}
          <p className="text-xs text-text-muted bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Emails are sent from C4C Campus with your name. Students can reply directly to your email address.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={sending}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || success !== null || activeRecipients.length === 0}
            className="btn btn-primary"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Sending...
              </span>
            ) : success !== null ? (
              'Sent'
            ) : (
              `Send to ${activeRecipients.length} student${activeRecipients.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
