import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { handleDoubleClick } from "@hubjutsu/Helper/doubleClick";
import { ChevronDownIcon } from "@heroicons/react/16/solid";


// 📌 Spalten-Typen definieren
interface Column {
  label?: string;
  field: string;
  editor?: "text" | "number" | "select" | any;
  editor_properties?: Record<string, any>;
  sortable?: boolean;
  filter?: boolean | string | any;
  frozen?: boolean;
  width?: string;
  align?: string;
  headerAlign?: string;
  formatter?: (row: Row) => JSX.Element;
}

interface Row {
  [key: string]: any;
}

interface Routes {
  search: string;
  delete?: string;
  update?: string;
  create?: string;
}

interface DataTableProps {
  routes: string | Routes;
  columns: Column[];
  filters?: Record<string, any>;
  height?: string;
  datakey?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  routes,
  columns,
  filters = {},
  datakey = "id",
}) => {

  const tableRef = useRef<HTMLTableElement>(null);

  // 📌 Routen für API-Anfragen
  const apiRoutes: Routes =
    typeof routes === "string"
      ? {
          search: `/api/model/${routes}`,
          delete: `/api/model/${routes}/delete`,
          update: `/api/model/${routes}/update`,
          create: `/api/model/${routes}/create`,
        }
      : routes;

  // 📌 State-Variablen
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [records, setRecords] = useState<Row[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Row[]>([]);
  const [editingRecord, setEditingRecord] = useState<{ [key: string]: boolean }>({});
  const [searchState, setSearchState] = useState({
    first: 0,
    rows: 10,
    page: 1,
    filters,
    multiSortMeta: { [datakey]: 1 },
  });

  // 📌 Daten laden
  useEffect(() => {
    loadLazyData();
  }, [searchState]);

  const loadLazyData = () => {
    setLoading(true);
    axios.get(apiRoutes.search, { params: searchState }).then((response) => {
      setLoading(false);
      setRecords(response.data.data);
      setTotalRecords(response.data.total);
    });
  };

  // 📌 Sortierung
  const handleSort = (field: string) => {
    setSearchState((prev) => {
        
        let ms = prev.multiSortMeta;

        if (!ms[field]) {
            ms = { [field]: 1 };
        } else if (ms[field] == 1) {
            ms = { [field]: -1 };
        } else {
            delete ms[field];
        }
        return {
            ...prev,
            multiSortMeta: ms
        }
    });
  };

  // 📌 Paginierung
  const onPageChange = (newPage: number) => {
    setSearchState((prev) => ({
      ...prev,
      page: newPage,
      first: (newPage - 1) * prev.rows,
    }));
  };

  // 📌 Inline-Editing aktivieren
  const enableEditing = (id: string) => {
    setEditingRecord((prev) => ({ ...prev, [id]: true }));
  };

  // 📌 Inline-Editing speichern / abbrechen
  const handleKeyDown = (e: any, id: string, field: string) => {
    if ( (e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      setEditingRecord((prev) => ({ ...prev, [id]: false }));
    }
    if (e.key === "Escape") {
      setEditingRecord((prev) => ({ ...prev, [id]: false }));
    }
  };

  // 📌 Zeile auswählen
  const toggleRowSelection = (row: Row) => {
    setSelectedRecords((prev) =>
      prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row]
    );
  };

  // 📌 Alle Zeilen auswählen
  const toggleSelectAll = () => {
    setSelectedRecords(records.length === selectedRecords.length ? [] : [...records]);
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* 📌 Tabelle */}
      <table ref={tableRef} className="table-fixed border-collapse w-full min-w-max">
        {/* 📌 Tabellenkopf */}
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-4 py-2" style={ {width: "3em"} }>
              <input type="checkbox" checked={records.length === selectedRecords.length} onChange={toggleSelectAll} />
            </th>
            {columns.map((col) => (
              <th key={col.field} className="border px-4 py-2 cursor-pointer" onClick={() => handleSort(col.field)}>
                {col.label} ⬍
              </th>
            ))}
          </tr>
        </thead>

        {/* 📌 Tabellenkörper */}
        <tbody>
          {records.map((row) => (
            <tr key={row[datakey]} className="hover:bg-gray-100">
              <td className="border px-4 py-2">
                <input type="checkbox" checked={selectedRecords.includes(row)} onChange={() => toggleRowSelection(row)} />
              </td>
              {columns.map((col) => (
                <td
                  key={col.field}
                  className="border px-4 py-2"
                  onClick={ handleDoubleClick( () => toggleRowSelection(row), () => enableEditing(row[datakey]) ) }
                >
                    {(editingRecord[row[datakey]] && col.editor) ? (
                        <>
                        { !col.editor && <></>}
                        {col.editor === "number" && <input
                            type="number"
                            defaultValue={row[col.field]}
                            onKeyDown={(e) => handleKeyDown(e, row[datakey], col.field)}
                            className="w-full px-2 py-1 border rounded"
                            autoFocus
                            { ...col.editor_properties }
                        />}

                        {col.editor === "select" && <select
                            defaultValue={row[col.field]}
                            onKeyDown={(e) => handleKeyDown(e, row[datakey], col.field)}
                            className="w-full px-2 py-1 border rounded"
                            { ...col.editor_properties }
                        >
                            {col.editor_properties?.options?.map((option:any, index:number) => (
                            <option key={index} value={option.value}>
                                {option.label}
                            </option>
                            ))}
                        </select>}

                        {col.editor === "text" && <input
                            type="text"
                            defaultValue={row[col.field]}
                            onKeyDown={(e) => handleKeyDown(e, row[datakey], col.field)}
                            className="w-full px-2 py-1 border rounded"
                            autoFocus
                        />
                        }   
                        </>
                    ) : (
                        <>
                            
                            {col.formatter ? col.formatter(row) : row[col.field] }
                        </>
                    )}
                    
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 📌 Paginierung */}
      
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
            <button 
                onClick={() => onPageChange(Math.max(searchState.page - 1, 1))} 
                disabled={searchState.page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
            Previous
            </button>
            <button 
                onClick={() => onPageChange(searchState.page + 1)} 
                disabled={searchState.page >= Math.ceil(totalRecords / searchState.rows)}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
            Next
            </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
                <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{1 + searchState.first}</span> to <span className="font-medium"> { searchState.first + searchState.rows < totalRecords ? searchState.first + searchState.rows : totalRecords }</span> of{' '}
                    <span className="font-medium">{ totalRecords }</span> results
                    
                </p>
                
            </div>
            <div className="mt-2 grid grid-cols-1">
                <select
                    id="location"
                    name="location"
                    defaultValue={searchState.rows}
                    onChange={(e) => setSearchState((prev) => ({ ...prev, rows: parseInt(e.target.value) }))}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    >
                        { [2, 10, 50, 100, 1000].map( (lines) => (
                            <option selected={ lines == searchState.rows } > { lines }</option>
                        ))}
                </select>
            </div>
            <div>
            <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <button 
                    onClick={() => onPageChange(Math.max(searchState.page - 1, 1))} 
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                    >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon aria-hidden="true" className="size-5" />
                </button>
                {Array.from({ length: Math.min(7, Math.ceil(totalRecords / searchState.rows)) }, (_, i) => {
                    const page = i + 1;
                    const isCurrent = page === searchState.page;
                    const isNearCurrent = Math.abs(page - searchState.page) <= 2;
                    const isFirstOrLast = page === 1 || page === Math.ceil(totalRecords / searchState.rows);

                    if (isCurrent || isNearCurrent || isFirstOrLast) {
                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                    isCurrent ? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" :  "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                                } focus:z-20 focus:outline-offset-0`}
                            >
                                {page}
                            </button>
                        );
                    }

                    if (page === searchState.page - 3 || page === searchState.page + 3) {
                        return (
                            <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                ...
                            </span>
                        );
                    }

                    return null;
                })}
                <button
                    onClick={() => onPageChange(searchState.page + 1)} 
                    disabled={searchState.page >= Math.ceil(totalRecords / searchState.rows)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon aria-hidden="true" className="size-5" />
                </button>
            </nav>
            </div>
        </div>
        </div>

    </div>
  );
};

export default DataTable;
