import React, { useEffect, useState, useRef, JSX } from "react";
import axios from "axios";
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/20/solid'
import { handleDoubleClick } from "@hubjutsu/Helper/doubleClick";
import classNames from "classnames";
import Checkbox from "./Checkbox";

import { Transition } from '@headlessui/react'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/20/solid'

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

interface DataTableProps {
  routemodel?: string;
  columns: Column[];
  filters?: Record<string, any>;
  height?: string;
  datakey?: string;
  newRecord?: false | Record<string, any> | string | (() => void) | null; // Neuer Parameter
}

const DataTable: React.FC<DataTableProps> = ({
  routemodel,
  columns,
  filters = {},
  datakey = "id",
  height,
  newRecord = null, // Standardwert
}) => {

  const tableRef = useRef<HTMLTableElement>(null);

  // 📌 State-Variablen
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [records, setRecords] = useState<Row[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Row[]>([]);
  const [error, setError] = useState<null|string|any>(null);
  const [editingRecord, setEditingRecord] = useState<{ [key: string]: Row }>({});
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
    setError(null);
    setSelectedRecords([]);
    setEditingRecord({});

    setLoading(true);
    axios.get( route('api.model.search', { model: routemodel }), { params: searchState } ).then((response) => {
      setLoading(false);
      setRecords(response.data.data);
      setTotalRecords(response.data.total);

    }).catch((error) => {
        setLoading(false);
        setError(error);
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
  const enableEditing = (row:Row) => {
    toggleRowSelection(row, true);
    setEditingRecord((prev) => ({ ...prev, [row[datakey]]: row }));
  };

  const disableEditing = (id: string) => {
    setEditingRecord((prev) => {
      delete prev[id]; 
      return {...prev};
    });
  };

  // 📌 Inline-Editing speichern / abbrechen
  
  const handleKeyDown = (e: any, field: string, row:Row, row_ofs:number) => {
    if ( (e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        
        setRecords((prev) => {
            const newRecords = [...prev];
            newRecords[row_ofs] = editingRecord[row[datakey]];
            return newRecords;
        });

        console.log('SAVE', editingRecord[row[datakey]]);
        setLoading(true);
        
        const updateOrCreateRoute = row[datakey] ? route('api.model.update', {model: routemodel, id: row[datakey]}) : route('api.model.create', {model: routemodel});
        console.log('ROUTE', row[datakey], updateOrCreateRoute);

        axios.post( updateOrCreateRoute , editingRecord[row[datakey]] ).then((response) => {
            setLoading(false);
            console.log('RESPONSE', response);

            disableEditing(row[datakey]); 

            setRecords((prev) => {
                const newRecords = [...prev];
                newRecords[row_ofs] = response.data;
                return newRecords;
            });

        }).catch((error) => {
            setError(error);
            setLoading(false);
        });
    }
    if (e.key === "Escape") {
      disableEditing(row[datakey]);
    }
  };

  const setRowValue = (id: string, field: string, value: any) => {
    setEditingRecord((prev) => {
      const row = prev[id];
      return { ...prev, [id]: { ...row, [field]: value } };
    });
  }

  // 📌 Zeile auswählen
  const toggleRowSelection = (row: Row, state?:boolean) => {
    if (editingRecord[row[datakey]]) {
      state = true;
    }

    if (state === undefined) {
      setSelectedRecords((prev) =>
        prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row]
      );  
    } else if (state) {
      setSelectedRecords((prev) => [...prev, row]);
    } else {
      setSelectedRecords((prev) => prev.filter((r) => r !== row));  
    }
    
  };

  // 📌 Alle Zeilen auswählen
  const toggleSelectAll = () => {
    setSelectedRecords(records.length === selectedRecords.length ? [] : [...records]);
  };

  // 📌 Neue Zeile hinzufügen oder Aktion ausführen
  const handleNewRecord = () => {
    if (newRecord === false) return; // Keine Aktion, wenn `newRecord` false ist

    if (typeof newRecord === "string") {
      // Route öffnen
      window.location.href = newRecord;
    } else if (typeof newRecord === "function") {
      // Callback ausführen
      newRecord();
    } else {
      // Neue Zeile erstellen
      const newRow = newRecord || { [datakey]: 0 };
      setRecords((prev) => [newRow, ...prev]); // Neue Zeile oben hinzufügen
      setEditingRecord((prev) => ({
        ...prev,
        [newRow[datakey] ]: newRow,
      })); // Direkt in den Bearbeitungsmodus wechseln
    }
  };


  return (
    <div className={ classNames("w-full flex flex-col overflow-x-auto", {'h-full': !height}) }>
        <div className="relative flex-grow overflow-y-auto" {...(height ? { style: { height } } : {})}>
        <Transition show={ error }>
            <div className="absolute right-2 top-2 z-10 pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-[closed]:data-[enter]:translate-y-2 data-[enter]:transform data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-100 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:data-[enter]:sm:translate-x-2 data-[closed]:data-[enter]:sm:translate-y-0">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <ExclamationCircleIcon aria-hidden="true" className="size-6 text-red-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Fehler beim Laden!</p>
                    <p className="mt-1 text-sm text-gray-500">{ (typeof error == "string") ? error : ( error ? error.message : '') }</p>
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                      }}
                      className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon aria-hidden="true" className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        {/* 📌 Tabelle */}
        <table ref={tableRef} className="table-fixed border-separate border-spacing-0 min-w-full w-min">
            {/* 📌 Tabellenkopf */}
            <thead className="bg-gray-200 sticky top-0">
            <tr>
                <th className="border px-2 py-1 sticky left-0" style={ {width: "2em"} }>
                    <Checkbox checked={records.length === selectedRecords.length} onChange={toggleSelectAll} ></Checkbox>
                </th>
                {columns.map((col, idx, columns) => {
                    const completeOfs = [ "2em" ];
                    if (col.frozen) {
                        for (let ofs = 0; ofs < idx; ofs++) {
                            if (columns[ofs].frozen) {
                                completeOfs.push(columns[ofs].width || "150px");
                            }
                        }
                    }
                    return <th key={col.field} 
                                { ...{ style: { 
                                    width: col.width || '150px',
                                    left: 'calc(' + completeOfs.join(' + ') + ')'
                                } } } 
                                className={ classNames("border text-center px-4 py-2 cursor-pointer", { "sticky": col.frozen }) } onClick={() => handleSort(col.field)}
                            >
                            {col.label} ⬍
                        </th>
                })}
            </tr>
            </thead>

            {/* 📌 Tabellenkörper */}
            <tbody>
            {records.map((row, row_ofs) =>  {
                let firstEditor = true;
                return (
                  <tr key={row[datakey]} className="hover:bg-gray-100">
                  <td className="border text-center px-2 py-1 sticky left-0">
                      <Checkbox checked={selectedRecords.includes(row)} onChange={() => toggleRowSelection(row)}></Checkbox>
                  </td>
                  {columns.map((col, idx, columns) => {
                      const completeOfs = [ "2em" ];
                      if (col.frozen) {
                          for (let ofs = 0; ofs < idx; ofs++) {
                              if (columns[ofs].frozen) {
                                  completeOfs.push(columns[ofs].width || "150px");
                              }
                          }
                      }
                      if (col.editor && firstEditor) {
                          col.editor_properties = col.editor_properties || {};
                          col.editor_properties.autoFocus = true;
                          firstEditor = false;
                      } 
                      return <td
                          key={col.field}
                          { ...{ style: { 
                              width: col.width || '150px',
                              left: 'calc(' + completeOfs.join(' + ') + ')'
                          } } } 
                          className={ classNames("border", {"px-2 py-1": !(editingRecord[row[datakey]] && col.editor) , "sticky": col.frozen }) } 
                          onClick={ handleDoubleClick( () => toggleRowSelection(row), () => enableEditing(row) ) }
                          >
                              {(editingRecord[row[datakey]] && col.editor) ? (
                                  <>
                                  {col.editor === "number" && <input
                                      type="number"
                                      defaultValue={row[col.field]}
                                      onKeyDown={(e) => handleKeyDown(e, col.field, row, row_ofs )}
                                      className="w-full px-2 py-1 border rounded"
                                      { ...col.editor_properties }
                                      onChange={(e) => setRowValue(row[datakey], col.field, e.target.value)}
                                  />}

                                  {col.editor === "select" && <select
                                      defaultValue={row[col.field]}
                                      onKeyDown={(e) => handleKeyDown(e, col.field, row, row_ofs )}
                                      className="w-full px-2 py-1 border rounded"
                                      { ...col.editor_properties }
                                      onChange={(e) => setRowValue(row[datakey], col.field, e.target.value)}
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
                                      onKeyDown={(e) => handleKeyDown(e, col.field, row, row_ofs )}
                                      onChange={(e) => setRowValue(row[datakey], col.field, e.target.value)}
                                      className="w-full px-2 py-1 border rounded"
                                      { ...col.editor_properties }
                                  />
                                  }   
                                  </>
                              ) : (
                                  <div className="whitespace-nowrap overflow-hidden overflow-ellipsis w-full block">
                                      {col.formatter ? col.formatter(row) : row[col.field] }
                                  </div>
                              )}
                              
                          </td>
                  })}
                  </tr>
                );
              }
            )}
            </tbody>
        </table>
        </div>
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
                <div className="flex flex-row items-center gap-4">
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{1 + searchState.first}</span> to <span className="font-medium"> { searchState.first + searchState.rows < totalRecords ? searchState.first + searchState.rows : totalRecords }</span> of{' '}
                        <span className="font-medium">{ totalRecords }</span> results
                        
                    </p>

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
                                            isCurrent ? "z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :  "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
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

                    <select
                        defaultValue={searchState.rows}
                        onChange={(e) => setSearchState((prev) => ({ ...prev, rows: parseInt(e.target.value) }))}
                        className="appearance-none rounded-md bg-white px-auto py-1 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                        >
                            { [2, 10, 50, 100, 1000].map( (lines) => (
                                <option key={lines} > { lines }</option>
                            ))}
                    </select>

                    <button
                            onClick={() => ( loadLazyData() ) }
                            className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                        >
                            <span className="sr-only">Reload</span>
                            <ArrowPathIcon aria-hidden="true" className={ classNames("size-5 ", {"animate-spin": loading} ) } />
                    </button>

                    {/* "New"-Button */}
                    {newRecord !== false && (
                      <button
                        onClick={handleNewRecord}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        New
                      </button>
                    )}
                </div>
                <div>
                    
                </div>
            </div>
        </div>
    </div>
  );
};

export default DataTable;
