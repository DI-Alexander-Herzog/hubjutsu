import axios from "axios";
import { useLaravelReactI18n } from "laravel-react-i18n";
import { Column } from "primereact/column";
import { DataTable as PrimeTable } from "primereact/datatable";
import { useEffect, useState } from "react";


export default function DataTable({children, routes="", filters={}, height='400px'}: {height:string, children: any, routes: string|Record<string, string>, filters: Record<string, any>}) {
    const { t } = useLaravelReactI18n();

    if (typeof routes == "string") {
        routes = {
            search: '/api/' + routes,
            delete: '/api/' + routes + '/delete',
            update: '/api/' + routes + '/update',
            create: '/api/' + routes + '/create'
        };
    }

    const [loading, setLoading] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [records, setRecords] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [searchState, setSearchState] = useState({
        first: 0,
        rows: 10,
        page: 1,
        sortField: "id",
        sortOrder: null,
        filters: filters
    });


    useEffect(() => {
        loadLazyData();
    }, [searchState]);

    const loadLazyData = () => {
        setLoading(true);

        axios.get(routes.search, {params: searchState }).then((response) => {
            setLoading(false);
            setRecords(response.data.data);
            setTotalRecords(response.data.total);
        });
    };

    const onPage = (event:any) => {
        setSearchState(event);
    };

    const onSort = (event:any) => {
        setSearchState(event);
    };

    const onFilter = (event:any) => {
        setSearchState(event);
    };

    const onSelectionChange = (event:any) => {
        const value = event.value;

        setSelectedRecords(value);
        setSelectAll(value.length === totalRecords);
    };

    const onSelectAllChange = (event:any) => {
        const selectAllBox = event.checked;

        if (selectAllBox) {
            setSelectedRecords(records);
            setSelectAll(true);
        } else {
            setSelectAll(false);
            setSelectedRecords([]);
        }
    };

    /*
    const renderHeader = () => {
        return (
            <div className="flex justify-content-between">
                <Button type="button" icon="pi pi-filter-slash" label="Clear" outlined onClick={clearFilter} />
                <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                </IconField>
            </div>
        );
    };
    */

    return (
            <PrimeTable 
                size="small" 
                stripedRows 
                showGridlines 
                rowHover
                value={records} 
                lazy 
                dataKey="id" 
                paginator 
                selectionMode="multiple"
                first={searchState.first} 
                rows={searchState.rows} 
                rowsPerPageOptions={[5, 10, 25, 50]}
                totalRecords={totalRecords} 
                onPage={onPage}
                onSort={onSort} 
                sortField={searchState.sortField} 
                sortOrder={searchState.sortOrder}
                onFilter={onFilter} 
                filterDisplay="menu"
                filters={searchState.filters} 
                loading={loading} 
                tableStyle={{ minWidth: '75rem' }}
                selection={selectedRecords} 
                onSelectionChange={onSelectionChange} 
                selectAll={selectAll} 
                onSelectAllChange={onSelectAllChange}
                scrollable 
                scrollHeight={height}
                emptyMessage={t("Keine Einträge gefunden")}
                filterClearIcon="pi pi-filter-slash"
            >
                <Column selectionMode="multiple"  />
                {children}
            </PrimeTable>
    );


}