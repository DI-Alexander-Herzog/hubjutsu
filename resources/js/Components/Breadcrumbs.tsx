import { Link } from "@inertiajs/react";
import classNames from "classnames";
import { ReactNode } from "react";
import IconLibrary, { iconMap } from "./IconLibrary";

export type Breadcrumb = {
    label: string;
    icon?: ReactNode | keyof typeof iconMap;
    url?: string;
};

type BreadcrumbsType = {
    items: Breadcrumb[],
}

export default function Breadcrumbs({items} : BreadcrumbsType ) {
    return (
        <div className=" border-b border-gray-200 dark:border-gray-700">
            <div className=" mx-auto px-4 py-2">
                <nav className="flex" aria-label="Breadcrumb">
                    <ol role="list" className="flex items-center space-x-1">
                        {items.map((item, index) => (
                            <li key={index} className="flex items-center">
                                {index > 0 && (
                                    <span className="text-gray-400 dark:text-gray-500 mx-3 text-lg">/</span>
                                )}
                                
                                {item.url ? (
                                    <Link
                                        href={item.url}
                                        className={classNames(
                                            "flex items-center px-2 py-1 text-sm font-medium transition-all duration-200 relative",
                                            index === items.length - 1
                                                ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary"
                                                : "text-gray-600 dark:text-gray-300 hover:text-primary hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary"
                                        )}
                                    >
                                        {item.icon && (
                                            <span className="mr-2 h-4 w-4 flex-shrink-0">
                                                {typeof item.icon === "string" ? <IconLibrary name={item.icon as keyof typeof iconMap} /> :  item.icon}
                                            </span>
                                        )}
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                ) : (
                                    <span
                                        className={classNames(
                                            "flex items-center px-2 py-1 text-sm font-medium relative",
                                            index === items.length - 1
                                                ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary"
                                                : "text-gray-600 dark:text-gray-300"
                                        )}
                                    >
                                        {item.icon && (
                                            <span className="mr-2 h-4 w-4 flex-shrink-0">
                                                {typeof item.icon === "string" ? <IconLibrary name={item.icon as keyof typeof iconMap} /> :  item.icon}
                                            </span>
                                        )}
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            </div>
        </div>
    );
}

