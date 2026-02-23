import axios from "axios";
import type { ModelKey, ModelType } from "@/types/models";

/**
 * Einheitliche API-Klasse für alle Models.
 * - Kompatibel mit DataTable-Struktur (filters, with, order, search)
 * - Keine Pagination (default rows = 999)
 * - Mit optionalem Default-With aus dem Konstruktor
 */
export class ModelAPI<K extends ModelKey> {
	constructor(
		private model: K,
		private key: string = "id",
		private defaultWith: string[] = []
	) {}

	/** 🔍 Suche nach Records (DataTable-kompatibel) */
	async search({
		filter = {},
		with: withs = [],
		order = [],
		search,
		init,
		limit = 999,
	}: {
		filter?: Record<
			string,
			| any
			| {
					matchMode: string;
					value: any;
			  }
		>;
		with?: string[];
		order?: Array<[string, number]> | string[];
		search?: string;
		init?: string;
		limit?: number;
	} = {}): Promise<{ data: ModelType<K>[]; total?: number }> {
		const filtersArray = Object.entries(filter).map(([field, value]) => {
			if (
				value &&
				typeof value === "object" &&
				"value" in value &&
				"matchMode" in value
			) {
				return {
					field,
					matchMode: (value as any).matchMode,
					value: (value as any).value,
				};
			}
			if (Array.isArray(value)) {
				return { field, matchMode: "IN", value };
			}
			return { field, matchMode: "=", value };
		});

		const params = {
			first: 0,
			rows: limit,
			page: 1,
			filters: filtersArray,
			multiSortMeta: Array.isArray(order)
				? order.map((o) => (Array.isArray(o) ? o : [o, 1]))
				: [],
			with: [...this.defaultWith, ...withs],
			search,
			init,
		};

		const res = await axios.get<{ data: ModelType<K>[]; total?: number }>(
			route("api.model.search", { model: this.model }),
			{ params }
		);

		return res.data;
	}

	/** 🔎 Einzelnes Record holen */
	async find(id: number | string, withs: string[] = []): Promise<ModelType<K>> {
		const res = await axios.get<ModelType<K>>(
			route("api.model.get", { model: this.model, id }),
			{ params: { with: [...this.defaultWith, ...withs] } }
		);
		return res.data;
	}

	/** 🆕 Record erstellen */
	async create(data: Partial<ModelType<K>>): Promise<ModelType<K>> {
		const res = await axios.post<ModelType<K>>(
			route("api.model.create", { model: this.model }),
			data
		);
		return res.data;
	}

	/** ✏️ Record updaten */
	async update(id: number | string, data: Partial<ModelType<K>>): Promise<ModelType<K>> {
		const res = await axios.post<ModelType<K>>(
			route("api.model.update", { model: this.model, [this.key]: id }),
			data
		);
		return res.data;
	}

	/** 🗑️ Record löschen */
	async delete(id: number | string): Promise<void> {
		await axios.delete(route("api.model.delete", { model: this.model, id }));
	}

	/** ♻️ Record wiederherstellen */
	async restore(id: number | string): Promise<ModelType<K>> {
		const res = await axios.post<ModelType<K>>(
			route("api.model.restore", { model: this.model, id })
		);
		return res.data;
	}
}

/** 🔧 Factory für bequemen Zugriff */
export default function modelAPI<K extends ModelKey>(
	model: K,
	key = "id",
	withs: string[] = []
) {
	return new ModelAPI<K>(model, key, withs);
}
