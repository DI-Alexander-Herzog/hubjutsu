import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LearningCourseForm from './Form';

export default function LearningCourseEdit({ learning_course }: { learning_course: any }) {
    return (
        <AuthenticatedLayout
            title="Learning Course"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Courses', url: route('settings.learningcourses.index') },
                { label: learning_course?.name || 'Course' },
            ]}
        >
            <LearningCourseForm learning_course={learning_course} disabled={false} />
        </AuthenticatedLayout>
    );
}
