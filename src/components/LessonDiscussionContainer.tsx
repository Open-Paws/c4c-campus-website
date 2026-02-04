import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DiscussionThread } from './DiscussionThread';

// Removed manual createClient to use shared instance


interface LessonDiscussionContainerProps {
    slug: string;
}

export const LessonDiscussionContainer: React.FC<LessonDiscussionContainerProps> = ({
    slug
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        lessonId: number;
        courseId: number;
        userId: string;
        cohortId: string;
        isTeacher: boolean;
    } | null>(null);

    useEffect(() => {
        async function init() {
            try {
                // 1. Check Authentication
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // 2. Parallelize independent queries (lesson, application, cohort_enrollments)
                const [lessonResult, applicationResult, cohortEnrollmentsResult] = await Promise.all([
                    // Fetch Lesson and Course ID
                    supabase
                        .from('lessons')
                        .select(`
                            id,
                            module_id,
                            modules (
                              course_id
                            )
                        `)
                        .eq('slug', slug)
                        .single(),
                    // Check if teacher by role field
                    supabase
                        .from('applications')
                        .select('email, role')
                        .eq('user_id', user.id)
                        .single(),
                    // Get cohort enrollments
                    supabase
                        .from('cohort_enrollments')
                        .select(`
                            cohort_id,
                            cohorts (
                              course_id
                            )
                        `)
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                ]);

                const { data: lesson, error: lessonError } = lessonResult;
                const { data: application } = applicationResult;
                const { data: allCohortEnrollments } = cohortEnrollmentsResult;

                if (lessonError || !lesson) {
                    console.error('Error fetching lesson for discussion:', lessonError);
                    setLoading(false);
                    return;
                }

                const lessonId = lesson.id;
                // Handle modules as potentially array or object depending on Supabase client version/inference
                const moduleData = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;
                const courseId = moduleData?.course_id;

                if (!courseId) {
                    console.error('Course ID not found for lesson');
                    setLoading(false);
                    return;
                }

                const isTeacher = application?.role === 'teacher';

                // Find enrollment for this course
                const enrollment = allCohortEnrollments?.find((e: any) => e.cohorts?.course_id === courseId);
                let userCohortId = enrollment?.cohort_id;

                // Fallback to Legacy Enrollments (only if needed)
                if (!userCohortId) {
                    const { data: legacyEnrollment } = await supabase
                        .from('enrollments')
                        .select('cohort_id')
                        .eq('user_id', user.id)
                        .eq('course_id', courseId)
                        .limit(1)
                        .maybeSingle();

                    if (legacyEnrollment) {
                        userCohortId = legacyEnrollment.cohort_id;
                    }
                }

                if (userCohortId) {
                    setData({
                        lessonId,
                        courseId,
                        userId: user.id,
                        cohortId: userCohortId,
                        isTeacher
                    });
                }
            } catch (err) {
                console.error('Error initializing discussion:', err);
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="card">
            <DiscussionThread
                lessonId={data.lessonId}
                cohortId={data.cohortId}
                currentUserId={data.userId}
                isTeacher={data.isTeacher}
            />
        </div>
    );
};
