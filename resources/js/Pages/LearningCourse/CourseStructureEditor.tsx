import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import Checkbox from '@/Components/Checkbox';
import DataTable, { type Column } from '@/Components/DataTable';
import DataTableLink from '@/Components/DataTableLink';
import { DataTableFormatter } from '@/Components/DataTableFormatter';
import FormContainer from '@/Components/FormContainer';
import MediaUpload from '@/Components/MediaUpload';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import NeutralButton from '@/Components/NeutralButton';

type LearningSection = {
    id: number;
    learning_module_id: number;
    name: string;
    description: string;
    active: boolean;
    sort: number;
};

type LearningModule = {
    id: number;
    learning_course_id: number;
    name: string;
    description: string;
    cover?: any | null;
    active: boolean;
    sort: number;
    unlock_mode: 'none' | 'delay_from_course_start' | 'after_previous_module_completed';
    unlock_delay_days: number;
    sections: LearningSection[];
};

type ModuleSnapshot = {
    name: string;
    description: string;
    active: boolean;
    sort: number;
    cover: string;
    unlock_mode: string;
    unlock_delay_days: number;
};

type SectionSnapshot = {
    name: string;
    description: string;
    active: boolean;
    sort: number;
};

type ModuleModalState = {
    open: boolean;
    name: string;
    description: string;
    active: boolean;
    sort: number;
};

type SectionModalState = {
    open: boolean;
    learning_module_id: number | null;
    name: string;
    description: string;
    active: boolean;
    sort: number;
};

type ImportModalState = {
    open: boolean;
    content: string;
    format: 'auto' | 'markdown' | 'html';
    replaceExisting: boolean;
};

const lectionColumns: Column[] = [
    {
        field: 'name',
        label: 'Name',
        sortable: true,
        filter: true,
        frozen: true,
        width: '240px',
        editor: 'text',
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
        editor: { type: 'number', min: 0 },
    },
    {
        field: 'description',
        label: 'Beschreibung',
        sortable: true,
        filter: true,
        width: '300px',
        editor: 'textarea',
    },
    {
        field: 'active',
        label: 'Aktiv',
        sortable: true,
        filter: true,
        width: '100px',
        editor: 'boolean',
        formatter: DataTableFormatter.boolean,
    },
    {
        field: 'sort',
        label: 'Sort',
        sortable: true,
        filter: true,
        width: '100px',
        editor: { type: 'number', min: 0 },
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

const normalizeSection = (section: any): LearningSection => ({
    id: Number(section?.id),
    learning_module_id: Number(section?.learning_module_id),
    name: section?.name || '',
    description: section?.description || '',
    active: Boolean(section?.active),
    sort: Number(section?.sort || 0),
});

const normalizeModule = (module: any): LearningModule => ({
    id: Number(module?.id),
    learning_course_id: Number(module?.learning_course_id),
    name: module?.name || '',
    description: module?.description || '',
    cover: module?.cover || null,
    active: Boolean(module?.active),
    sort: Number(module?.sort || 0),
    unlock_mode: (module?.unlock_mode || 'none') as LearningModule['unlock_mode'],
    unlock_delay_days: Number(module?.unlock_delay_days || 0),
    sections: sortBySortAndName((module?.sections || []).map(normalizeSection)),
});

const swap = <T,>(list: T[], a: number, b: number): T[] => {
    const clone = [...list];
    const tmp = clone[a];
    clone[a] = clone[b];
    clone[b] = tmp;
    return clone;
};

const nextSortFromItems = <T extends { sort?: number }>(items: T[] = []): number => {
    const maxSort = items.reduce((max, item) => Math.max(max, Number(item.sort || 0)), 0);
    return maxSort + 10;
};

const moduleCoverUrl = (cover: any): string | null => {
    if (!cover || typeof cover !== 'object') {
        return null;
    }

    return cover.thumbnail || cover.url || cover.original_url || cover.path || null;
};

const moduleCoverSignature = (cover: any): string => {
    if (!cover) {
        return '';
    }

    if (typeof cover === 'string') {
        return cover;
    }

    if (typeof cover === 'object') {
        if (cover.__delete || cover._delete || cover.delete) {
            return '__delete__';
        }
        return String(cover.id ?? cover.url ?? cover.original_url ?? cover.path ?? cover.filename ?? cover.name ?? '');
    }

    return '';
};

const toModuleSnapshot = (module: LearningModule): ModuleSnapshot => ({
    name: module.name || '',
    description: module.description || '',
    active: Boolean(module.active),
    sort: Number(module.sort || 0),
    cover: moduleCoverSignature(module.cover),
    unlock_mode: module.unlock_mode || 'none',
    unlock_delay_days: Number(module.unlock_delay_days || 0),
});

const toSectionSnapshot = (section: LearningSection): SectionSnapshot => ({
    name: section.name || '',
    description: section.description || '',
    active: Boolean(section.active),
    sort: Number(section.sort || 0),
});

const buildBaselineMaps = (moduleList: LearningModule[]) => {
    const moduleMap: Record<number, ModuleSnapshot> = {};
    const sectionMap: Record<number, SectionSnapshot> = {};

    moduleList.forEach((module) => {
        moduleMap[module.id] = toModuleSnapshot(module);
        module.sections.forEach((section) => {
            sectionMap[section.id] = toSectionSnapshot(section);
        });
    });

    return { moduleMap, sectionMap };
};

export default function CourseStructureEditor({
    learningCourseId,
    initialModules = [],
}: {
    learningCourseId: number;
    initialModules?: any[];
}) {
    const initialNormalizedModules = sortBySortAndName((initialModules || []).map(normalizeModule));
    const initialBaselines = buildBaselineMaps(initialNormalizedModules);

    const [modules, setModules] = useState<LearningModule[]>(initialNormalizedModules);
    const [moduleBaseline, setModuleBaseline] = useState<Record<number, ModuleSnapshot>>(initialBaselines.moduleMap);
    const [sectionBaseline, setSectionBaseline] = useState<Record<number, SectionSnapshot>>(initialBaselines.sectionMap);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
    const [focusModuleId, setFocusModuleId] = useState<number | null>(null);
    const [focusSectionId, setFocusSectionId] = useState<number | null>(null);
    const [deepLinkApplied, setDeepLinkApplied] = useState(false);
    const [moduleModal, setModuleModal] = useState<ModuleModalState>({
        open: false,
        name: '',
        description: '',
        active: true,
        sort: 0,
    });
    const [sectionModal, setSectionModal] = useState<SectionModalState>({
        open: false,
        learning_module_id: null,
        name: '',
        description: '',
        active: true,
        sort: 0,
    });
    const [importModal, setImportModal] = useState<ImportModalState>({
        open: false,
        content: '',
        format: 'auto',
        replaceExisting: false,
    });

    const sortedModules = useMemo(() => sortBySortAndName(modules), [modules]);
    const allModulesExpanded = useMemo(
        () => sortedModules.length > 0 && sortedModules.every((module) => Boolean(expandedModules[module.id])),
        [sortedModules, expandedModules],
    );

    useEffect(() => {
        if (deepLinkApplied || sortedModules.length === 0) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const moduleId = Number(params.get('module') || 0);
        const sectionId = Number(params.get('section') || 0);

        if (!moduleId && !sectionId) {
            setDeepLinkApplied(true);
            return;
        }

        const moduleFromSection = sortedModules.find((module) =>
            module.sections.some((section) => section.id === sectionId),
        );
        const targetModuleId = moduleId || moduleFromSection?.id || 0;

        if (targetModuleId) {
            setExpandedModules((prev) => ({ ...prev, [targetModuleId]: true }));
            setFocusModuleId(targetModuleId);
        }

        if (sectionId) {
            setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));
            setFocusSectionId(sectionId);
        }

        setDeepLinkApplied(true);

        setTimeout(() => {
            const sectionEl = sectionId ? document.getElementById(`course-section-${sectionId}`) : null;
            const moduleEl = targetModuleId ? document.getElementById(`course-module-${targetModuleId}`) : null;
            (sectionEl || moduleEl)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
    }, [deepLinkApplied, sortedModules]);

    const setModuleField = (moduleId: number, field: keyof LearningModule, value: any) => {
        setModules((prev) =>
            prev.map((module) => (module.id === moduleId ? { ...module, [field]: value } : module)),
        );
    };

    const setSectionField = (moduleId: number, sectionId: number, field: keyof LearningSection, value: any) => {
        setModules((prev) =>
            prev.map((module) => {
                if (module.id !== moduleId) {
                    return module;
                }

                return {
                    ...module,
                    sections: module.sections.map((section) =>
                        section.id === sectionId ? { ...section, [field]: value } : section,
                    ),
                };
            }),
        );
    };

    const isModuleDirty = (module: LearningModule): boolean => {
        const baseline = moduleBaseline[module.id];
        if (!baseline) {
            return true;
        }
        return JSON.stringify(toModuleSnapshot(module)) !== JSON.stringify(baseline);
    };

    const isSectionDirty = (section: LearningSection): boolean => {
        const baseline = sectionBaseline[section.id];
        if (!baseline) {
            return true;
        }
        return JSON.stringify(toSectionSnapshot(section)) !== JSON.stringify(baseline);
    };

    const updateModuleOnApi = async (module: LearningModule) => {
        const response = await axios.post(
            route('api.model.update', {
                model: 'learning_module',
                id: module.id,
            }),
            {
                learning_course_id: learningCourseId,
                name: module.name,
                description: module.description,
                cover: module.cover || null,
                active: module.active,
                sort: Number(module.sort || 0),
                unlock_mode: module.unlock_mode || 'none',
                unlock_delay_days: Number(module.unlock_delay_days || 0),
            },
        );

        return normalizeModule(response.data);
    };

    const updateSectionOnApi = async (moduleId: number, section: LearningSection) => {
        await axios.post(
            route('api.model.update', {
                model: 'learning_section',
                id: section.id,
            }),
            {
                learning_module_id: moduleId,
                name: section.name,
                description: section.description,
                active: section.active,
                sort: Number(section.sort || 0),
            },
        );
    };

    const saveModule = async (module: LearningModule) => {
        setError(null);
        setBusy(true);

        try {
            const savedModule = await updateModuleOnApi(module);
            setModules((prev) =>
                prev.map((item) =>
                    item.id === module.id
                        ? {
                            ...savedModule,
                            sections: item.sections,
                        }
                        : item,
                ),
            );
            setModuleBaseline((prev) => ({
                ...prev,
                [module.id]: toModuleSnapshot(savedModule),
            }));
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Modul konnte nicht gespeichert werden.');
        } finally {
            setBusy(false);
        }
    };

    const moveModule = async (moduleId: number, direction: 'up' | 'down') => {
        const ordered = sortBySortAndName(modules);
        const index = ordered.findIndex((module) => module.id === moduleId);
        if (index === -1) {
            return;
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= ordered.length) {
            return;
        }

        const swapped = swap(ordered, index, targetIndex).map((module, idx) => ({
            ...module,
            sort: (idx + 1) * 10,
        }));
        const changed = swapped.filter((module) => {
            const old = ordered.find((item) => item.id === module.id);
            return old && old.sort !== module.sort;
        });

        setModules(swapped);
        setError(null);
        setBusy(true);

        try {
            await Promise.all(changed.map((module) => updateModuleOnApi(module)));
            setModuleBaseline((prev) => {
                const next = { ...prev };
                changed.forEach((module) => {
                    next[module.id] = toModuleSnapshot(module);
                });
                return next;
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Sortierung der Module konnte nicht gespeichert werden.');
        } finally {
            setBusy(false);
        }
    };

    const createModule = async () => {
        if (!moduleModal.name.trim()) {
            setError('Bitte einen Modulnamen angeben.');
            return;
        }

        setError(null);
        setBusy(true);

        try {
            const response = await axios.post(
                route('api.model.create', { model: 'learning_module' }),
                {
                    learning_course_id: learningCourseId,
                    name: moduleModal.name,
                    description: moduleModal.description,
                    active: moduleModal.active,
                    sort: Number(moduleModal.sort || 0),
                    unlock_mode: 'none',
                    unlock_delay_days: 0,
                },
            );

            const savedModule = normalizeModule(response.data);
            setModules((prev) => sortBySortAndName([{ ...savedModule, sections: [] }, ...prev]));
            setModuleBaseline((prev) => ({
                ...prev,
                [savedModule.id]: toModuleSnapshot(savedModule),
            }));
            setExpandedModules((prev) => ({ ...prev, [savedModule.id]: true }));
            setModuleModal({
                open: false,
                name: '',
                description: '',
                active: true,
                sort: 0,
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Modul konnte nicht erstellt werden.');
        } finally {
            setBusy(false);
        }
    };

    const deleteModule = async (moduleId: number) => {
        if (!confirm('Modul wirklich löschen?')) {
            return;
        }

        setError(null);
        setBusy(true);

        try {
            await axios.delete(
                route('api.model.delete', {
                    model: 'learning_module',
                    id: moduleId,
                }),
            );
            setModules((prev) => prev.filter((module) => module.id !== moduleId));
            setModuleBaseline((prev) => {
                const next = { ...prev };
                delete next[moduleId];
                return next;
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Modul konnte nicht gelöscht werden.');
        } finally {
            setBusy(false);
        }
    };

    const saveSection = async (moduleId: number, section: LearningSection) => {
        setError(null);
        setBusy(true);

        try {
            await updateSectionOnApi(moduleId, section);
            setSectionBaseline((prev) => ({
                ...prev,
                [section.id]: toSectionSnapshot(section),
            }));
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Sektion konnte nicht gespeichert werden.');
        } finally {
            setBusy(false);
        }
    };

    const moveSection = async (moduleId: number, sectionId: number, direction: 'up' | 'down') => {
        const module = modules.find((item) => item.id === moduleId);
        if (!module) {
            return;
        }

        const orderedSections = sortBySortAndName(module.sections);
        const index = orderedSections.findIndex((section) => section.id === sectionId);
        if (index === -1) {
            return;
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= orderedSections.length) {
            return;
        }

        const swapped = swap(orderedSections, index, targetIndex).map((section, idx) => ({
            ...section,
            sort: (idx + 1) * 10,
        }));
        const changed = swapped.filter((section) => {
            const old = orderedSections.find((item) => item.id === section.id);
            return old && old.sort !== section.sort;
        });

        setModules((prev) =>
            prev.map((item) => (item.id === moduleId ? { ...item, sections: swapped } : item)),
        );
        setError(null);
        setBusy(true);

        try {
            await Promise.all(changed.map((section) => updateSectionOnApi(moduleId, section)));
            setSectionBaseline((prev) => {
                const next = { ...prev };
                changed.forEach((section) => {
                    next[section.id] = toSectionSnapshot(section);
                });
                return next;
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Sortierung der Sektionen konnte nicht gespeichert werden.');
        } finally {
            setBusy(false);
        }
    };

    const createSection = async () => {
        if (!sectionModal.learning_module_id) {
            return;
        }

        if (!sectionModal.name.trim()) {
            setError('Bitte einen Sektionsnamen angeben.');
            return;
        }

        setError(null);
        setBusy(true);

        try {
            const response = await axios.post(
                route('api.model.create', { model: 'learning_section' }),
                {
                    learning_module_id: sectionModal.learning_module_id,
                    name: sectionModal.name,
                    description: sectionModal.description,
                    active: sectionModal.active,
                    sort: Number(sectionModal.sort || 0),
                },
            );

            const savedSection = normalizeSection(response.data);

            setModules((prev) =>
                prev.map((module) => {
                    if (module.id !== sectionModal.learning_module_id) {
                        return module;
                    }

                    return {
                        ...module,
                        sections: sortBySortAndName([savedSection, ...module.sections]),
                    };
                }),
            );
            setExpandedSections((prev) => ({ ...prev, [savedSection.id]: true }));
            setSectionBaseline((prev) => ({
                ...prev,
                [savedSection.id]: toSectionSnapshot(savedSection),
            }));

            setSectionModal({
                open: false,
                learning_module_id: null,
                name: '',
                description: '',
                active: true,
                sort: 0,
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Sektion konnte nicht erstellt werden.');
        } finally {
            setBusy(false);
        }
    };

    const importStructure = async () => {
        if (!importModal.content.trim()) {
            setError('Bitte Import-Inhalt einfügen.');
            return;
        }

        setError(null);
        setBusy(true);

        try {
            const response = await axios.post(
                route('settings.learningcourses.import_structure', [learningCourseId]),
                {
                    content: importModal.content,
                    format: importModal.format,
                    replace_existing: importModal.replaceExisting,
                },
            );

            const importedModules = sortBySortAndName(
                ((response.data?.learning_course?.modules as any[]) || []).map(normalizeModule),
            );
            setModules(importedModules);
            const baselines = buildBaselineMaps(importedModules);
            setModuleBaseline(baselines.moduleMap);
            setSectionBaseline(baselines.sectionMap);
            setExpandedModules({});
            setExpandedSections({});
            setImportModal((prev) => ({ ...prev, open: false }));
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Import fehlgeschlagen.');
        } finally {
            setBusy(false);
        }
    };

    const deleteSection = async (moduleId: number, sectionId: number) => {
        if (!confirm('Sektion wirklich löschen?')) {
            return;
        }

        setError(null);
        setBusy(true);

        try {
            await axios.delete(
                route('api.model.delete', {
                    model: 'learning_section',
                    id: sectionId,
                }),
            );

            setModules((prev) =>
                prev.map((module) => {
                    if (module.id !== moduleId) {
                        return module;
                    }

                    return {
                        ...module,
                        sections: module.sections.filter((section) => section.id !== sectionId),
                    };
                }),
            );
            setSectionBaseline((prev) => {
                const next = { ...prev };
                delete next[sectionId];
                return next;
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Sektion konnte nicht gelöscht werden.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <FormContainer>
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kursstruktur bearbeiten</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Module und Sektionen per Popup anlegen</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <NeutralButton
                        onClick={() => setImportModal((prev) => ({ ...prev, open: true }))}
                        className="px-2 py-1 text-xs"
                        disabled={busy}
                    >
                        Import
                    </NeutralButton>
                    <NeutralButton
                        onClick={() => {
                            const next = !allModulesExpanded;
                            const nextState: Record<number, boolean> = {};
                            sortedModules.forEach((module) => {
                                nextState[module.id] = next;
                            });
                            setExpandedModules(nextState);
                        }}
                        className="px-2 py-1 text-xs"
                    >
                        {allModulesExpanded ? 'Alle Module einklappen' : 'Alle Module ausklappen'}
                    </NeutralButton>
                </div>
            </div>
            
            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {sortedModules.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Noch keine Module vorhanden.
                </div>
            )}
   
                {sortedModules.map((module, moduleIndex) => {
                    const sections = sortBySortAndName(module.sections);
                    const isModuleExpanded = Boolean(expandedModules[module.id]);
                    const allSectionsExpanded =
                        sections.length > 0 && sections.every((section) => Boolean(expandedSections[section.id]));

                    return (
                        <div
                            id={`course-module-${module.id}`}
                            key={module.id}
                            className={`mb-5 space-y-3 rounded-lg border p-4 ${
                                focusModuleId === module.id
                                    ? 'border-primary bg-primary-50/30 ring-2 ring-primary-200'
                                    : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedModules((prev) => ({
                                            ...prev,
                                            [module.id]: !prev[module.id],
                                        }))
                                    }
                                    className="flex items-center gap-3 text-left"
                                >
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                                        {moduleCoverUrl(module.cover) ? (
                                            <img
                                                src={moduleCoverUrl(module.cover) as string}
                                                alt={module.name || `Modul ${module.id}`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                                                Kein Bild
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{module.name || `Modul #${module.id}`}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Sort: {module.sort || 0}</div>
                                    </div>
                                </button>
                                <div className="flex flex-wrap gap-2">
                                    <NeutralButton
                                        onClick={() => moveModule(module.id, 'up')}
                                        disabled={busy || moduleIndex === 0}
                                        className="px-2 py-1 text-xs"
                                        title="Sort hoch"
                                    >
                                        <ChevronUpIcon className="size-4" />
                                    </NeutralButton>
                                    <NeutralButton
                                        onClick={() => moveModule(module.id, 'down')}
                                        disabled={busy || moduleIndex === sortedModules.length - 1}
                                        className="px-2 py-1 text-xs"
                                        title="Sort runter"
                                    >
                                        <ChevronDownIcon className="size-4" />
                                    </NeutralButton>
                                    <NeutralButton
                                        onClick={() =>
                                            setExpandedModules((prev) => ({
                                                ...prev,
                                                [module.id]: !prev[module.id],
                                            }))
                                        }
                                        className="px-2 py-1 text-xs"
                                    >
                                        {isModuleExpanded ? 'Einklappen' : 'Ausklappen'}
                                    </NeutralButton>
                                </div>
                            </div>

                            {isModuleExpanded && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                                        <div>
                                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cover</span>
                                            <MediaUpload
                                                name={`module_cover_${module.id}`}
                                                accept="image/*"
                                                attributes={{ value: module.cover || null }}
                                                onChange={(event) =>
                                                    setModuleField(module.id, 'cover', (event as any).target?.value || null)
                                                }
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="block text-sm">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Modulname</span>
                                                <input
                                                    type="text"
                                                    value={module.name}
                                                    onChange={(event) => setModuleField(module.id, 'name', event.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                                                />
                                            </label>

                                            <label className="block text-sm">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Beschreibung</span>
                                                <textarea
                                                    value={module.description}
                                                    onChange={(event) => setModuleField(module.id, 'description', event.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div className="flex flex-wrap items-end gap-4">
                                            <label className="block text-sm">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={module.sort}
                                                    onChange={(event) => setModuleField(module.id, 'sort', Number(event.target.value || 0))}
                                                    className="w-24 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
                                                />
                                            </label>
                                            <label className="inline-flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={module.active}
                                                    onChange={(event: any) => setModuleField(module.id, 'active', Boolean(event.target.checked))}
                                                />
                                                Aktiv
                                            </label>
                                            <label className="block text-sm">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Freischaltung</span>
                                                <select
                                                    value={module.unlock_mode || 'none'}
                                                    onChange={(event) =>
                                                        setModuleField(
                                                            module.id,
                                                            'unlock_mode',
                                                            event.target.value as LearningModule['unlock_mode'],
                                                        )
                                                    }
                                                    className="w-56 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
                                                >
                                                    <option value="none">Sofort</option>
                                                    <option value="delay_from_course_start">Nach Kursstart-Delay</option>
                                                    <option value="after_previous_module_completed">Nach vorherigem Modul</option>
                                                </select>
                                            </label>
                                            {module.unlock_mode === 'delay_from_course_start' && (
                                                <label className="block text-sm">
                                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Delay (Tage)</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={module.unlock_delay_days || 0}
                                                        onChange={(event) =>
                                                            setModuleField(
                                                                module.id,
                                                                'unlock_delay_days',
                                                                Number(event.target.value || 0),
                                                            )
                                                        }
                                                        className="w-28 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-2">
                                            <PrimaryButton
                                                onClick={() => saveModule(module)}
                                                disabled={busy || !isModuleDirty(module)}
                                                className="px-2 py-1 text-xs"
                                            >
                                                Modul speichern
                                            </PrimaryButton>
                                            <button
                                                type="button"
                                                onClick={() => deleteModule(module.id)}
                                                disabled={busy}
                                                className="px-2 py-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                                            >
                                                Modul löschen
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-2">
                                        <NeutralButton
                                            onClick={() => {
                                                const next = !allSectionsExpanded;
                                                setExpandedSections((prev) => {
                                                    const nextState = { ...prev };
                                                    sections.forEach((section) => {
                                                        nextState[section.id] = next;
                                                    });
                                                    return nextState;
                                                });
                                            }}
                                            disabled={sections.length === 0}
                                            className="px-2 py-1 text-xs"
                                        >
                                            {allSectionsExpanded ? 'Alle Sektionen einklappen' : 'Alle Sektionen ausklappen'}
                                        </NeutralButton>
                                    </div>

                                    {sections.length === 0 && (
                                        <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            Keine Sektionen in diesem Modul.
                                        </div>
                                    )}

                                    {sections.map((section, sectionIndex) => {
                                        const isSectionExpanded = Boolean(expandedSections[section.id]);

                                        return (
                                            <div
                                                id={`course-section-${section.id}`}
                                                key={section.id}
                                                className={`space-y-3 rounded-md border p-3 ${
                                                    focusSectionId === section.id
                                                        ? 'border-primary bg-primary-50/30 ring-2 ring-primary-200'
                                                        : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedSections((prev) => ({
                                                                ...prev,
                                                                [section.id]: !prev[section.id],
                                                            }))
                                                        }
                                                        className="text-left"
                                                    >
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                            {section.name || `Sektion #${section.id}`}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">Sort: {section.sort || 0}</div>
                                                    </button>
                                                    <div className="flex flex-wrap gap-2">
                                                        <NeutralButton
                                                            onClick={() => moveSection(module.id, section.id, 'up')}
                                                            disabled={busy || sectionIndex === 0}
                                                            className="px-2 py-1 text-xs"
                                                            title="Sort hoch"
                                                        >
                                                            <ChevronUpIcon className="size-4" />
                                                        </NeutralButton>
                                                        <NeutralButton
                                                            onClick={() => moveSection(module.id, section.id, 'down')}
                                                            disabled={busy || sectionIndex === sections.length - 1}
                                                            className="px-2 py-1 text-xs"
                                                            title="Sort runter"
                                                        >
                                                            <ChevronDownIcon className="size-4" />
                                                        </NeutralButton>
                                                        <NeutralButton
                                                            onClick={() =>
                                                                setExpandedSections((prev) => ({
                                                                    ...prev,
                                                                    [section.id]: !prev[section.id],
                                                                }))
                                                            }
                                                            className="px-2 py-1 text-xs"
                                                        >
                                                            {isSectionExpanded ? 'Einklappen' : 'Ausklappen'}
                                                        </NeutralButton>
                                                    </div>
                                                </div>

                                                {isSectionExpanded && (
                                                    <>
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            <label className="block text-sm">
                                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sektionsname</span>
                                                                <input
                                                                    type="text"
                                                                    value={section.name}
                                                                    onChange={(event) =>
                                                                        setSectionField(module.id, section.id, 'name', event.target.value)
                                                                    }
                                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                                                                />
                                                            </label>
                                                            <label className="block text-sm">
                                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={section.sort}
                                                                    onChange={(event) =>
                                                                        setSectionField(
                                                                            module.id,
                                                                            section.id,
                                                                            'sort',
                                                                            Number(event.target.value || 0),
                                                                        )
                                                                    }
                                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                                                                />
                                                            </label>
                                                            <label className="block text-sm md:col-span-2">
                                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Beschreibung</span>
                                                                <textarea
                                                                    value={section.description}
                                                                    onChange={(event) =>
                                                                        setSectionField(module.id, section.id, 'description', event.target.value)
                                                                    }
                                                                    rows={2}
                                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                                                                />
                                                            </label>
                                                            <label className="inline-flex items-center gap-2 text-sm">
                                                                <Checkbox
                                                                    checked={section.active}
                                                                    onChange={(event: any) =>
                                                                        setSectionField(module.id, section.id, 'active', Boolean(event.target.checked))
                                                                    }
                                                                />
                                                                Aktiv
                                                            </label>
                                                        </div>

                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <PrimaryButton
                                                                onClick={() => saveSection(module.id, section)}
                                                                disabled={busy || !isSectionDirty(section)}
                                                                className="px-2 py-1 text-xs"
                                                            >
                                                                Sektion speichern
                                                            </PrimaryButton>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteSection(module.id, section.id)}
                                                                disabled={busy}
                                                                className="px-2 py-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                                                            >
                                                                Sektion löschen
                                                            </button>
                                                        </div>

                                                        <DataTable
                                                            routemodel="learning_lection"
                                                            filters={{ learning_section_id: section.id }}
                                                            defaultSortField={[['sort', 1], ['name', 1]]}
                                                            condensed
                                                            newRecord={{
                                                                learning_section_id: section.id,
                                                                name: '',
                                                                description: '',
                                                                duration_minutes: 0,
                                                                active: true,
                                                                sort: 0,
                                                            }}
                                                            columns={lectionColumns}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div className="flex flex-wrap justify-end gap-2">
                                        <SecondaryButton
                                            onClick={() =>
                                                setSectionModal({
                                                    open: true,
                                                    learning_module_id: module.id,
                                                    name: '',
                                                    description: '',
                                                    active: true,
                                                    sort: nextSortFromItems(sections),
                                                })
                                            }
                                            disabled={busy}
                                            className="px-2 py-1 text-xs"
                                        >
                                            Neue Sektion
                                        </SecondaryButton>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}

            <div className="mt-3 flex flex-wrap justify-end gap-2">
                <SecondaryButton
                    onClick={() =>
                        setModuleModal({
                            open: true,
                            name: '',
                            description: '',
                            active: true,
                            sort: nextSortFromItems(sortedModules),
                        })
                    }
                    disabled={busy}
                    className="px-2 py-1 text-xs"
                >
                    Neues Modul
                </SecondaryButton>
            </div>

            <Modal
                show={moduleModal.open}
                onClose={() => setModuleModal((prev) => ({ ...prev, open: false }))}
                title="Neues Modul"
                subtitle="Modul anlegen und danach im Kurs bearbeiten"
                primaryButtonText="Modul erstellen"
                secondaryButtonText="Abbrechen"
                primaryButtonType="primary"
                primaryButtonDisabled={busy || !moduleModal.name.trim()}
                onPrimaryClick={createModule}
                onSecondaryClick={() => setModuleModal((prev) => ({ ...prev, open: false }))}
            >
                <div className="space-y-3">
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</span>
                        <input
                            type="text"
                            value={moduleModal.name}
                            onChange={(event) => setModuleModal((prev) => ({ ...prev, name: event.target.value }))}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Beschreibung</span>
                        <textarea
                            value={moduleModal.description}
                            onChange={(event) =>
                                setModuleModal((prev) => ({ ...prev, description: event.target.value }))
                            }
                            rows={3}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort</span>
                        <input
                            type="number"
                            min={0}
                            value={moduleModal.sort}
                            onChange={(event) =>
                                setModuleModal((prev) => ({ ...prev, sort: Number(event.target.value || 0) }))
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={moduleModal.active}
                            onChange={(event: any) =>
                                setModuleModal((prev) => ({ ...prev, active: Boolean(event.target.checked) }))
                            }
                        />
                        Aktiv
                    </label>
                </div>
            </Modal>

            <Modal
                show={sectionModal.open}
                onClose={() => setSectionModal((prev) => ({ ...prev, open: false }))}
                title="Neue Sektion"
                subtitle="Sektion anlegen und darunter Lektionen pflegen"
                primaryButtonText="Sektion erstellen"
                secondaryButtonText="Abbrechen"
                primaryButtonType="primary"
                primaryButtonDisabled={busy || !sectionModal.learning_module_id || !sectionModal.name.trim()}
                onPrimaryClick={createSection}
                onSecondaryClick={() => setSectionModal((prev) => ({ ...prev, open: false }))}
            >
                <div className="space-y-3">
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</span>
                        <input
                            type="text"
                            value={sectionModal.name}
                            onChange={(event) => setSectionModal((prev) => ({ ...prev, name: event.target.value }))}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Beschreibung</span>
                        <textarea
                            value={sectionModal.description}
                            onChange={(event) =>
                                setSectionModal((prev) => ({ ...prev, description: event.target.value }))
                            }
                            rows={3}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort</span>
                        <input
                            type="number"
                            min={0}
                            value={sectionModal.sort}
                            onChange={(event) =>
                                setSectionModal((prev) => ({ ...prev, sort: Number(event.target.value || 0) }))
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={sectionModal.active}
                            onChange={(event: any) =>
                                setSectionModal((prev) => ({ ...prev, active: Boolean(event.target.checked) }))
                            }
                        />
                        Aktiv
                    </label>
                </div>
            </Modal>

            <Modal
                show={importModal.open}
                onClose={() => setImportModal((prev) => ({ ...prev, open: false }))}
                title="Struktur importieren"
                subtitle="Überschriften aus Markdown oder HTML werden als Modul/Sektion/Lektion übernommen"
                primaryButtonText="Import starten"
                secondaryButtonText="Abbrechen"
                primaryButtonType="primary"
                primaryButtonDisabled={busy || !importModal.content.trim()}
                onPrimaryClick={importStructure}
                onSecondaryClick={() => setImportModal((prev) => ({ ...prev, open: false }))}
            >
                <div className="space-y-3">
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Format</span>
                        <select
                            value={importModal.format}
                            onChange={(event) =>
                                setImportModal((prev) => ({
                                    ...prev,
                                    format: event.target.value as 'auto' | 'markdown' | 'html',
                                }))
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                        >
                            <option value="auto">Auto erkennen</option>
                            <option value="markdown">Markdown</option>
                            <option value="html">HTML</option>
                        </select>
                    </label>

                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Inhalt</span>
                        <textarea
                            value={importModal.content}
                            onChange={(event) => setImportModal((prev) => ({ ...prev, content: event.target.value }))}
                            rows={12}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 font-mono text-sm"
                            placeholder={'# Modul\n## Sektion\n### Lektion'}
                        />
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={importModal.replaceExisting}
                            onChange={(event: any) =>
                                setImportModal((prev) => ({
                                    ...prev,
                                    replaceExisting: Boolean(event.target.checked),
                                }))
                            }
                        />
                        Bestehende Module/Sektionen/Lektionen vorher löschen
                    </label>
                </div>
            </Modal>
        </div>
        </FormContainer>
    );
}
