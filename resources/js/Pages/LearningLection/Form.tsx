import { useState } from 'react';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import Modal from '@/Components/Modal';
import NeutralButton from '@/Components/NeutralButton';
import ScreenCamRecorder from '@/Components/ScreenCamRecorder';
import { FormContext, FormContextSubmitButton, useFormContext } from '@/Components/FormContext';

export default function LearningLectionForm({
    learning_lection,
    disabled = true,
}: {
    learning_lection: any;
    disabled?: boolean;
}) {
    return (
        <FormContext data={learning_lection} model="learning_lection" readonly={disabled}>
            <LearningLectionFormBody learning_lection={learning_lection} />
        </FormContext>
    );
}

function LearningLectionFormBody({ learning_lection }: { learning_lection: any }) {
    const { form, readonly } = useFormContext();
    const [showRecorder, setShowRecorder] = useState(false);

    return (
        <>
            <FormContainer>
                <FormSection title="Media" subtitle="Bild und Video">
                    <Input inputName="image" type="media" accept="image/*" label="Bild" />
                    <div className="space-y-2">
                        <Input inputName="video" type="media" accept="video/*" label="Video" />
                        {!readonly && (
                            <NeutralButton
                                type="button"
                                onClick={() => setShowRecorder(true)}
                                size="small"
                                className="px-2 py-1 text-xs"
                            >
                                Aufnahme starten
                            </NeutralButton>
                        )}
                    </div>
                </FormSection>

                <FormSection title="Allgemein" subtitle="Lektionsdaten bearbeiten">
                    <Input inputName="name" type="text" label="Name" />
                    <Input inputName="description" type="textarea" label="Description" rows={4} />
                    <Input inputName="content" type="textarea" label="Content" rows={10} />
                    <Input inputName="duration_minutes" type="number" min={0} label="Duration (min)" />
                    <Input inputName="sort" type="number" min={0} label="Sort" />
                    <Input inputName="active" type="boolean" label="Active" />
                </FormSection>

                <FormSection title="Anhänge" subtitle="Zusätzliche Dateien">
                    <Input inputName="attachments" type="media" multiple maxFiles={20} label="Anhänge" />
                </FormSection>
            </FormContainer>

            <FormSection boxed>
                <FormContextSubmitButton editLink={route('settings.learninglections.edit', learning_lection)}>
                    Speichern
                </FormContextSubmitButton>
            </FormSection>

            <Modal
                show={showRecorder}
                onClose={() => setShowRecorder(false)}
                maxWidth="screen"
                title="Lektion aufnehmen"
                subtitle="Aufnahme wird direkt als Video-Media übernommen."
            >
                <ScreenCamRecorder
                    createMediaOnProcess
                    onMediaCreated={({ media }) => {
                        form.setData((data: any) => ({
                            ...data,
                            video: media,
                        }));
                        setShowRecorder(false);
                    }}
                />
            </Modal>
        </>
    );
}
