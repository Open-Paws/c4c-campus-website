/**
 * Email notification utilities using Resend for C4C Campus
 * @module lib/email-notifications
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY);

const FROM_EMAIL = 'C4C Campus <notifications@updates.codeforcompassion.com>';

export interface AssignmentSubmittedEmailData {
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  courseName: string;
  submittedAt: string;
  isLate: boolean;
}

export interface AssignmentGradedEmailData {
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  courseName: string;
  grade: number;
  maxPoints: number;
  feedback?: string;
  gradedAt: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
  program: string;
}

export interface EnrollmentEmailData {
  studentName: string;
  studentEmail: string;
  courseName: string;
  cohortName?: string;
  startDate?: string;
}

export interface ApplicationReceivedEmailData {
  name: string;
  email: string;
  program: 'bootcamp' | 'accelerator' | 'hackathon';
  location?: string;
  discord?: string;
  motivation?: string;
  projectName?: string;
  projectDescription?: string;
}

// Admin email for notifications
const ADMIN_EMAIL = 'info@codeforcompassion.com';

/**
 * Send email notification when student submits assignment
 * @param teacherEmail - Teacher's email address
 * @param data - Submission data
 */
export async function sendAssignmentSubmittedEmail(
  teacherEmail: string,
  data: AssignmentSubmittedEmailData
): Promise<void> {
  const { studentName, assignmentTitle, courseName, submittedAt, isLate } = data;

  const lateIndicator = isLate ? ' (LATE)' : '';
  const submissionDate = new Date(submittedAt).toLocaleString();

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: teacherEmail,
      subject: `New Submission: ${assignmentTitle} - ${studentName}${lateIndicator}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">New Assignment Submission</h2>

          <p>A student has submitted an assignment:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Student</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Assignment</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${assignmentTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Course</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${courseName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Submitted</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${submissionDate}</td>
            </tr>
            ${isLate ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Status</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #f59e0b; font-weight: 500;">Late Submission</td>
            </tr>
            ` : ''}
          </table>

          <p>
            <a href="${process.env.SITE_URL || 'https://codeforcompassion.com'}/teacher"
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Review Submission
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #9ca3af; font-size: 14px;">
            C4C Campus - AI Development Accelerator for Animal Liberation
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send assignment submitted email:', error);
  }
}

/**
 * Send email notification when assignment is graded
 * @param data - Grading data
 */
export async function sendAssignmentGradedEmail(
  data: AssignmentGradedEmailData
): Promise<void> {
  const { studentName, studentEmail, assignmentTitle, courseName, grade, maxPoints, feedback, gradedAt } = data;

  const percentage = Math.round((grade / maxPoints) * 100);
  const gradeColor = percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
  const gradedDate = new Date(gradedAt).toLocaleString();

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: studentEmail,
      subject: `Assignment Graded: ${assignmentTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Assignment Graded</h2>

          <p>Hi ${studentName},</p>

          <p>Your assignment has been graded:</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">${assignmentTitle}</h3>
            <p style="margin: 0; color: #6b7280;">${courseName}</p>

            <div style="margin-top: 20px; font-size: 36px; font-weight: bold; color: ${gradeColor};">
              ${grade}/${maxPoints}
              <span style="font-size: 18px; color: #6b7280;"> (${percentage}%)</span>
            </div>
          </div>

          ${feedback ? `
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #10b981;">Feedback</h4>
            <p style="margin: 0;">${feedback}</p>
          </div>
          ` : ''}

          <p style="color: #6b7280; font-size: 14px;">Graded on: ${gradedDate}</p>

          <p>
            <a href="${process.env.SITE_URL || 'https://codeforcompassion.com'}/dashboard"
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Details
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #9ca3af; font-size: 14px;">
            C4C Campus - AI Development Accelerator for Animal Liberation
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send assignment graded email:', error);
  }
}

/**
 * Send welcome email to newly approved applicant
 * @param data - Welcome email data
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const { name, email, program } = data;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to C4C Campus ${program}!`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Welcome to C4C Campus!</h2>

          <p>Hi ${name},</p>

          <p>Congratulations! Your application to the <strong>${program}</strong> program has been approved.</p>

          <p>You're now part of a community of builders using AI to accelerate animal liberation. Here's what to do next:</p>

          <ol style="line-height: 1.8;">
            <li>Log in to your dashboard</li>
            <li>Complete your profile</li>
            <li>Browse available courses</li>
            <li>Join our community channels</li>
          </ol>

          <p>
            <a href="${process.env.SITE_URL || 'https://codeforcompassion.com'}/dashboard"
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Go to Dashboard
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #9ca3af; font-size: 14px;">
            C4C Campus - AI Development Accelerator for Animal Liberation
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

/**
 * Send enrollment confirmation email
 * @param data - Enrollment data
 */
export async function sendEnrollmentEmail(data: EnrollmentEmailData): Promise<void> {
  const { studentName, studentEmail, courseName, cohortName, startDate } = data;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: studentEmail,
      subject: `Enrolled: ${courseName}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Enrollment Confirmed!</h2>

          <p>Hi ${studentName},</p>

          <p>You've been enrolled in:</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${courseName}</h3>
            ${cohortName ? `<p style="margin: 0; color: #6b7280;">Cohort: ${cohortName}</p>` : ''}
            ${startDate ? `<p style="margin: 10px 0 0 0; color: #10b981;">Starts: ${new Date(startDate).toLocaleDateString()}</p>` : ''}
          </div>

          <p>
            <a href="${process.env.SITE_URL || 'https://codeforcompassion.com'}/courses"
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Start Learning
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #9ca3af; font-size: 14px;">
            C4C Campus - AI Development Accelerator for Animal Liberation
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send enrollment email:', error);
  }
}

/**
 * Send notification to admin when new application is received
 * @param data - Application data
 */
export async function sendApplicationReceivedEmail(data: ApplicationReceivedEmailData): Promise<void> {
  const { name, email, program, location, discord, motivation, projectName, projectDescription } = data;

  const programLabel = program === 'bootcamp' ? 'Weekend Bootcamp' :
                       program === 'accelerator' ? 'Full-Time Accelerator' : 'Hackathon';

  const submittedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `New ${programLabel} Application: ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF00FF;">New Application Received</h2>

          <p>A new application has been submitted to the <strong>${programLabel}</strong>.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Name</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <a href="mailto:${email}" style="color: #FF00FF;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Program</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${programLabel}</td>
            </tr>
            ${location ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Location</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${location}</td>
            </tr>
            ` : ''}
            ${discord ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Discord</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${discord}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Submitted</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${submittedAt}</td>
            </tr>
          </table>

          ${motivation ? `
          <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Motivation</h4>
            <p style="margin: 0; white-space: pre-wrap;">${motivation}</p>
          </div>
          ` : ''}

          ${program === 'accelerator' && projectName ? `
          <div style="background: #fdf4ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #a855f7;">Project: ${projectName}</h4>
            ${projectDescription ? `<p style="margin: 0; white-space: pre-wrap;">${projectDescription}</p>` : ''}
          </div>
          ` : ''}

          <p>
            <a href="${process.env.SITE_URL || 'https://codeforcompassion.com'}/admin/applications-review"
               style="display: inline-block; background: #FF00FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Review Application
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #9ca3af; font-size: 14px;">
            C4C Campus - AI Development Accelerator for Animal Liberation
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send application received email:', error);
  }
}
