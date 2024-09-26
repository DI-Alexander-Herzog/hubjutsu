import axios from "axios";
import { Column } from "primereact/column";
import { DataTable as PrimeTable } from "primereact/datatable";
import { useEffect, useState } from "react";


export default function DataTable({children, routes="", filters={}}: {children: any, routes: string|Record<string, string>, filters: Record<string, any>}) {
    
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
            console.log(response);
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
        event['first'] = 0;
        setSearchState(event);
    };

    const onSelectionChange = (event:any) => {
        const value = event.value;

        setSelectedRecords(value);
        setSelectAll(value.length === totalRecords);
    };

    const onSelectAllChange = (event:any) => {
        const selectAll = event.checked;
        alert(selectAll);
        if (selectAll) {
            setSelectedRecords(records);
            
        } else {
            setSelectAll(false);
            setSelectedRecords([]);
        }
    };

    return (
            <PrimeTable value={records} lazy filterDisplay="row" dataKey="id" paginator selectionMode="multiple"
                    first={searchState.first} rows={10} totalRecords={totalRecords} onPage={onPage}
                    onSort={onSort} sortField={searchState.sortField} sortOrder={searchState.sortOrder}
                    onFilter={onFilter} filters={searchState.filters} loading={loading} tableStyle={{ minWidth: '75rem' }}
                    selection={selectedRecords} onSelectionChange={onSelectionChange} selectAll={selectAll} onSelectAllChange={onSelectAllChange}>
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                {children}
            </PrimeTable>
    );


}