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
    const editorMediaItems = form.data?.content_images || form.data?.contentImages || [];

    return (
        <>
            <FormContainer>
                <FormSection title="Preview & Allgemein" subtitle="Vorschaubild und grundlegende Lektionsdaten">
                    <Input inputName="image" type="media" accept="image/*" label="Bild" />
                    <Input inputName="name" type="text" label="Name" />
                    <Input inputName="description" type="textarea" label="Description" rows={4} />
                    <Input inputName="duration_minutes" type="number" min={0} label="Duration (min)" />
                    <Input inputName="sort" type="number" min={0} label="Sort" />
                    <Input inputName="active" type="boolean" label="Active" />
                </FormSection>
            </FormContainer>

            <FormContainer>
                <FormSection title="Video" subtitle="Video für die Lektion">
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
            </FormContainer>

            <FormContainer>
                <FormSection title="Content" subtitle="HTML-Inhalt und eingebundene Bilder">
                    <Input
                        inputName="content"
                        type="html"
                        label="Content"
                        placeholder="Inhalt der Lektion..."
                        helperText="Unterstuetzt H1-H4, Fett, Kursiv, Links, Listen, Code und Undo/Redo."
                        mediaItems={editorMediaItems}
                    />
                    <Input
                        inputName="content_images"
                        type="media"
                        accept="image/*"
                        multiple
                        maxFiles={50}
                        label="Content Images"
                        helperText="Diese Bildliste ist für den Editor-Content (private Medien)."
                    />
                </FormSection>
            </FormContainer>

            <FormContainer>
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
