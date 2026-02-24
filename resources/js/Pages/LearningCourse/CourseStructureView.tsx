import DataTable, { type Column } from '@/Components/DataTable';
import DataTableLink from '@/Components/DataTableLink';
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
    cover?: any | null;
    active: boolean;
    sort: number;
    unlock_mode?: 'none' | 'delay_from_course_start' | 'after_previous_module_completed';
    unlock_delay_days?: number;
    sections?: LearningSection[];
};

const moduleCoverUrl = (cover: any): string | null => {
    if (!cover || typeof cover !== 'object') {
        return null;
    }

    return cover.thumbnail || cover.url || cover.original_url || cover.path || null;
};

const lectionColumns: Column[] = [
    {
        field: 'name',
        label: 'Name',
        sortable: true,
        filter: true,
        frozen: true,
        width: '240px',
        formatter: (row: any) => (
            <DataTableLink href={route('settings.learninglections.edit', row)}>
                {row.name}
            </DataTableLink>
        ),
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
                            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                                <div>
                                    {moduleCoverUrl(module.cover) ? (
                                        <img
                                            src={moduleCoverUrl(module.cover) as string}
                                            alt={module.name || `Modul ${module.id}`}
                                            className="h-28 w-full rounded-md border border-gray-200 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400">
                                            Kein Cover
                                        </div>
                                    )}
                                    <div className="mt-2 text-xs text-gray-500">
                                        Sort: {module.sort ?? 0} | Aktiv: {module.active ? 'Ja' : 'Nein'}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        Freischaltung:{' '}
                                        {module.unlock_mode === 'delay_from_course_start'
                                            ? `Nach ${module.unlock_delay_days ?? 0} Tagen`
                                            : module.unlock_mode === 'after_previous_module_completed'
                                                ? 'Nach vorherigem Modul'
                                                : 'Sofort'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-base font-semibold text-gray-900">
                                        {module.name || `Modul #${module.id}`}
                                    </div>
                                    {module.description && (
                                        <div className="text-sm text-gray-700">{module.description}</div>
                                    )}
                                </div>
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
