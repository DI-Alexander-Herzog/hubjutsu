import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import { FormContext, FormContextSubmitButton, useFormContext } from '@/Components/FormContext';

export default function LearningCourseForm({ learning_course, disabled = true }: { learning_course: any; disabled?: boolean }) {
    return (
        <FormContext data={learning_course} model={'learning_course'} readonly={disabled}>
            <LearningCourseFormBody learning_course={learning_course} />
        </FormContext>
    );
}

function LearningCourseFormBody({ learning_course }: { learning_course: any }) {
    const { form } = useFormContext();
    const editorMediaItems = form.data?.body_images || form.data?.bodyImages || [];

    return (
        <FormContainer>
            <FormSection title="Allgemein" subtitle="Grunddaten für den Kurs">
                <Input inputName="name" type="text" label="Name" />
                <Input inputName="slug" type="text" label="Slug" disabled />
                <Input inputName="description" type="textarea" label="Description" rows={5} />
                <Input
                    inputName="body"
                    type="html"
                    label="Body"
                    placeholder="Schreibe den Kursinhalt..."
                    helperText="Unterstuetzt Fett, Kursiv, Links, Listen und Undo/Redo."
                    mediaItems={editorMediaItems}
                />
                <Input
                    inputName="body_images"
                    type="media"
                    accept="image/*"
                    multiple
                    maxFiles={50}
                    label="Body Images"
                    helperText="Diese Bilder stehen im HTML-Editor zur Verfügung (private Medien)."
                />
                <Input inputName="active" type="boolean" label="Active" />
            </FormSection>

            <div className="my-4 h-px bg-background-700 dark:bg-gray-700" />

            <FormSection title="Media" subtitle="Kursbilder und Vorschau">
                <Input inputName="cover" type="media" accept="image/*" label="Cover" />
            </FormSection>
            
            <div className="pt-2">
                <FormContextSubmitButton editLink={route('settings.learningcourses.edit', learning_course)}>
                    Speichern
                </FormContextSubmitButton>
            </div>
        </FormContainer>
    );
}
