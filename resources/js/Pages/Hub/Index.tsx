import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@/Components/DataTable";
import DataTableLink from "@hubjutsu/Components/DataTableLink";
import { Head, Link, router } from "@inertiajs/react";

export default function HubIndex() {
	return (
		<AuthenticatedLayout title="Hubs">
			<div className="py-9">
				<div className="mx-auto sm:px-6 lg:px-8">
					<DataTable
						routemodel="hub"
						height="400px"
						columns={[
							{
								field: "name",
								label: "Name",
								sortable: true,
								filter: true,
								frozen: true,
								width: "500px",
								formatter: (row: any) => (
									<DataTableLink href={route("admin.hubs.edit", row)}>
										{row.name}
									</DataTableLink>
								),
							},
							{
								field: "url",
								label: "URL",
								sortable: true,
								filter: true,
								editor: "text",
								width: "300px",
								formatter: (row: any) => (
									<DataTableLink href={row.url} target="_blank">
										{row.url}
									</DataTableLink>
								),
							},
							{
								field: "primary",
								label: "Primary",
								sortable: true,
								filter: true,
								editor: "text",
								width: "300px",
							},
						]}
					></DataTable>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
