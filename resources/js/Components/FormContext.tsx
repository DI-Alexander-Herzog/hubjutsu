import { createContext, useContext, useEffect, useState } from "react";

import { UseForm } from "@/types";
import axios from "axios";
import ErrorToast from "@/Components/ErrorToast";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "./SecondaryButton";
import { router } from "@inertiajs/react";
import { useLaravelReactI18n } from "laravel-react-i18n";

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
      _setData(response.data);
      return response.data;

    } catch (err: any) {
      setError(err.response?.data?.message || data);
      setLoading(false);
      throw err;
    }
  };

  return (
    <Ctx.Provider value={{ form, save, loading, error, recentlySuccessful, readonly}}>
	    {error && <ErrorToast error={error} onClose={() => {setError(null); setLoading(false); }} />}
      <div className="space-y-4 py-4">
        {children}
      </div>
      
    </Ctx.Provider>
  );
}

export function FormContextSubmitButton({ children, className, postSave, editLink }: { editLink?: string; children: React.ReactNode; className?: string, postSave?: (data?: any) => void }) {
  const { save, loading, readonly, recentlySuccessful } = useFormContext();
  const { t } = useLaravelReactI18n();
  
  if (readonly) {
    if (editLink) {
      return <SecondaryButton onClick={() => router.visit(editLink)} className={className}>{t('Edit')}</SecondaryButton>;
    }
    return;
  }

  return (
	<PrimaryButton
    type="submit"
		onClick={(e) => {
			e.preventDefault();
			save().then((data) => {
				postSave?.(data);
			});
		}}
		disabled={loading}
    className="w-fit"
	>
		{children}
    {recentlySuccessful ? <span className="ml-2 text-green-500">✓</span> : null}
	</PrimaryButton>
  );
}

