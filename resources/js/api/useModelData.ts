import { useEffect, useState, useCallback } from "react";
import modelAPI from "@hubjutsu/api/modelAPI";
import type { ModelKey, ModelType } from "@/types/models";

interface UseModelDataOptions<K extends ModelKey> {
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
	auto?: boolean; // ob beim Mount automatisch laden
}

/**
 * React-Hook für Model-Daten.
 * Nutzt dein modelAPI.search() und lädt automatisch neu bei State-Änderungen.
 */
export function useModelData<K extends ModelKey>(
	model: K,
	options: UseModelDataOptions<K> = {},
	key = "id"
) {
	const { filter = {}, with: withs = [], order = [], search, init, limit = 999, auto = true } = options;

	const [data, setData] = useState<ModelType<K>[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<any>(null);

	const api = modelAPI(model, key, withs);

	const reload = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await api.search({ filter, order, search, init, limit });
			setData(res.data);
		} catch (err) {
			setError(err);
		} finally {
			setLoading(false);
		}
	}, [model, JSON.stringify(filter), JSON.stringify(order), search, init, limit]);

	useEffect(() => {
		if (auto) reload();
	}, [reload, auto]);

	return { data, loading, error, reload };
}
