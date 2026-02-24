import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';

export default function LearningCourseForm({ learning_course, disabled = true }: { learning_course: any; disabled?: boolean }) {
    return (
        <FormContext data={learning_course} model={'learning_course'} readonly={disabled}>
            <FormContainer>
                <FormSection title="Allgemein" subtitle="Grunddaten für den Kurs">
                    <Input inputName="name" type="text" label="Name" />
                    <Input inputName="slug" type="text" label="Slug" />
                    <Input inputName="description" type="textarea" label="Description" rows={5} />
                    <Input inputName="body" type="textarea" label="Body" rows={10} />
                    <Input inputName="active" type="boolean" label="Active" />
                </FormSection>

                <div className="my-4 h-px bg-gray-200 dark:bg-gray-700" />

                <FormSection title="Media" subtitle="Kursbilder und Vorschau">
                    <Input inputName="cover" type="media" accept="image/*" label="Cover" />
                </FormSection>
                
                <div className="pt-2">
                    <FormContextSubmitButton editLink={route('settings.learningcourses.edit', learning_course)}>
                        Speichern
                    </FormContextSubmitButton>
                </div>
            </FormContainer>
        </FormContext>
    );
}
