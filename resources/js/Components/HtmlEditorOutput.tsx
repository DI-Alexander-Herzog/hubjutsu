import classNames from 'classnames';

export type HtmlEditorOutputProps = {
    html?: string | null;
    className?: string;
    imageClassName?: string;
    onImageClick?: (src: string, image: HTMLImageElement) => void;
};

const DEFAULT_CONTENT_CLASSNAME = 'max-w-none text-base text-text-700 dark:text-gray-300 [&_p]:my-2 [&_strong]:font-bold [&_em]:italic [&_a]:text-primary-600 [&_a]:underline [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_h1]:my-3 [&_h1]:text-4xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-3xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-2xl [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-xl [&_h4]:font-semibold [&_code]:rounded [&_code]:bg-background-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background-700 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0';
const DEFAULT_IMAGE_CLASSNAME = '[&_img]:my-3 [&_img]:h-auto [&_img]:max-h-[300px]  [&_img]:w-full [&_img]:max-w-[300px] [&_img]:cursor-zoom-in [&_img]:rounded-md [&_img]:object-contain';

const hasHtmlMarkup = (value: string): boolean => /<\w+[^>]*>/.test(value);

/**
 * HtmlEditorOutput
 * Renders HtmlEditor content with shared typography styles.
 */
export default function HtmlEditorOutput({
    html,
    className,
    imageClassName,
    onImageClick,
}: HtmlEditorOutputProps) {
    const content = (html || '').trim();
    if (!content) {
        return null;
    }

    if (!hasHtmlMarkup(content)) {
        return (
            <p className={classNames('whitespace-pre-wrap text-base text-text-700 dark:text-gray-300', className)}>
                {content}
            </p>
        );
    }

    return (
        <div
            className={classNames(
                DEFAULT_CONTENT_CLASSNAME,
                DEFAULT_IMAGE_CLASSNAME,
                imageClassName,
                className,
            )}
            onClick={(event) => {
                if (!onImageClick) {
                    return;
                }

                const target = event.target as HTMLElement;
                if (!(target instanceof HTMLImageElement)) {
                    return;
                }

                const src = target.getAttribute('src') || '';
                if (!src) {
                    return;
                }

                onImageClick(src, target);
            }}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}
