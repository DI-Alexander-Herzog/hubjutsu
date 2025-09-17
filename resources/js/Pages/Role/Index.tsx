import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { CogIcon, ShieldCheckIcon } from "@heroicons/react/20/solid";
import DataTable from "@hubjutsu/Components/DataTable";
import DataTableLink from "@hubjutsu/Components/DataTableLink";

export default function RoleIndex() {
	return (
		<AuthenticatedLayout title="Roles"
			breadcrumbs={[
				{ label: 'Settings', url: route('settings.index'), icon: <CogIcon /> },
				{ label: 'Roles', icon: <ShieldCheckIcon /> }
			]}>
			<DataTable
				routemodel="role"
				columns={[
					{
						field: "name",
						label: "Name",
						sortable: true,
						filter: true,
						editor: "text",
						formatter: (row: any) => {
							return (
								<DataTableLink href={route("admin.roles.show", row)}>
									{row.name}
								</DataTableLink>
							);
						},
					},{
						field: "name2",
						label: "Name2",
						sortable: true,
						filter: true,
						editor: "datetime",
						formatter: (row: any) => {
							return (
								<DataTableLink href={route("admin.roles.show", row)}>
									{row.name}
								</DataTableLink>
							);
						},
					},
				]}
			></DataTable>
		</AuthenticatedLayout>
	);
}
