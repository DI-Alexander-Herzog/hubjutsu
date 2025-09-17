import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@/Components/DataTable";
import DataTableLink from "@hubjutsu/Components/DataTableLink";
import InputText from "@hubjutsu/Components/InputText";
import { DataTableFormatter } from "@hubjutsu/Components/DataTableFormatter";
import { CogIcon, UserIcon } from "@heroicons/react/20/solid";

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
		<AuthenticatedLayout title={"User"} 	
		breadcrumbs={[
						{ label: 'Settings', url: route('settings.index'), icon: <CogIcon /> },
						{ label: 'User', icon: <UserIcon /> }
					]}>
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
						editor: "text",
						formatter: (row: any) => (
							<DataTableLink href={`mailto:${row.email}`} target="_blank">
								{row.email}
							</DataTableLink>
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
					},
				]}
			></DataTable>
		</AuthenticatedLayout>
	);
}
