/**
 * Course, Module, and Lesson test fixtures
 * Schema from BOOTCAMP_ARCHITECTURE.md lines 193-290
 */

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  track: 'animal_advocacy' | 'climate' | 'ai_safety' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  thumbnail_url: string;
  default_duration_weeks: number;
  is_published: boolean;
  is_cohort_based: boolean;
  enrollment_type: 'open' | 'cohort_only' | 'hybrid';
  created_by: string; // UUID
  created_at: string; // ISO timestamp
  updated_at: string;
}

export interface Module {
  id: number;
  course_id: number;
  title: string;
  description: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: number;
  module_id: number;
  title: string;
  slug: string;
  video_url: string;
  youtube_url: string | null;
  duration_minutes: number;
  content: string;
  resources: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  order_index: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

// Mock Course 1: n8n Basics (beginner, published)
export const mockCourse: Course = {
  id: 1,
  title: 'n8n Workflow Automation Basics',
  slug: 'n8n-basics',
  description: 'Learn to build no-code automation workflows for animal advocacy campaigns',
  track: 'animal_advocacy',
  difficulty: 'beginner',
  thumbnail_url: 'thumbnails/course-1-n8n-basics.jpg',
  default_duration_weeks: 2,
  is_published: true,
  is_cohort_based: false,
  enrollment_type: 'open' as const,
  created_by: '550e8400-e29b-41d4-a716-446655440000', // mockTeacher.id
  created_at: '2025-01-20T00:00:00Z',
  updated_at: '2025-01-20T00:00:00Z',
};

// Mock Course 2: Advanced n8n (intermediate, unpublished)
export const mockCourseUnpublished: Course = {
  id: 2,
  title: 'Advanced n8n Workflows',
  slug: 'n8n-advanced',
  description: 'Build complex multi-step automation workflows',
  track: 'animal_advocacy',
  difficulty: 'intermediate',
  thumbnail_url: 'thumbnails/course-2-n8n-advanced.jpg',
  default_duration_weeks: 3,
  is_published: false, // Draft course
  is_cohort_based: false,
  enrollment_type: 'open' as const,
  created_by: '550e8400-e29b-41d4-a716-446655440000',
  created_at: '2025-01-25T00:00:00Z',
  updated_at: '2025-01-25T00:00:00Z',
};

// Mock Module 1: Introduction to n8n
export const mockModule: Module = {
  id: 1,
  course_id: 1,
  title: 'Introduction to n8n',
  description: 'Get started with n8n workflow builder and core concepts',
  order_index: 1,
  created_at: '2025-01-20T00:00:00Z',
};

// Mock Module 2: Building Your First Workflow
export const mockModule2: Module = {
  id: 2,
  course_id: 1,
  title: 'Building Your First Workflow',
  description: 'Create a simple automation workflow from scratch',
  order_index: 2,
  created_at: '2025-01-20T00:00:00Z',
};

// Mock Lesson 1: What is n8n?
export const mockLesson: Lesson = {
  id: 1,
  module_id: 1,
  title: 'What is n8n?',
  slug: 'what-is-n8n',
  video_url: 'videos/course-1/lesson-1.mp4',
  youtube_url: null,
  duration_minutes: 7,
  content: '# Introduction to n8n\n\nn8n is a **workflow automation tool** that helps activists build powerful automations without code.\n\n## Why n8n for advocacy?\n\n- Free and open source\n- 400+ integrations\n- Visual workflow builder\n- Self-hostable',
  resources: [
    {
      name: 'Starter Workflow Template.json',
      path: 'resources/course-1/starter-workflow.json',
      size: 2048,
    },
    {
      name: 'n8n Cheat Sheet.pdf',
      path: 'resources/course-1/cheatsheet.pdf',
      size: 512000,
    },
  ],
  order_index: 1,
  is_preview: false,
  created_at: '2025-01-20T00:00:00Z',
  updated_at: '2025-01-20T00:00:00Z',
};

// Mock Lesson 2: Installing n8n
export const mockLesson2: Lesson = {
  id: 2,
  module_id: 1,
  title: 'Installing n8n',
  slug: 'installing-n8n',
  video_url: 'videos/course-1/lesson-2.mp4',
  youtube_url: null,
  duration_minutes: 10,
  content: '# Installing n8n\n\nLearn how to set up n8n locally using Docker.',
  resources: [
    {
      name: 'docker-compose.yml',
      path: 'resources/course-1/docker-compose.yml',
      size: 1024,
    },
  ],
  order_index: 2,
  is_preview: false,
  created_at: '2025-01-20T00:00:00Z',
  updated_at: '2025-01-20T00:00:00Z',
};

// Mock Lesson 3 in Module 2
export const mockLesson3: Lesson = {
  id: 3,
  module_id: 2,
  title: 'Your First Workflow',
  slug: 'first-workflow',
  video_url: 'videos/course-1/lesson-3.mp4',
  youtube_url: null,
  duration_minutes: 15,
  content: '# Building Your First Workflow\n\nCreate a simple email automation.',
  resources: [],
  order_index: 1,
  is_preview: false,
  created_at: '2025-01-20T00:00:00Z',
  updated_at: '2025-01-20T00:00:00Z',
};

// Array of all lessons (for LessonNav tests)
export const mockLessons: Lesson[] = [mockLesson, mockLesson2, mockLesson3];

// Course with nested modules and lessons (for integration tests)
export const mockCourseWithNested = {
  ...mockCourse,
  modules: [
    {
      ...mockModule,
      lessons: [mockLesson, mockLesson2],
    },
    {
      ...mockModule2,
      lessons: [mockLesson3],
    },
  ],
};

// Course with progress for CourseCard tests
export const mockCourseWithProgress = {
  ...mockCourse,
  progress: 50, // 50% completion
};

// Array of courses for catalog tests
export const mockCourses: Course[] = [
  mockCourse,
  {
    id: 3,
    title: 'Advocacy Campaign Automation',
    slug: 'campaign-automation',
    description: 'Automate social media campaigns and email outreach',
    track: 'animal_advocacy',
    difficulty: 'intermediate',
    thumbnail_url: 'thumbnails/course-3-campaigns.jpg',
    default_duration_weeks: 3,
    is_published: true,
    is_cohort_based: false,
    enrollment_type: 'open' as const,
    created_by: '550e8400-e29b-41d4-a716-446655440000',
    created_at: '2025-01-22T00:00:00Z',
    updated_at: '2025-01-22T00:00:00Z',
  },
  {
    id: 4,
    title: 'Climate Data Analysis',
    slug: 'climate-data',
    description: 'Build workflows to analyze climate data',
    track: 'climate',
    difficulty: 'advanced',
    thumbnail_url: 'thumbnails/course-4-climate.jpg',
    default_duration_weeks: 4,
    is_published: true,
    is_cohort_based: false,
    enrollment_type: 'open' as const,
    created_by: '550e8400-e29b-41d4-a716-446655440000',
    created_at: '2025-01-23T00:00:00Z',
    updated_at: '2025-01-23T00:00:00Z',
  },
];