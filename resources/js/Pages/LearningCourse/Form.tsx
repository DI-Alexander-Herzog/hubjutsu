import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import Separator from '@/Components/Separator';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';
import DataTable from '@/Components/DataTable';

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

            {!!learning_course?.id && (
                <FormContainer>
                    <FormSection title="Module" subtitle="Module, die diesem Kurs zugeordnet sind">
                        <DataTable
                            routemodel="learning_module"
                            filters={{ learning_course_id: learning_course.id }}
                            defaultSortField={[["sort", 1], ["name", 1]]}
                            newRecord={{
                                learning_course_id: learning_course.id,
                                name: '',
                                active: true,
                                sort: 0,
                            }}
                            columns={[
                                {
                                    field: 'name',
                                    label: 'Name',
                                    sortable: true,
                                    filter: true,
                                    frozen: true,
                                    width: '240px',
                                    editor: 'text',
                                },
                                {
                                    field: 'description',
                                    label: 'Description',
                                    sortable: true,
                                    filter: true,
                                    width: '340px',
                                    editor: 'textarea',
                                },
                                {
                                    field: 'active',
                                    label: 'Active',
                                    sortable: true,
                                    filter: true,
                                    width: '100px',
                                    editor: 'boolean',
                                },
                                {
                                    field: 'sort',
                                    label: 'Sort',
                                    sortable: true,
                                    filter: true,
                                    width: '100px',
                                    editor: { type: 'number', min: 0 },
                                },
                            ]}
                        />
                    </FormSection>
                </FormContainer>
            )}
        </FormContext>
    );
}
