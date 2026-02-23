import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LearningCourseForm from './Form';
import CourseStructureView from './CourseStructureView';

export default function LearningCourseView({ learning_course }: { learning_course: any }) {
    return (
        <AuthenticatedLayout
            title="Learning Course"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Courses', url: route('settings.learningcourses.index') },
                { label: learning_course?.name || 'Course' },
            ]}
        >
            <LearningCourseForm learning_course={learning_course} disabled={true} />
            <CourseStructureView modules={learning_course?.modules || []} />
        </AuthenticatedLayout>
    );
}
