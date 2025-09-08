import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable, { DataTableFormatter } from "@/Components/DataTable";
import { Head } from "@inertiajs/react";
import InputText from "@hubjutsu/Components/InputText";

const textEditor = (options: any) => {
	return (
		<InputText
			type="text"
			value={options.value}
			onChange={(e) => options.editorCallback(e.target.value)}
		/>
	);
};

export default function RoleIndex() {
	return (
		<AuthenticatedLayout title={"User"}>
			<DataTable
				routemodel="user"
				columns={[
					{
						field: "email",
						label: "Mail",
						sortable: true,
						filter: true,
						frozen: true,
						width: "500px",
						editor: 'text',
						formatter: (row: any) => (
							<a className="text-primary" href={`mailto:${row.email}`}>
								{row.email}
							</a>
						),
					},
					{
						field: "name",
						label: "name",
						sortable: true,
						filter: true,
						editor: "text",
						width: "300px",
					},
					{
						field: "email_verified_at",
						label: "Verified At",
						sortable: true,
						filter: true,
						formatter: DataTableFormatter.datetime,
						editor: "datetime",
						width: "300px",
					}
				]}
			></DataTable>
		</AuthenticatedLayout>
	);
}
