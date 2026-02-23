import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import Separator from '@/Components/Separator';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';

export default function LearningCourseForm({ learning_course, disabled = true }: { learning_course: any; disabled?: boolean }) {
    return (
        <FormContext data={learning_course} model={'learning_course'} readonly={disabled}>
            <FormContainer>
                <FormSection title="Allgemein" subtitle="Grunddaten für den Kurs">
                    <Input inputName="name" type="text" label="Name" />
                    <Input inputName="slug" type="text" label="Slug" />
                    <Input inputName="description" type="textarea" label="Description" rows={5} />
                    <Input inputName="active" type="boolean" label="Active" />
                </FormSection>

                <Separator />

                <FormSection title="Media" subtitle="Kursbilder und Vorschau">
                    <Input inputName="cover" type="media" accept="image/*" label="Cover" />
                </FormSection>
            </FormContainer>

            <FormSection boxed={true}>
                <FormContextSubmitButton editLink={route('settings.learningcourses.edit', learning_course)}>
                    Speichern
                </FormContextSubmitButton>
            </FormSection>
        </FormContext>
    );
}
