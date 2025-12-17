import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "@/Components/Modal";
import DataTable from "@/Components/DataTable";
import type { Column } from "@/Components/DataTable";

type ScopeConfig = {
	type: string;
	id: number;
	label?: string;
};

type AssignmentSummary = {
	id: number;
	role?: { id: number; name: string | null };
	user?: { id: number; name: string | null; email: string | null };
};

type StackResponse = {
	scope: {
		id: number;
		type: string;
		label: string;
		type_label: string;
	};
	direct_count: number;
	ancestors: Array<{
		id: number;
		type: string;
		type_label: string;
		label: string;
		assignments: AssignmentSummary[];
	}>;
};

interface RoleAssignmentModalProps {
	open: boolean;
	onClose: () => void;
	scope: ScopeConfig;
}

const valueOrFallback = (value?: string | null, fallback?: string | null) => {
	if (value && value.length > 0) return value;
	if (fallback && fallback.length > 0) return fallback;
	return null;
};

export default function RoleAssignmentModal({
	open,
	onClose,
	scope,
}: RoleAssignmentModalProps) {
	const [stackData, setStackData] = useState<StackResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;

		setLoading(true);
		setError(null);

		axios
			.get(route("api.roleassignments.stack"), {
				params: {
					scope_type: scope.type,
					scope_id: scope.id,
				},
			})
			.then((response) => {
				setStackData(response.data);
			})
			.catch((err) => {
				console.error(err);
				setError(
					err?.response?.data?.message ??
						err?.message ??
						"Failed to load role assignment stack."
				);
			})
			.finally(() => setLoading(false));
	}, [open, scope.type, scope.id]);

	const scopeLabel = stackData?.scope?.label ?? scope.label ?? "";

	const columns = useMemo<Column[]>(
		() => [
			{
				field: "user_id",
				label: "User",
				width: "220px",
				frozen: true,
				editor: {
					type: "model",
					model: "user",
					labelField: "name",
					with: ["push_tokens"],
					columns: [
						{ field: "name", label: "Name", width: "60%" },
						{ field: "email", label: "E-Mail", width: "40%" },
					],
				},
				formatter: (row) => (
					<div className="flex flex-col">
						<span className="font-medium text-gray-900 dark:text-gray-50">
							{valueOrFallback(row.user?.name, row.user?.email) ??
								`#${row.user_id}`}
						</span>
								{row.user?.email && (
							<span className="text-xs text-gray-500">{row.user.email}</span>
						)}
					</div>
				),
			},
			{
				field: "role_id",
				label: "Role",
				width: "160px",
				editor: {
					type: "model",
					model: "role",
					labelField: "name",
					columns: [{ field: "name", label: "Role" }],
				},
				formatter: (row) => (
					<span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
						{row.role?.name ?? `#${row.role_id}`}
					</span>
				),
			},
			{
				field: "created_at",
				label: "Assigned",
				width: "140px",
				sortable: true,
				formatter: (row) => {
					if (!row.created_at) return "-";
					const date = new Date(row.created_at);
					return date.toLocaleString();
				},
			},
		],
		[]
	);

	const filters = useMemo(
		() => ({
			scope_type: scope.type,
			scope_id: scope.id,
		}),
		[scope.type, scope.id]
	);

	return (
		<Modal
			show={open}
			onClose={onClose}
			maxWidth="2xl"
			title="Role assignments"
			subtitle={
				scopeLabel
					? `${scopeLabel} • ${stackData?.scope?.type_label ?? ""}`
					: stackData?.scope?.type_label
			}
		>
			<div className="space-y-4">
				{error && (
					<div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
						{error}
					</div>
				)}

				<div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-xs uppercase tracking-wide text-gray-500">
								Scope
							</p>
							<p className="text-base font-semibold text-gray-900 dark:text-gray-50">
								{scopeLabel || "Role assignments"}
							</p>
						</div>
						<div className="text-right">
							<p className="text-xs uppercase tracking-wide text-gray-500">
								Direct assignments
							</p>
							<p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
								{stackData?.direct_count ?? "—"}
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<div className="text-sm font-medium text-gray-900 dark:text-gray-50">
						Inherited roles
					</div>
					{loading && !stackData ? (
						<p className="text-sm text-gray-500">Loading…</p>
					) : stackData?.ancestors?.length ? (
						<div className="space-y-3">
							{stackData.ancestors.map((ancestor) => (
								<div
									className="rounded-md border border-gray-200 p-3 dark:border-gray-700"
									key={`${ancestor.type}-${ancestor.id}`}
								>
									<div className="text-xs uppercase tracking-wide text-gray-500">
										{ancestor.type_label}
									</div>
									<div className="text-sm font-medium text-gray-900 dark:text-gray-50">
										{ancestor.label}
									</div>
									<div className="mt-2 flex flex-wrap gap-2">
										{ancestor.assignments.map((assignment) => (
											<div
												key={assignment.id}
												className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-200"
											>
												<span className="font-semibold text-primary">
													{assignment.role?.name ?? "Role"}
												</span>
												{assignment.user && (
													<span className="text-gray-500">
														({valueOrFallback(
															assignment.user.name,
															assignment.user.email
														)})
													</span>
												)}
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-gray-500">
							No inherited roles for this scope.
						</p>
					)}
				</div>

				<div className="rounded-md border border-gray-200 p-1 dark:border-gray-700">
					<DataTable
						key={`${scope.type}:${scope.id}`}
						routemodel="role-assignment"
						with={["user", "role"]}
						columns={columns}
						filters={filters}
						height="360px"
						defaultSortField={[["created_at", -1]]}
						newRecord={{
							scope_type: scope.type,
							scope_id: scope.id,
						}}
					/>
				</div>
			</div>
		</Modal>
	);
}
