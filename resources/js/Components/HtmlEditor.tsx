import classNames from 'classnames';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import NeutralButton from '@/Components/NeutralButton';
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, LinkIcon, ListBulletIcon, NumberedListIcon } from '@heroicons/react/24/outline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';

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
                    '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary-600 [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_h1]:my-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-lg [&_h4]:font-semibold',
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

        editor.commands.setContent(next, false);
        setCurrentHtml(next);
    }, [editor, isControlled, value]);

    const buttonClassName = 'h-8 px-2 text-xs';

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

                <EditorContent editor={editor} id={id} />
            </div>

            {withHiddenInput && name ? <input type="hidden" name={name} value={currentHtml} /> : null}
            {helperText ? <p className="mt-1 text-xs text-text-600 dark:text-gray-400">{helperText}</p> : null}
            <InputError message={error} className="mt-2" />
        </div>
    );
}
