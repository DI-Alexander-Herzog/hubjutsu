import classNames from "classnames";
import { ReactNode } from "react";

type LayoutType = {
    children?: ReactNode,
    title?: string,
    description?: string
    sidebar?: ReactNode
};

export default function Layout( {children, title, description, sidebar, ...props} : LayoutType  ) {
    return (
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
            <div>
                <h2 className="text-base/7 font-semibold text-gray-900">{title}</h2>
                <p className="mt-1 text-sm/6 text-gray-600">
                    {description}
                </p>
                {sidebar}
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
                {children}
            </div>
        </div>
    );
}