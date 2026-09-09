"use client";

import { useMemo, useState } from "react";
import { PdFilters } from "@/components/dashboard/PdFilters";
import { PdTable, type PdRow } from "@/components/dashboard/PdTable";

export function PdDashboardBody({
  rows,
  providers,
}: {
  rows: PdRow[];
  providers: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => row.code.toLowerCase().includes(query));
  }, [rows, search]);

  return (
    <>
      <PdFilters providers={providers} search={search} onSearchChange={setSearch} />

      <div className="rounded-lg border border-line bg-card">
        <PdTable rows={filteredRows} />
      </div>
    </>
  );
}
