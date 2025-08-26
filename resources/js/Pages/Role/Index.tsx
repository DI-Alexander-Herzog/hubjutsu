import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@hubjutsu/Components/DataTable";
import { Link } from "@inertiajs/react";

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
										<Link href={route("admin.roles.show", row)}>
											{row.name}
										</Link>
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
