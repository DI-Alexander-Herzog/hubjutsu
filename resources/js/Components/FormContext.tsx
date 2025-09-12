import { createContext, useContext, useEffect, useState } from "react";

import { UseForm } from "@/types";
import axios from "axios";
import ErrorToast from "@/Components/ErrorToast";
import PrimaryButton from "@/Components/PrimaryButton";

type FormContextType = {
  form: UseForm;
  loading?: boolean;
  error?: string | null;
  save: () => Promise<void>;
  recentlySuccessful?: boolean;
  readonly?: boolean;
};

const Ctx = createContext<FormContextType|null>(null);

export const useFormContext = () => {
  const ctx = useContext(Ctx) as FormContextType | null;
  if (!ctx) throw new Error("useFormContext must be used inside <FormContext>");
  return ctx;
};

export const useOptionalFormContext = () => {
  return useContext(Ctx) as FormContextType | null;
};


type FormContextProps = {
  data: { [key: string]: any };
  model: string;
  datakey?: string;
  with?: string[];
  readonly?: boolean;
  children?: React.ReactNode;
};

export function FormContext({ data, model, children, with: withRelations = [], datakey = "id", readonly = false }: FormContextProps) {
  const [_data, _setData] = useState(data || {});
  
  const form = {
	data: _data,
	setData: _setData,
	errors: {},
  } as UseForm;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentlySuccessful, setRecentlySuccessful] = useState(false);

  const save = async () => {


    setLoading(true);
	setError(null);

	const updateOrCreateRoute = (data as any).id
		? route("api.model.update", {
			model,
			[datakey]: (data as any).id,
			with: withRelations,
		})
		: route("api.model.create", {
			model,
			with: withRelations,
		});

	try {
		const response = await axios.post(updateOrCreateRoute, form.data);
		setLoading(false);
		setRecentlySuccessful(true);
		setTimeout(() => setRecentlySuccessful(false), 2000);
		return response.data;
	} catch (err: any) {
		setError(err);
		setLoading(false);
	}
  };

  return (
    <Ctx.Provider value={{ form, save, loading, error, recentlySuccessful, readonly}}>
	  {error && <ErrorToast error={error} onClose={() => {setError(null); setLoading(false); }} />}
      {children}
	  
    </Ctx.Provider>
  );
}

export function FormContextSubmitButton({ children }: { children: React.ReactNode; className?: string }) {
  const { save, loading, readonly } = useFormContext();
  
  if (readonly) return;

  return (
	<PrimaryButton
		onClick={(e) => {
			e.preventDefault();
			save();
		}}
		disabled={loading}
	>
		{children}
	</PrimaryButton>
  );
}

