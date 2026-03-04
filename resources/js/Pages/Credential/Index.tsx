import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@/Components/DataTable";
import { DataTableDynamicFormatter } from "@/Components/DataTableDynamicFormatter";

export default function CredentialIndex() {
	return (
		<AuthenticatedLayout
			title="Credentials"
			breadcrumbs={[{ label: "Credentials", url: route("credentials.index") }]}
		>
			<DataTable
				routemodel="credential"
				with={["credentialable"]}
				defaultSortField={[["id", -1]]}
				columns={[
					{
						field: "id",
						label: "ID",
						sortable: true,
						filter: true,
						frozen: true,
						width: "100px",
						formatter: (row) => DataTableDynamicFormatter.link((r) => route("credentials.show", [r.id]))(row, "id"),
					},
					{
						field: "name",
						label: "Name",
						sortable: true,
						filter: true,
						width: "220px",
					},
					{
						field: "type",
						label: "Typ",
						sortable: true,
						filter: true,
						width: "160px",
					},
					{
						field: "provider",
						label: "Provider",
						sortable: true,
						filter: true,
						width: "180px",
					},
					{
						field: "status",
						label: "Status",
						sortable: true,
						filter: true,
						width: "120px",
					},
					{
						field: "public_data_summary",
						label: "Public Data",
						sortable: false,
						filter: true,
						width: "320px",
					},
					{
						field: "credentialable_summary",
						label: "Verknüpft mit",
						sortable: false,
						filter: true,
						width: "260px",
					},
					{
						field: "valid_until",
						label: "Valid Until",
						sortable: true,
						filter: true,
						width: "180px",
					},
				]}
			/>
		</AuthenticatedLayout>
	);
}
