import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@hubjutsu/Components/DataTable";
import DataTableLink from "@hubjutsu/Components/DataTableLink";

export default function RoleIndex() {
	return (
		<AuthenticatedLayout title="Roles">
			<div className="py-9">
				<div className="mx-auto sm:px-6 lg:px-8">
					<DataTable
						routemodel="role"
						columns={[
							{
								field: "name",
								label: "Name",
								sortable: true,
								filter: true,
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
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
