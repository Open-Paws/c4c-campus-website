/**
 * CommentInput Component Tests
 *
 * Tests for rich text editor and comment submission
 * Note: Some tests are skipped due to Tiptap/ProseMirror DOM issues in test environment
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentInput } from '../../src/components/CommentInput';

describe('CommentInput Component', () => {
  let onSubmit: Mock<(content: string) => void>;

  beforeEach(() => {
    onSubmit = vi.fn<(content: string) => void>();
  });

  test('shows submit button with correct label', () => {
    render(
      <CommentInput
        onSubmit={onSubmit}
        submitLabel="Post Comment"
      />
    );

    expect(screen.getByText('Post Comment')).toBeInTheDocument();
  });

  test('shows cancel button when showCancel is true', () => {
    const onCancel = vi.fn();

    render(
      <CommentInput
        onSubmit={onSubmit}
        onCancel={onCancel}
        showCancel={true}
      />
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('submit button is disabled when content is empty', () => {
    render(<CommentInput onSubmit={onSubmit} />);

    const submitButton = screen.getByText('Post Comment');
    expect(submitButton).toBeDisabled();
  });

  test('displays character count', () => {
    render(<CommentInput onSubmit={onSubmit} />);

    expect(screen.getByText('0/2000')).toBeInTheDocument();
  });

  test('renders formatting toolbar buttons', () => {
    render(<CommentInput onSubmit={onSubmit} />);

    // Check for bold, italic, lists buttons (Link button was removed)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5); // Submit + formatting buttons
  });

  test('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <CommentInput
        onSubmit={onSubmit}
        onCancel={onCancel}
        showCancel={true}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  test('renders with custom submit label', () => {
    render(
      <CommentInput
        onSubmit={onSubmit}
        submitLabel="Post Reply"
      />
    );

    expect(screen.getByText('Post Reply')).toBeInTheDocument();
  });

  test('renders without cancel button by default', () => {
    render(<CommentInput onSubmit={onSubmit} />);

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });
});
