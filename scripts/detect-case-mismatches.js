#!/usr/bin/env node
/**
 * Case Convention Mismatch Detector
 *
 * Scans the codebase for camelCase/snake_case inconsistencies in database-related code.
 * This script helps catch common mistakes where developers use camelCase field names
 * in Supabase queries instead of the required snake_case.
 *
 * Usage:
 *   npm run db:case:check
 *
 * The script will:
 * 1. Scan src/ files for Supabase query patterns
 * 2. Detect camelCase field names in database contexts
 * 3. Suggest snake_case alternatives
 * 4. Report inconsistencies with file path and line number
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'src');

// Directories to scan
const SCAN_DIRS = [
  'pages/api',
  'components',
  'lib',
  'pages',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Common camelCase to snake_case mappings for database fields
const CASE_MAPPINGS = {
  // ID fields
  'userId': 'user_id',
  'courseId': 'course_id',
  'lessonId': 'lesson_id',
  'moduleId': 'module_id',
  'cohortId': 'cohort_id',
  'quizId': 'quiz_id',
  'assignmentId': 'assignment_id',
  'questionId': 'question_id',
  'attemptId': 'attempt_id',
  'submissionId': 'submission_id',
  'enrollmentId': 'enrollment_id',
  'threadId': 'thread_id',
  'messageId': 'message_id',
  'templateId': 'template_id',
  'conversationId': 'conversation_id',

  // Timestamp fields
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'enrolledAt': 'enrolled_at',
  'completedAt': 'completed_at',
  'startedAt': 'started_at',
  'submittedAt': 'submitted_at',
  'gradedAt': 'graded_at',
  'lastActivityAt': 'last_activity_at',
  'lastAccessedAt': 'last_accessed_at',
  'publishAt': 'publish_at',
  'expiresAt': 'expires_at',
  'paidAt': 'paid_at',
  'canceledAt': 'canceled_at',

  // Date fields
  'startDate': 'start_date',
  'endDate': 'end_date',
  'dueDate': 'due_date',
  'unlockDate': 'unlock_date',
  'lockDate': 'lock_date',
  'issuedDate': 'issued_date',
  'expiryDate': 'expiry_date',
  'completionDate': 'completion_date',

  // Count/numeric fields
  'maxStudents': 'max_students',
  'maxAttempts': 'max_attempts',
  'maxPoints': 'max_points',
  'maxSubmissions': 'max_submissions',
  'maxFileSizeMb': 'max_file_size_mb',
  'timeLimitMinutes': 'time_limit_minutes',
  'timeLimit': 'time_limit_minutes',
  'passingScore': 'passing_score',
  'latePenaltyPercent': 'late_penalty_percent',
  'orderIndex': 'order_index',
  'attemptNumber': 'attempt_number',
  'submissionNumber': 'submission_number',
  'completedLessons': 'completed_lessons',
  'progressPercentage': 'progress_percentage',
  'durationMinutes': 'duration_minutes',
  'defaultDurationWeeks': 'default_duration_weeks',
  'totalPoints': 'total_points',
  'pointsEarned': 'points_earned',
  'timeTakenSeconds': 'time_taken_seconds',
  'videoPositionSeconds': 'video_position_seconds',
  'timeSpentSeconds': 'time_spent_seconds',
  'watchCount': 'watch_count',
  'tokensUsed': 'tokens_used',
  'usageCount': 'usage_count',
  'fileSizeBytes': 'file_size_bytes',

  // Boolean fields
  'isPublished': 'is_published',
  'isPreview': 'is_preview',
  'isCohortBased': 'is_cohort_based',
  'isLate': 'is_late',
  'isPinned': 'is_pinned',
  'isLocked': 'is_locked',
  'isTeacherResponse': 'is_teacher_response',
  'isPublic': 'is_public',
  'isInUse': 'is_in_use',
  'isRead': 'is_read',
  'isDefault': 'is_default',
  'allowLateSubmissions': 'allow_late_submissions',
  'allowResubmission': 'allow_resubmission',
  'randomizeQuestions': 'randomize_questions',
  'showCorrectAnswers': 'show_correct_answers',
  'showResultsImmediately': 'show_results_immediately',
  'emailConfirm': 'email_confirm',
  'cancelAtPeriodEnd': 'cancel_at_period_end',

  // String fields
  'fullName': 'full_name',
  'displayName': 'display_name',
  'avatarUrl': 'avatar_url',
  'thumbnailUrl': 'thumbnail_url',
  'videoUrl': 'video_url',
  'fileUrl': 'file_url',
  'fileName': 'file_name',
  'fileType': 'file_type',
  'filePath': 'file_path',
  'mimeType': 'mime_type',
  'altText': 'alt_text',
  'enrollmentType': 'enrollment_type',
  'questionType': 'question_type',
  'questionText': 'question_text',
  'correctAnswer': 'correct_answer',
  'answerExplanation': 'answer_explanation',
  'submissionText': 'submission_text',
  'gradingStatus': 'grading_status',
  'eventType': 'event_type',
  'paymentType': 'payment_type',
  'studentName': 'student_name',
  'courseTitle': 'course_title',
  'certificateCode': 'certificate_code',
  'finalGrade': 'final_grade',
  'pdfUrl': 'pdf_url',
  'ipAddress': 'ip_address',
  'userAgent': 'user_agent',
  'sessionId': 'session_id',
  'stripePaymentId': 'stripe_payment_id',
  'stripeCustomerId': 'stripe_customer_id',
  'stripeSubscriptionId': 'stripe_subscription_id',
  'currentPeriodStart': 'current_period_start',
  'currentPeriodEnd': 'current_period_end',
  'templateHtml': 'template_html',
  'templateVariables': 'template_variables',
  'malwareScanStatus': 'malware_scan_status',
  'malwareScanAt': 'malware_scan_at',
  'technicalExperience': 'technical_experience',
  'projectName': 'project_name',
  'projectDescription': 'project_description',
  'prototypeLink': 'prototype_link',
  'techStack': 'tech_stack',
  'targetUsers': 'target_users',
  'productionNeeds': 'production_needs',
  'teamSize': 'team_size',
  'currentStage': 'current_stage',
  'assignmentDate': 'assignment_date',
  'reviewedAt': 'reviewed_at',
  'reviewedBy': 'reviewed_by',
  'assignedReviewerId': 'assigned_reviewer_id',
  'createdBy': 'created_by',
  'gradedBy': 'graded_by',
  'uploadedBy': 'uploaded_by',

  // JSONB fields
  'answersJson': 'answers_json',
  'rubricScores': 'rubric_scores',
  'eventData': 'event_data',
  'participantIds': 'participant_ids',
  'readBy': 'read_by',
  'allowedFileTypes': 'allowed_file_types',
  'fileUrls': 'file_urls',

  // Reference fields
  'parentId': 'parent_id',
  'forumPostId': 'forum_post_id',
  'senderId': 'sender_id',
  'targetId': 'target_id',
};

// Patterns to detect database query contexts
const DATABASE_PATTERNS = [
  // Supabase client methods
  /\.from\s*\(\s*['"`]\w+['"`]\s*\)/,
  /\.select\s*\(/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.upsert\s*\(/,
  /\.delete\s*\(/,
  /\.eq\s*\(/,
  /\.neq\s*\(/,
  /\.gt\s*\(/,
  /\.gte\s*\(/,
  /\.lt\s*\(/,
  /\.lte\s*\(/,
  /\.filter\s*\(/,
  /\.order\s*\(/,
  /\.match\s*\(/,
  /supabase/i,
  /supabaseAdmin/i,
];

// Patterns that indicate the context is NOT a database query
const NON_DATABASE_PATTERNS = [
  /^import\s/,
  /^export\s/,
  /^\s*\/\//,
  /^\s*\*/,
  /interface\s+\w+/,
  /type\s+\w+\s*=/,
  /function\s+\w+/,
  /const\s+\w+\s*:\s*\w+/,
  /React\./,
  /useState/,
  /useEffect/,
  /className/,
  /onClick/,
  /onChange/,
  /onSubmit/,
  // Supabase realtime channels use arbitrary names, not database fields
  /\.channel\s*\(/,
  // URL paths in fetch/API calls are not database fields
  /fetch\s*\(\s*`/,
  /fetch\s*\(\s*['"`]\/api\//,
  // React dependency arrays at end of useEffect/useMemo/useCallback
  /\],?\s*\[[\w\s,]*\]\s*\)\s*;?\s*$/,
  // React dependency arrays (pattern: }, [varName, varName, ...]);)
  /\}\s*,\s*\[[\w\s,]+\]\s*\)\s*;/,
  // Function/constructor parameters
  /constructor\s*\(/,
  /=>\s*\{/,
  // Template literal channel names
  /channel.*\$\{/,
];

/**
 * Check if a line is likely in a database query context
 */
function isInDatabaseContext(line, previousLines) {
  // Check if this line has database patterns
  for (const pattern of DATABASE_PATTERNS) {
    if (pattern.test(line)) return true;
  }

  // Check previous lines for context
  const contextWindow = previousLines.slice(-5).join('\n');
  for (const pattern of DATABASE_PATTERNS) {
    if (pattern.test(contextWindow)) return true;
  }

  return false;
}

/**
 * Check if a line should be skipped
 */
function shouldSkipLine(line) {
  for (const pattern of NON_DATABASE_PATTERNS) {
    if (pattern.test(line)) return true;
  }
  return false;
}

/**
 * Detect camelCase field names in a line
 */
function detectCamelCaseFields(line, lineNumber, filePath, previousLines) {
  const issues = [];

  // Skip lines that aren't in database context
  if (shouldSkipLine(line)) return issues;
  if (!isInDatabaseContext(line, previousLines)) return issues;

  // Check for each camelCase pattern
  for (const [camelCase, snakeCase] of Object.entries(CASE_MAPPINGS)) {
    // Build regex to match the camelCase field in various contexts
    const patterns = [
      // String literals: 'userId', "userId", `userId`
      new RegExp(`['"\`]${camelCase}['"\`]`, 'g'),
      // Object keys: { userId: ... } or { userId, ... }
      new RegExp(`[{,]\\s*${camelCase}\\s*[,:}]`, 'g'),
      // Property access in filter context: .eq('userId', ...)
      new RegExp(`\\.(?:eq|neq|gt|gte|lt|lte|filter|order|is|in|contains|ilike|like)\\s*\\(\\s*['"\`]${camelCase}['"\`]`, 'g'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          camelCase,
          snakeCase,
          context: line.trim().substring(0, 100),
        });
        break; // Only report once per camelCase field per line
      }
    }
  }

  return issues;
}

/**
 * Scan a file for case convention mismatches
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  const previousLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const lineIssues = detectCamelCaseFields(line, lineNumber, filePath, previousLines);
    issues.push(...lineIssues);

    previousLines.push(line);
    if (previousLines.length > 10) {
      previousLines.shift();
    }
  }

  return issues;
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip non-relevant directories
      if (!['node_modules', '.git', 'dist', 'build', '.next', '.astro'].includes(entry.name)) {
        scanDirectory(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Main function
 */
function main() {
  console.log('Case Convention Mismatch Detector\n');
  console.log('='.repeat(50));

  // Collect files to scan
  const filesToScan = [];
  for (const subDir of SCAN_DIRS) {
    const fullDir = path.join(SRC_DIR, subDir);
    scanDirectory(fullDir, filesToScan);
  }

  console.log(`\nScanning ${filesToScan.length} files for case convention issues...`);

  // Scan all files
  const allIssues = [];
  let filesWithIssues = 0;

  for (const filePath of filesToScan) {
    try {
      const issues = scanFile(filePath);
      if (issues.length > 0) {
        filesWithIssues++;
        allIssues.push(...issues);
      }
    } catch (err) {
      console.error(`Error reading ${filePath}: ${err.message}`);
    }
  }

  // Report results
  console.log('\n' + '='.repeat(50));

  if (allIssues.length === 0) {
    console.log('\n✓ No case convention mismatches found');
    console.log('\nAll database queries use correct snake_case field names.');
    process.exit(0);
  }

  console.log(`\n✗ Found ${allIssues.length} potential case convention mismatches in ${filesWithIssues} files\n`);

  // Group issues by file
  const issuesByFile = {};
  for (const issue of allIssues) {
    const relPath = path.relative(path.join(__dirname, '..'), issue.file);
    if (!issuesByFile[relPath]) {
      issuesByFile[relPath] = [];
    }
    issuesByFile[relPath].push(issue);
  }

  // Print issues grouped by file
  console.log('Case Convention Mismatches:\n');
  for (const [file, issues] of Object.entries(issuesByFile)) {
    console.log(`  ${file}:`);
    for (const issue of issues) {
      console.log(`    Line ${issue.line}: "${issue.camelCase}" → "${issue.snakeCase}"`);
      if (issue.context) {
        console.log(`      Context: ${issue.context}...`);
      }
    }
    console.log('');
  }

  // Count unique camelCase patterns
  const camelCaseCounts = {};
  for (const issue of allIssues) {
    camelCaseCounts[issue.camelCase] = (camelCaseCounts[issue.camelCase] || 0) + 1;
  }

  // Summary
  console.log('='.repeat(50));
  console.log('\nSummary:');
  console.log(`  Total mismatches: ${allIssues.length}`);
  console.log(`  Files affected: ${filesWithIssues}`);

  // Top offenders
  const sortedCounts = Object.entries(camelCaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\n  Most common mismatches:');
  for (const [field, count] of sortedCounts) {
    console.log(`    ${field} → ${CASE_MAPPINGS[field]}: ${count} occurrences`);
  }

  console.log('\nTo fix these issues:');
  console.log('  1. Use snake_case for all database field names in Supabase queries');
  console.log('  2. Example: .eq("userId", x) → .eq("user_id", x)');
  console.log('  3. Example: { userId: x } → { user_id: x }');
  console.log('  4. TypeScript types from generated.ts already use snake_case');

  // Exit with error if issues found
  process.exit(1);
}

main();
