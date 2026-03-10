"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, EXPERIMENT_STATUSES, type ExperimentStatus } from "@/lib/utils/constants";
import type { Experiment } from "@/types/experiment";

type ExperimentTableProps = {
  readonly experiments: readonly Experiment[];
  readonly metricName: string;
  readonly metricDirection: string;
};

function findBestExperimentId(
  experiments: readonly Experiment[],
  direction: string,
): string | null {
  const keepExperiments = experiments.filter((e) => e.status === "keep");
  if (keepExperiments.length === 0) return null;

  const best = keepExperiments.reduce((prev, curr) => {
    if (direction === "lower_is_better") {
      return curr.metric_value < prev.metric_value ? curr : prev;
    }
    return curr.metric_value > prev.metric_value ? curr : prev;
  });

  return best.id;
}

export function ExperimentTable({
  experiments,
  metricName,
  metricDirection,
}: ExperimentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const bestId = useMemo(
    () => findBestExperimentId(experiments, metricDirection),
    [experiments, metricDirection],
  );

  const columns = useMemo<ColumnDef<Experiment>[]>(
    () => [
      {
        accessorKey: "sequence",
        header: "#",
        cell: ({ getValue }) => (
          <span className="font-mono text-gray-500">
            {getValue<number>()}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "commit_hash",
        header: "Commit",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-gray-600">
            {getValue<string>().slice(0, 8)}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "metric_value",
        header: metricName,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-700">
            {getValue<number>().toFixed(4)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "memory_gb",
        header: "Memory (GB)",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-500">
            {getValue<number>().toFixed(1)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<ExperimentStatus>();
          const color = STATUS_COLORS[status];
          return (
            <Badge
              variant="outline"
              className="gap-1.5 capitalize"
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {status}
            </Badge>
          );
        },
        filterFn: (row, _columnId, filterValue: string) => {
          if (filterValue === "all") return true;
          return row.getValue<string>("status") === filterValue;
        },
        enableSorting: false,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ getValue }) => (
          <span className="max-w-[300px] truncate text-sm text-gray-500">
            {getValue<string>()}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [metricName],
  );

  // Apply the global status filter to the status column
  const mutableExperiments = useMemo(
    () => [...experiments],
    [experiments],
  );

  const table = useReactTable({
    data: mutableExperiments,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    table.getColumn("status")?.setFilterValue(value === "all" ? "all" : value);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Experiments</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs text-gray-500">
            Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-gray-400"
          >
            <option value="all">All</option>
            {EXPERIMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-gray-200">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-gray-500",
                      header.column.getCanSort() && "cursor-pointer select-none",
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === "asc" && " \u2191"}
                      {header.column.getIsSorted() === "desc" && " \u2193"}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const isBest = row.original.id === bestId;
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-gray-200",
                    isBest && "bg-emerald-50",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-gray-400"
                >
                  No experiments match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
