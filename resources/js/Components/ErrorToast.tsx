import { Transition } from "@headlessui/react";
import { ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useLaravelReactI18n } from "laravel-react-i18n";
import { useEffect, useState } from "react";

type ErrorToastType = {
    title?: string;
    error: string | null | any;
    onClose?: () => void;
}

export default function ErrorToast({error, title, onClose, ...props} : ErrorToastType ) {
    const { t } = useLaravelReactI18n();
    const [ show, setShow ] = useState<boolean>(false);
    
    const message = (() => {
        if (!error) return <></>;
        if (typeof error === "string") return <>{error}</>;
        if (error.message) return <>{error.message}</>;
        return <></>;
    })();

    useEffect(() => {
        if (error) {
            setShow(true);
        } else {
            setShow(false);
        }
    }, [error]);

    
    return (
        <Transition 
            show={show}
            enter="transition ease-out duration-300"
            enterFrom="opacity-0 translate-y-2"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-300"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-2"
            afterLeave={() => {onClose && onClose()}}
        >
            <div className="absolute right-2 top-2 z-[9999] pointer-events-auto w-full max-w-sm overflow-hidden bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="p-3">
                    <div className="flex items-start">
                        <div className="shrink-0">
                            <ExclamationCircleIcon
                                aria-hidden="true"
                                className="size-5 text-red-500"
                            />
                        </div>
                        <div className="ml-2 w-0 flex-1 pt-0.5">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {t(title || 'Error loading!')}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {message}
                            </p>
                        </div>
                        <div className="ml-2 flex shrink-0">
                            <button
                                type="button"
                                onClick={() => setShow(false)}
                                className="inline-flex bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                                <span className="sr-only">{t('Close')}</span>
                                <XMarkIcon aria-hidden="true" className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    );
}