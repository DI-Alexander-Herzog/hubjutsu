import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@/Components/DataTable";
import { DataTableDynamicFormatter } from "@/Components/DataTableDynamicFormatter";

import IconLibrary from "@/Components/IconLibrary";
import { Column } from "@hubjutsu/Components/DataTable";
import { DataTableFormatter } from "@/Components/DataTableFormatter";

export default function HubIndex({extraColumns}: {extraColumns?: Column[]	}) {
	return (
		<AuthenticatedLayout title="Hubs"
			breadcrumbs={[
				{ label: 'Settings', url: route('settings.index'), icon:<IconLibrary name="cog" /> }, 
				{ label: 'Hubs', icon: <IconLibrary name="folder" /> }
			]}
		>
			<DataTable
				routemodel="hub"
				with={['logo']}
				columns={[
					{
						field: "logo",
						label: "Logo",
						sortable: false,
						filter: false,
						frozen: true,
						width: "100px",
						editor: "media",
						formatter: DataTableFormatter.media,
					},
					{
						field: "name",
						label: "Name",
						sortable: true,
						filter: true,
						frozen: true,
						width: "500px",
						editor: "text",
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
						editor: "boolean",
						formatter: DataTableFormatter.boolean,
						width: "300px",
					},
					...(extraColumns || [])
				]}
			></DataTable>
		</AuthenticatedLayout>
	);
}
