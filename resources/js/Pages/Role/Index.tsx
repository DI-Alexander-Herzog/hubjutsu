import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@hubjutsu/Components/DataTable";
import DataTableLink from "@hubjutsu/Components/DataTableLink";

export default function RoleIndex() {
	return (
		<AuthenticatedLayout title="Roles">
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
