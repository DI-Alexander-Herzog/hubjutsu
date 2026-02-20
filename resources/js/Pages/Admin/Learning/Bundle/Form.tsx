import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';

export default function LearningBundleForm({ learning_bundle, disabled = true }: { learning_bundle: any; disabled?: boolean }) {
    return (
        <FormContext data={learning_bundle} model={'learning_bundle'} readonly={disabled}>
            <FormContainer>
                <FormSection title="Allgemein" subtitle="Grunddaten für das Bundle">
                    <Input inputName="name" type="text" label="Name" />
                    <Input inputName="slug" type="text" label="Slug" />
                    <Input inputName="description" type="textarea" label="Description" rows={5} />
                    <Input inputName="active" type="boolean" label="Active" />
                    <Input inputName="sort" type="number" label="Sort" min={0} />
                </FormSection>
            </FormContainer>

            <FormSection boxed={true}>
                <FormContextSubmitButton editLink={route('settings.learningbundles.edit', learning_bundle)}>
                    Speichern
                </FormContextSubmitButton>
            </FormSection>
        </FormContext>
    );
}
