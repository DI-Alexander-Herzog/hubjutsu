import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';

export default function LearningLectionForm({
    learning_lection,
    disabled = true,
}: {
    learning_lection: any;
    disabled?: boolean;
}) {
    return (
        <FormContext data={learning_lection} model="learning_lection" readonly={disabled}>
            <FormContainer>
                <FormSection title="Allgemein" subtitle="Lektionsdaten bearbeiten">
                    <Input inputName="name" type="text" label="Name" />
                    <Input inputName="description" type="textarea" label="Description" rows={4} />
                    <Input inputName="content" type="textarea" label="Content" rows={10} />
                    <Input inputName="duration_minutes" type="number" min={0} label="Duration (min)" />
                    <Input inputName="sort" type="number" min={0} label="Sort" />
                    <Input inputName="active" type="boolean" label="Active" />
                </FormSection>

                <FormSection title="Media" subtitle="Bild, Video und Anhänge">
                    <Input inputName="image" type="media" accept="image/*" label="Bild" />
                    <Input inputName="video" type="media" accept="video/*" label="Video" />
                    <Input inputName="attachments" type="media" multiple maxFiles={20} label="Anhänge" />
                </FormSection>
            </FormContainer>

            <FormSection boxed>
                <FormContextSubmitButton editLink={route('settings.learninglections.edit', learning_lection)}>
                    Speichern
                </FormContextSubmitButton>
            </FormSection>
        </FormContext>
    );
}
