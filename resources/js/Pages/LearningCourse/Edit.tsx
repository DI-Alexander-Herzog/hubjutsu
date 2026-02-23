import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LearningCourseForm from './Form';
import CourseStructureEditor from './CourseStructureEditor';

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
            <CourseStructureEditor
                learningCourseId={learning_course?.id}
                initialModules={learning_course?.modules || []}
            />
        </AuthenticatedLayout>
    );
}
