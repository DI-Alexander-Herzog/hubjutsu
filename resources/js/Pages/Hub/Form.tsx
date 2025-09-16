import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';
import Input from '@/Components/Input';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import { Models } from '@/types/models';
import Separator from '@/Components/Separator';

export default function HubForm({ disabled=false, hub }: { disabled?: boolean; hub: Models.Hub }) {

    return (
        <FormContext data={hub} model={'hub'} readonly={disabled}>
            <FormContainer>
                <FormSection title="Allgemein" subtitle='Allgemeine Angaben zum Hub'>
                    <Input inputName="name" />
                    <Input inputName="url" type="url" />
                    <Input inputName="primary" type='checkbox' />
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
                    
                    <Input inputName="font_primary" type="text" />
                    <Input inputName="font_primary_size" type="number" />
                
                    <Input inputName="font_secondary" type="text" />
                    <Input inputName="font_secondary_size" type="number" />
                
                    
                </FormSection>
                
            </FormContainer>

            <FormSection boxed={true}>
                    <FormContextSubmitButton>Speichern</FormContextSubmitButton>
            </FormSection>
        </FormContext>
        
    );
}