import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@/Components/DataTable";
import { DataTableDynamicFormatter } from "@hubjutsu/Components/DataTableDynamicFormatter";
import { CogIcon, FolderIcon } from "@heroicons/react/20/solid";
import IconLibrary from "@hubjutsu/Components/IconLibrary";

export default function HubIndex() {
	return (
		<AuthenticatedLayout title="Hubs"
			breadcrumbs={[
				{ label: 'Settings', url: route('settings.index'), icon:<IconLibrary name="cog" /> }, 
				{ label: 'Hubs', icon: <IconLibrary name="folder" /> }
			]}
		>
			<DataTable
				routemodel="hub"
				columns={[
					{
						field: "name",
						label: "Name",
						sortable: true,
						filter: true,
						frozen: true,
						width: "500px",
						formatter: DataTableDynamicFormatter.link('admin.hubs.edit'),
					},
					{
						field: "url",
						label: "URL",
						sortable: true,
						filter: true,
						editor: "text",
						width: "300px",
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
		</AuthenticatedLayout>
	);
}
