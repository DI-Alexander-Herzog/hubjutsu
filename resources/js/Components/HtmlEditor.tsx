import classNames from 'classnames';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import NeutralButton from '@/Components/NeutralButton';
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, LinkIcon, ListBulletIcon, NumberedListIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';

export type HtmlEditorMediaItem = {
    id: number | string;
    url?: string | null;
    thumbnail?: string | null;
    name?: string | null;
    mimetype?: string | null;
};

export type HtmlEditorProps = {
    id?: string;
    name?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (html: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    label?: string;
    error?: string;
    helperText?: string;
    placeholder?: string;
    className?: string;
    withHiddenInput?: boolean;
    minHeightClassName?: string;
    mediaItems?: HtmlEditorMediaItem[];
};

const normalizeHtml = (html: string | undefined) => (html ?? '').trim();

/**
 * HtmlEditor
 * - Controlled: pass `value` + `onChange`.
 * - Uncontrolled: pass `defaultValue` and optionally `onChange`.
 * - Emits only HTML string through `onChange`.
 *
 * Example:
 * <HtmlEditor
 *   name="body"
 *   value={html}
 *   onChange={setHtml}
 *   label="Body"
 *   helperText="Unterstuetzt einfache Formatierung."
 * />
 */
export default function HtmlEditor({
    id,
    name,
    value,
    defaultValue = '',
    onChange,
    disabled = false,
    readOnly = false,
    label,
    error,
    helperText,
    placeholder = '',
    className = '',
    withHiddenInput = true,
    minHeightClassName = 'min-h-40',
    mediaItems = [],
}: HtmlEditorProps) {
    const isControlled = value !== undefined;
    const [currentHtml, setCurrentHtml] = useState<string>(value ?? defaultValue ?? '');
    const isReadonly = disabled || readOnly;

    const initialContent = useMemo(() => (isControlled ? value ?? '' : defaultValue ?? ''), [defaultValue, isControlled, value]);

    const editor = useEditor({
        immediatelyRender: false,
        editable: !isReadonly,
        content: initialContent,
        extensions: [
            StarterKit,
            Image.configure({
                allowBase64: false,
            }),
            Link.configure({
                openOnClick: false,
                autolink: false,
                linkOnPaste: true,
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        editorProps: {
            attributes: {
                class: classNames(
                    'tiptap w-full rounded-b-md border border-t-0 border-gray-300 bg-background px-3 py-3 text-sm text-text-900 shadow-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
                    '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary-600 [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_h1]:my-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-lg [&_h4]:font-semibold [&_code]:rounded [&_code]:bg-background-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background-700 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_img]:my-2 [&_img]:h-auto [&_img]:max-h-[300px] [&_img]:w-full [&_img]:max-w-[300px] [&_img]:cursor-pointer [&_img]:rounded-md [&_img]:object-contain [&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-primary',
                    minHeightClassName,
                    isReadonly ? 'cursor-not-allowed bg-background-600 dark:bg-gray-800' : '',
                ),
            },
        },
        onUpdate: ({ editor: nextEditor }: { editor: any }) => {
            const html = nextEditor.getHTML();
            setCurrentHtml(html);
            onChange?.(html);
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        editor.setEditable(!isReadonly);
    }, [editor, isReadonly]);

    useEffect(() => {
        if (!editor || !isControlled) {
            return;
        }

        const next = value ?? '';
        const current = editor.getHTML();
        if (normalizeHtml(next) === normalizeHtml(current)) {
            return;
        }

        editor.commands.setContent(next, { emitUpdate: false });
        setCurrentHtml(next);
    }, [editor, isControlled, value]);

    const buttonClassName = 'h-8 px-2 text-xs';
    const imageCandidates = useMemo(
        () =>
            (mediaItems || []).filter((item) => {
                const type = String(item?.mimetype || '').toLowerCase();
                return type.startsWith('image/');
            }),
        [mediaItems],
    );

    const setLink = () => {
        if (!editor || isReadonly) {
            return;
        }

        const previous = editor.getAttributes('link').href || '';
        const url = window.prompt('URL', previous);
        if (url === null) {
            return;
        }
        if (url.trim() === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }

        editor.chain().focus().setLink({ href: url.trim() }).run();
    };
    const insertImage = (mediaId: string | number) => {
        if (!editor || isReadonly) {
            return;
        }

        const selected = imageCandidates.find((item) => String(item.id) === String(mediaId));
        if (!selected) {
            return;
        }

        const src = selected.url || selected.thumbnail || '';
        if (!src) {
            return;
        }

        editor.chain().focus().setImage({ src, alt: selected.name || '' }).run();
    };
    const activeImageSrc = editor?.isActive('image')
        ? String(editor.getAttributes('image')?.src || '')
        : '';

    return (
        <div className={classNames('space-y-1 w-full', className)}>
            {label ? <InputLabel htmlFor={id} value={label} /> : null}

            <div className="w-full">
                <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-gray-300 bg-background p-1 dark:border-gray-700 dark:bg-gray-900">
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                    >
                        <span className="font-bold">B</span>
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                    >
                        <span className="italic">I</span>
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleCode().run()}
                    >
                        {'</>'}
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    >
                        {'<pre>'}
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    >
                        H1
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                        H2
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    >
                        H3
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
                    >
                        H4
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={setLink}
                    >
                        <LinkIcon className="h-4 w-4" />
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                        <ListBulletIcon className="h-4 w-4" />
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly}
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                        <NumberedListIcon className="h-4 w-4" />
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly || !editor?.isActive('image')}
                        onClick={() => editor?.chain().focus().deleteSelection().run()}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly || !editor?.can().undo()}
                        onClick={() => editor?.chain().focus().undo().run()}
                    >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                    </NeutralButton>
                    <NeutralButton
                        size="small"
                        display="outline"
                        type="button"
                        className={buttonClassName}
                        disabled={!editor || isReadonly || !editor?.can().redo()}
                        onClick={() => editor?.chain().focus().redo().run()}
                    >
                        <ArrowUturnRightIcon className="h-4 w-4" />
                    </NeutralButton>
                </div>
                {imageCandidates.length > 0 ? (
                    <div className="space-y-2 border-x border-b border-gray-300 bg-background-600/60 px-2 py-2 dark:border-gray-700 dark:bg-gray-800/50">
                        <div className="inline-flex items-center text-xs font-medium text-text-600 dark:text-gray-300">
                            <PhotoIcon className="mr-1 h-4 w-4" />
                            Content Images
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {imageCandidates.map((item) => {
                                const src = item.thumbnail || item.url || '';
                                if (!src) {
                                    return null;
                                }
                                const isActive = activeImageSrc === src;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="group inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-background px-2 py-1 text-xs text-text-700 transition hover:bg-background-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
                                        disabled={!editor || isReadonly}
                                        onClick={() => insertImage(item.id)}
                                        title={item.name || `Media #${item.id}`}
                                        aria-pressed={isActive}
                                    >
                                        <img
                                            src={src}
                                            alt={item.name || ''}
                                            className={classNames(
                                                'h-8 w-8 rounded object-contain',
                                                isActive ? 'ring-2 ring-primary' : '',
                                            )}
                                        />
                                        <span className={classNames('max-w-28 truncate', isActive ? 'font-semibold text-primary' : '')}>
                                            {item.name || `#${item.id}`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                <EditorContent editor={editor} id={id} />
            </div>

            {withHiddenInput && name ? <input type="hidden" name={name} value={currentHtml} /> : null}
            {helperText ? <p className="mt-1 text-xs text-text-600 dark:text-gray-400">{helperText}</p> : null}
            <InputError message={error} className="mt-2" />
        </div>
    );
}
