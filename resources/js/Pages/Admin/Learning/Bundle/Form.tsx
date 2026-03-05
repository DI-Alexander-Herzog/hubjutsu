import DataTable from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';
import DataTableLink from '@/Components/DataTableLink';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import { FormContext, FormContextSubmitButton } from '@/Components/FormContext';

function BundleCourseSelection({ learningBundle, disabled = false }: { learningBundle?: any; disabled?: boolean }) {
    if (!learningBundle?.id) {
        return (
            <FormSection title="Kurse" subtitle="Kurse diesem Bundle zuweisen">
                <p className="text-sm text-text-500">
                    Bundle zuerst speichern, danach koennen Kurse zugewiesen werden.
                </p>
            </FormSection>
        );
    }

    return (
        <FormSection title="Kurse" subtitle="Kurse diesem Bundle zuweisen">
            <DataTable
                routemodel="learning_bundle_learning_course"
                with={['course']}
                filters={{ learning_bundle_id: learningBundle.id }}
                height="420px"
                perPage={20}
                disableDelete={disabled}
                defaultSortField={[["sort", 1], ["id", 1]]}
                newRecord={disabled ? false : { learning_bundle_id: learningBundle.id, sort: 0 }}
                columns={[
                    {
                        field: 'learning_course_id',
                        label: 'Kurs',
                        sortable: true,
                        filter: true,
                        frozen: true,
                        width: '360px',
                        editor: disabled ? undefined : {
                            type: 'model',
                            model: 'learning_course',
                            labelField: 'name',
                            columns: [
                                { field: 'name', label: 'Name', width: '50%' },
                                { field: 'description', label: 'Description', width: '50%' },
                            ],
                        },
                        formatter: (row: any) => {
                            const courseId = Number(row.learning_course_id || row.course?.id || 0);
                            const courseLabel = row.course?.name || (courseId > 0 ? `#${courseId}` : '-');

                            if (courseId <= 0) {
                                return courseLabel;
                            }

                            return (
                                <DataTableLink href={route('settings.learningcourses.edit', { learningcourse: courseId })}>
                                    {courseLabel}
                                </DataTableLink>
                            );
                        },
                    },
                    {
                        field: 'course_active',
                        label: 'Active',
                        sortable: false,
                        filter: false,
                        width: '100px',
                        formatter: (row: any) => DataTableFormatter.boolean({
                            active: Boolean(row.course?.active),
                        }, 'active'),
                    },
                    {
                        field: 'sort',
                        label: 'Sort',
                        sortable: true,
                        filter: true,
                        width: '100px',
                        editor: disabled ? undefined : { type: 'number', min: 0 },
                    },
                ]}
            />
        </FormSection>
    );
}

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

                <BundleCourseSelection learningBundle={learning_bundle} disabled={disabled} />
            </FormContainer>

            <FormSection boxed={true}>
                <FormContextSubmitButton editLink={route('settings.learningbundles.edit', learning_bundle)}>
                    Speichern
                </FormContextSubmitButton>
            </FormSection>
        </FormContext>
    );
}
