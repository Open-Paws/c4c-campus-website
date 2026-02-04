/**
 * CourseCard Component Tests
 * 
 * Tests course catalog card display and navigation
 * Reference: TEST_PLAN.md Section 2.2
 */

import { describe, test, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import CourseCard from '@/components/course/CourseCard';
import { mockCourse } from '../fixtures/courses';

describe('CourseCard Component', () => {
  // ==================== RENDERING ====================
  
  test('should display course title and description', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} />);

    // Assert
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.description!)).toBeInTheDocument();
  });
  
  test('should display track and difficulty', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} />);
    
    // Assert
    expect(screen.getByText(/animal_advocacy/i)).toBeInTheDocument();
    expect(screen.getByText(/beginner/i)).toBeInTheDocument();
  });
  
  test('should display default duration weeks', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} />);

    // Assert - Shows "2 weeks" from mockCourse.default_duration_weeks
    expect(screen.getByText(/2 weeks/i)).toBeInTheDocument();
  });
  
  test('should display thumbnail image', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} />);
    
    // Assert
    const thumbnail = screen.getByRole('img', { name: new RegExp(mockCourse.title, 'i') });
    expect(thumbnail).toHaveAttribute('src', mockCourse.thumbnail_url);
  });
  
  // ==================== PROGRESS DISPLAY ====================
  
  test('should show progress bar when enrolled', () => {
    // Arrange - Course with 50% completion
    render(<CourseCard course={mockCourse} progress={50} enrolled={true} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getAllByText(/50%/)[0]).toBeInTheDocument();
  });
  
  test('should not show progress when not enrolled', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} />);
    
    // Assert
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  
  test('should display "Not Started" when enrolled but 0% progress', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} progress={0} enrolled={true} />);
    
    // Assert
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });
  
  test('should display "Completed" when 100% progress', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} progress={100} enrolled={true} />);
    
    // Assert
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });
  
  // ==================== NAVIGATION ====================
  
  test('should navigate to course detail on click', async () => {
    // Arrange
    const user = userEvent.setup({ delay: null });
    const mockNavigate: Mock<(path: string) => void> = vi.fn<(path: string) => void>();
    
    // Mock navigation (would use router in real component)
    render(<CourseCard course={mockCourse} onNavigate={mockNavigate} />);
    
    // Act
    const card = screen.getByRole('article');
    await user.click(card);
    
    // Assert - Navigates to /courses/{slug}
    expect(mockNavigate).toHaveBeenCalledWith(`/courses/${mockCourse.slug}`);
  });
  
  // ==================== PUBLISHED STATUS ====================
  
  test('should not display unpublished courses', () => {
    // Arrange - Unpublished course
    const unpublished = { ...mockCourse, is_published: false };

    // Act
    const { container } = render(<CourseCard course={unpublished} />);

    // Assert - Component renders nothing (or "Draft" badge)
    expect(container).toBeEmptyDOMElement();
  });

  test('should show "Draft" badge for unpublished in teacher view', () => {
    // Arrange
    const unpublished = { ...mockCourse, is_published: false };

    // Act
    render(<CourseCard course={unpublished} teacherView={true} />);

    // Assert
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });
  
  // ==================== EDGE CASES ====================
  
  test('should handle missing thumbnail gracefully', () => {
    // Arrange - Course without thumbnail
    const noThumbnail = { ...mockCourse, thumbnail_url: null };

    // Act
    render(<CourseCard course={noThumbnail} />);

    // Assert - Renders without crash, no image when thumbnail is null
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  
  test('should handle missing description', () => {
    // Arrange
    const noDescription = { ...mockCourse, description: null };
    
    // Act
    render(<CourseCard course={noDescription} />);
    
    // Assert - Still renders without crash
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
  
  test('should clamp progress to 0-100 range', () => {
    // Arrange & Act - Invalid progress values
    const { rerender } = render(<CourseCard course={mockCourse} progress={-10} enrolled={true} />);

    // Assert - Clamped to 0%
    expect(screen.getAllByText(/0%/)[0]).toBeInTheDocument();

    // Act - Rerender with >100%
    rerender(<CourseCard course={mockCourse} progress={150} enrolled={true} />);

    // Assert - Clamped to 100%
    expect(screen.getAllByText(/100%/)[0]).toBeInTheDocument();
  });
});