import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';
import Input from '@/Components/Input';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import { Models } from '@/types/models';
import Separator from '@/Components/Separator';
import { router } from '@inertiajs/react';
import MediaUpload from '@/Components/MediaUpload';

export default function HubForm({ disabled=false, hub }: { disabled?: boolean; hub: Models.Hub }) {

    return (
        <FormContext data={hub} model={'hub'} readonly={disabled}>
            <FormContainer>
                <FormSection title="Allgemein" subtitle='Allgemeine Angaben zum Hub'>
                    <Input inputName="name" />
                    <Input inputName="slug" />
                    <Input inputName="url" type="url" />
                    <Input inputName="app_id" />
                </FormSection>

                <Separator />

                <FormSection title="Flags" subtitle='Allgemeine Einstellungen zum Hub'>
                    <Input inputName="primary" type='boolean' />
                    <Input inputName="has_darkmode" type='boolean' />

                    <Input inputName="enable_registration" type='boolean' />
                    <Input inputName="enable_guestmode" type='boolean' />
                </FormSection>

                <Separator />

                <FormSection title="Farben" subtitle='Einstellungen zur Farbgestaltung am Hub'>
                    <div className="flex gap-2">
                        <Input inputName="color_primary" type="color" /> 
                        <Input inputName="color_primary_text" type="color" />
                    </div>
                    <div className="flex gap-2">
                        <Input inputName="color_secondary" type="color" />    
                        <Input inputName="color_secondary_text" type="color" />
                    </div>
                    <div className="flex gap-2">
                        <Input inputName="color_tertiary" type="color" />    
                        <Input inputName="color_tertiary_text" type="color" />
                    </div>
                    <div className="flex gap-2">
                        <Input inputName="color_background" type="color" />    
                        <Input inputName="color_text" type="color" />
                    </div>
                </FormSection>

               <Separator />

                <FormSection title="Schriften" subtitle='Einstellungen zur Schriftgestaltung am Hub'>
                    
                    <Input inputName="font_sans" type="text" />
                    <Input inputName="font_serif" type="text" />
                    <Input inputName="font_mono" type="text" />
                    <Input inputName="font_header" type="text" />
                    <Input inputName="font_text" type="text" />

                    <Input inputName="font_size_root" type="text" />
                    <Input inputName="font_import" type="text" />
                    
                </FormSection>
                
            </FormContainer>

            <FormContainer>

                <FormSection title="Bilder" subtitle='Einstellungen zu den Bildern am Hub'>
                    <Input type="media" accept='image/*' inputName="brand_image" label="Brand Image" />
                    <Input type="media" accept='image/*' inputName="logo" label="Logo (hell)" />
                    <Input type="media" accept='image/*' inputName="logo_dark" label="Logo (dunkel)" />
                </FormSection>
            </FormContainer>

            <FormSection boxed={true} className="mt-4">
                    <FormContextSubmitButton postSave={() => { window.location.reload(); }}>Speichern</FormContextSubmitButton>
            </FormSection>
        </FormContext>
        
    );
}