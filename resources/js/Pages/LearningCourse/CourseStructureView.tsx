import DataTable, { type Column } from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';

type LearningSection = {
    id: number;
    name: string;
    description?: string | null;
    active: boolean;
    sort: number;
};

type LearningModule = {
    id: number;
    name: string;
    description?: string | null;
    active: boolean;
    sort: number;
    sections?: LearningSection[];
};

const lectionColumns: Column[] = [
    {
        field: 'name',
        label: 'Name',
        sortable: true,
        filter: true,
        frozen: true,
        width: '240px',
    },
    {
        field: 'duration_minutes',
        label: 'Dauer (Min)',
        sortable: true,
        filter: true,
        width: '120px',
    },
    {
        field: 'description',
        label: 'Beschreibung',
        sortable: true,
        filter: true,
        width: '320px',
    },
    {
        field: 'active',
        label: 'Aktiv',
        sortable: true,
        filter: true,
        width: '100px',
        formatter: DataTableFormatter.boolean,
    },
    {
        field: 'sort',
        label: 'Sort',
        sortable: true,
        filter: true,
        width: '100px',
    },
];

const sortBySortAndName = <T extends { sort?: number; name?: string }>(items: T[] = []): T[] =>
    [...items].sort((a, b) => {
        const sortDiff = (a.sort ?? 0) - (b.sort ?? 0);
        if (sortDiff !== 0) {
            return sortDiff;
        }

        return (a.name ?? '').localeCompare(b.name ?? '');
    });

export default function CourseStructureView({ modules = [] }: { modules?: LearningModule[] }) {
    const sortedModules = sortBySortAndName(modules);

    return (
        <FormContainer>
            <FormSection title="Kursstruktur" subtitle="Alle Module, Sektionen und Lektionen">
                {sortedModules.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                        Noch keine Module vorhanden.
                    </div>
                )}

                {sortedModules.map((module) => {
                    const sections = sortBySortAndName(module.sections || []);

                    return (
                        <div key={module.id} className="space-y-4 rounded-lg border border-gray-200 p-4">
                            <div className="space-y-1">
                                <div className="text-base font-semibold text-gray-900">
                                    {module.name || `Modul #${module.id}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Sort: {module.sort ?? 0} | Aktiv: {module.active ? 'Ja' : 'Nein'}
                                </div>
                                {module.description && (
                                    <div className="text-sm text-gray-700">{module.description}</div>
                                )}
                            </div>

                            {sections.length === 0 && (
                                <div className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                                    Keine Sektionen in diesem Modul.
                                </div>
                            )}

                            {sections.map((section) => (
                                <div key={section.id} className="space-y-3 rounded-md border border-gray-200 p-3">
                                    <div className="space-y-1">
                                        <div className="text-sm font-semibold text-gray-900">
                                            {section.name || `Sektion #${section.id}`}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Sort: {section.sort ?? 0} | Aktiv: {section.active ? 'Ja' : 'Nein'}
                                        </div>
                                        {section.description && (
                                            <div className="text-sm text-gray-700">{section.description}</div>
                                        )}
                                    </div>

                                    <DataTable
                                        routemodel="learning_lection"
                                        filters={{ learning_section_id: section.id }}
                                        defaultSortField={[['sort', 1], ['name', 1]]}
                                        condensed
                                        newRecord={false}
                                        disableDelete
                                        columns={lectionColumns}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })}
            </FormSection>
        </FormContainer>
    );
}
