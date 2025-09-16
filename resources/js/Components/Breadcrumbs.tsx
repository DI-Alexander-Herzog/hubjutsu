import { ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { Link } from "@inertiajs/react";
import classNames from "classnames";
import { ReactNode } from "react";

export type Breadcrumb = {
    label: string;
    icon?: ReactNode;
    url?: string;
};

type BreadcrumbsType = {
    items: Breadcrumb[],
}

export default function Breadcrumbs({items} : BreadcrumbsType ) {
    return (
        <div className="container">
            <nav className="flex" aria-label="Breadcrumb">
                <ol role="list" className="flex items-center space-x-4">
                    {items.map((item, index) => (
                        <li key={index}>
                            <div className="flex items-center">
                                {index !== 0 && (
                                    <ChevronRightIcon className="size-4"/>
                                )}
                                {item.url ? (
                                    <Link
                                        href={item.url}
                                        className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center"
                                    >
                                        {item.icon && <span className="mr-1 size-4">{item.icon}</span>}
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span
                                        className="ml-4 text-sm font-medium text-gray-500 flex items-center"    
                                    >
                                        {item.icon && <span className="mr-1 size-4">{item.icon}</span>}
                                        {item.label}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </nav>
        </div>
    );
}

