import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIncidents } from "@/context/useIncidents";
import {
  Search,
  X,
  LayoutGrid,
  TableProperties,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Incident, IncidentStatus } from "@/types/incident";
import CreateIncidentDialog from "@/components/CreateIncidentDialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SortField =
  | "createdAt"
  | "severity"
  | "status"
  | "type"
  | "country"
  | "responder";

type SortDir = "asc" | "desc";

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function compareSortField(
  a: Incident,
  b: Incident,
  field: SortField,
  dir: SortDir,
): number {
  let cmp = 0;

  switch (field) {
    case "createdAt":
      cmp = a.createdAt.getTime() - b.createdAt.getTime();
      break;
    case "severity":
      cmp =
        (SEVERITY_WEIGHT[a.severity] ?? 0) -
        (SEVERITY_WEIGHT[b.severity] ?? 0);
      break;
    case "status":
      cmp = a.status.localeCompare(b.status);
      break;
    case "type":
      cmp = a.type.localeCompare(b.type);
      break;
    case "country":
      cmp = (a.country ?? "").localeCompare(b.country ?? "");
      break;
    case "responder":
      cmp = (a.responder ?? "").localeCompare(b.responder ?? "");
      break;
  }

  return dir === "asc" ? cmp : -cmp;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportCSV(incidents: Incident[]) {
  const header = [
    "ID",
    "Title",
    "Severity",
    "Status",
    "Type",
    "Source IP",
    "Country",
    "Responder",
    "Response Status",
    "Created At",
  ];

  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const rows = incidents.map((inc) =>
    [
      inc.id,
      inc.title,
      inc.severity,
      inc.status,
      inc.type,
      inc.sourceIP ?? "",
      inc.country ?? "",
      inc.responder ?? "",
      inc.responseStatus ?? "",
      inc.createdAt ? format(inc.createdAt, "yyyy-MM-dd HH:mm:ss") : "",
    ]
      .map(escape)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `incidents_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Incidents = () => {
  const { incidents, loading, updateIncident } = useIncidents();
  const navigate = useNavigate();

  // -- Filters ---------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [responseFilter, setResponseFilter] = useState<string>("all");

  // -- Create dialog ---------------------------------------------------------
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // -- View toggle -----------------------------------------------------------
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // -- Sorting (table view) --------------------------------------------------
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // -- Pagination ------------------------------------------------------------
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // -- Bulk selection (table view) -------------------------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkResponder, setBulkResponder] = useState("");

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setResponseFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    responseFilter !== "all";

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        incident.title.toLowerCase().includes(term) ||
        incident.id.toLowerCase().includes(term) ||
        (incident.sourceIP &&
          incident.sourceIP.toLowerCase().includes(term)) ||
        (incident.country &&
          incident.country.toLowerCase().includes(term)) ||
        (incident.responder &&
          incident.responder.toLowerCase().includes(term));
      const matchesStatus =
        statusFilter === "all" || incident.status === statusFilter;
      const matchesSeverity =
        severityFilter === "all" || incident.severity === severityFilter;
      const matchesResponse =
        responseFilter === "all" ||
        (responseFilter === "responded" &&
          incident.responseStatus === "responded") ||
        (responseFilter === "pending" &&
          incident.responseStatus === "pending");
      return matchesSearch && matchesStatus && matchesSeverity && matchesResponse;
    });
  }, [incidents, searchTerm, statusFilter, severityFilter, responseFilter]);

  const sortedIncidents = useMemo(() => {
    const sorted = [...filteredIncidents];
    sorted.sort((a, b) => compareSortField(a, b, sortField, sortDir));
    return sorted;
  }, [filteredIncidents, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedIncidents.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedIncidents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedIncidents.slice(start, start + pageSize);
  }, [sortedIncidents, safePage, pageSize]);

  // Reset page when filters change
  const resetPage = useCallback(() => setPage(1), []);

  // -------------------------------------------------------------------------
  // Sort header click handler
  // -------------------------------------------------------------------------

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
    );
  };

  // -------------------------------------------------------------------------
  // Bulk selection helpers
  // -------------------------------------------------------------------------

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedIncidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedIncidents.map((i) => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkResponder("");
  };

  const applyBulkStatus = async (status: IncidentStatus) => {
    for (const id of selectedIds) {
      await updateIncident(id, { status });
    }
    clearSelection();
  };

  const applyBulkResponder = async () => {
    if (!bulkResponder.trim()) return;
    for (const id of selectedIds) {
      await updateIncident(id, { responder: bulkResponder.trim() });
    }
    clearSelection();
  };

  // -------------------------------------------------------------------------
  // Style helpers
  // -------------------------------------------------------------------------

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-critical";
      case "high":
        return "bg-high";
      case "medium":
        return "bg-medium";
      case "low":
        return "bg-low";
      default:
        return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-red-500";
      case "investigating":
        return "text-yellow-500";
      case "resolved":
        return "text-green-500";
      case "closed":
        return "text-gray-500";
      default:
        return "text-muted-foreground";
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-foreground">
            Incident Management
          </h1>

          <div className="flex items-center gap-2">
            {/* New Incident */}
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Incident
            </Button>
            <CreateIncidentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

            {/* CSV Export */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => exportCSV(filteredIncidents)}
              disabled={filteredIncidents.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>

            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border bg-secondary p-0.5">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <TableProperties className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Track and manage security incidents
            {!loading && incidents.length > 0 && (
              <span className="ml-2 text-primary">
                ({filteredIncidents.length} of {incidents.length} incidents)
              </span>
            )}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title, IP, country, or responder..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetPage();
                }}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full md:w-48 bg-secondary border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={severityFilter}
              onValueChange={(v) => {
                setSeverityFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full md:w-48 bg-secondary border-border">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={responseFilter}
              onValueChange={(v) => {
                setResponseFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full md:w-48 bg-secondary border-border">
                <SelectValue placeholder="Response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Response</SelectItem>
                <SelectItem value="responded">Blocked</SelectItem>
                <SelectItem value="pending">No Response</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Loading State                                                       */}
      {/* ------------------------------------------------------------------ */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading incidents...</div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty State                                                         */}
      {/* ------------------------------------------------------------------ */}
      {!loading && incidents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            No incidents found. Check your Google Sheets connection.
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                             */}
      {/* ------------------------------------------------------------------ */}
      {!loading && incidents.length > 0 && (
        <>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                No incidents match your filters.
              </div>
            </div>
          ) : viewMode === "card" ? (
            /* ============================================================ */
            /* Card View                                                     */
            /* ============================================================ */
            <>
              <div className="space-y-4">
                {paginatedIncidents.map((incident) => (
                  <Link key={incident.id} to={`/incidents/${incident.id}`}>
                    <Card className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 cursor-pointer overflow-hidden">
                      <CardContent className="p-6 overflow-hidden">
                        <div className="flex items-start gap-4 min-w-0">
                          <div
                            className={`w-1 h-20 rounded-full shrink-0 ${getSeverityColor(incident.severity)}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="text-lg font-mono font-bold text-primary">
                                    {incident.id}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`${getSeverityColor(incident.severity)} text-white border-0`}
                                  >
                                    {incident.severity}
                                  </Badge>
                                  <Badge variant="outline" className="capitalize">
                                    {incident.type.replace("-", " ")}
                                  </Badge>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                                  {incident.title}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                  {incident.description}
                                </p>
                                {incident.country && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      Country:
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {incident.country}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  Status:
                                </span>
                                <span
                                  className={`text-sm font-medium capitalize ${getStatusColor(incident.status)}`}
                                >
                                  {incident.status}
                                </span>
                              </div>
                              {incident.responder &&
                                incident.responder !== "Unassigned" && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      Responder:
                                    </span>
                                    <span className="text-sm text-foreground">
                                      {incident.responder}
                                    </span>
                                  </div>
                                )}
                              {incident.responseStatus && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Response:
                                  </span>
                                  <Badge
                                    variant={
                                      incident.responseStatus === "responded"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {incident.responseStatus}
                                  </Badge>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  Created:
                                </span>
                                <span className="text-sm text-foreground">
                                  {format(incident.createdAt, "MMM d, yyyy HH:mm")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* Table View                                                    */
            /* ============================================================ */
            <>
              <Card className="bg-gradient-card border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      {/* Select-all checkbox */}
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            paginatedIncidents.length > 0 &&
                            selectedIds.size === paginatedIncidents.length
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        ID
                      </TableHead>
                      <TableHead className="font-semibold text-foreground max-w-[260px]">
                        Title
                      </TableHead>
                      <TableHead
                        className="font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("severity")}
                      >
                        Severity
                        <SortIcon field="severity" />
                      </TableHead>
                      <TableHead
                        className="font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("status")}
                      >
                        Status
                        <SortIcon field="status" />
                      </TableHead>
                      <TableHead
                        className="font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("type")}
                      >
                        Type
                        <SortIcon field="type" />
                      </TableHead>
                      <TableHead
                        className="font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("country")}
                      >
                        Country
                        <SortIcon field="country" />
                      </TableHead>
                      <TableHead
                        className="font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("responder")}
                      >
                        Responder
                        <SortIcon field="responder" />
                      </TableHead>
                      <TableHead className="font-semibold text-foreground whitespace-nowrap">
                        Response
                      </TableHead>
                      <TableHead
                        className="font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("createdAt")}
                      >
                        Date
                        <SortIcon field="createdAt" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedIncidents.map((incident) => (
                      <TableRow
                        key={incident.id}
                        className="border-border cursor-pointer hover:bg-muted/40"
                        data-state={
                          selectedIds.has(incident.id) ? "selected" : undefined
                        }
                      >
                        {/* Checkbox */}
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="w-10"
                        >
                          <Checkbox
                            checked={selectedIds.has(incident.id)}
                            onCheckedChange={() => toggleSelect(incident.id)}
                            aria-label={`Select ${incident.id}`}
                          />
                        </TableCell>

                        {/* ID */}
                        <TableCell
                          className="font-mono font-bold text-primary whitespace-nowrap"
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          {incident.id}
                        </TableCell>

                        {/* Title */}
                        <TableCell
                          className="max-w-[260px] truncate text-foreground"
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                          title={incident.title}
                        >
                          {incident.title}
                        </TableCell>

                        {/* Severity */}
                        <TableCell
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          <Badge
                            variant="outline"
                            className={`${getSeverityColor(incident.severity)} text-white border-0`}
                          >
                            {incident.severity}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          <span
                            className={`text-sm font-medium capitalize ${getStatusColor(incident.status)}`}
                          >
                            {incident.status}
                          </span>
                        </TableCell>

                        {/* Type */}
                        <TableCell
                          className="capitalize whitespace-nowrap"
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          {incident.type.replace(/-/g, " ")}
                        </TableCell>

                        {/* Country */}
                        <TableCell
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          {incident.country ?? "—"}
                        </TableCell>

                        {/* Responder */}
                        <TableCell
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          {incident.responder &&
                          incident.responder !== "Unassigned"
                            ? incident.responder
                            : "—"}
                        </TableCell>

                        {/* Response Status */}
                        <TableCell
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          {incident.responseStatus ? (
                            <Badge
                              variant={
                                incident.responseStatus === "responded"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {incident.responseStatus}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* Created At */}
                        <TableCell
                          className="whitespace-nowrap text-muted-foreground"
                          onClick={() =>
                            navigate(`/incidents/${incident.id}`)
                          }
                        >
                          {format(incident.createdAt, "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Pagination controls (shared by both views)                      */}
          {/* -------------------------------------------------------------- */}
          {sortedIncidents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              {/* Page size selector */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8 bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page indicator + prev/next */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Floating bulk-action bar (table view only)                          */}
      {/* ------------------------------------------------------------------ */}
      {selectedIds.size > 0 && viewMode === "table" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-border bg-card/95 backdrop-blur-md px-5 py-3 shadow-xl">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {selectedIds.size} selected
          </span>

          <div className="h-5 w-px bg-border" />

          {/* Change Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => applyBulkStatus("open")}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => applyBulkStatus("investigating")}
              >
                Investigating
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyBulkStatus("resolved")}>
                Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyBulkStatus("closed")}>
                Closed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign Responder */}
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Responder name"
              value={bulkResponder}
              onChange={(e) => setBulkResponder(e.target.value)}
              className="h-8 w-40 bg-secondary border-border text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") applyBulkResponder();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!bulkResponder.trim()}
              onClick={applyBulkResponder}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </Button>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Clear */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default Incidents;
