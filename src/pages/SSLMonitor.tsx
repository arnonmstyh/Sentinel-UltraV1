import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Shield, RefreshCw, Plus, Upload, Trash2,
    Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
    Star, MoreHorizontal, Eye, ExternalLink
} from 'lucide-react';
import { getApiUrl, apiFetch } from '@/lib/api';
import { format } from 'date-fns';
import SSLDetailDialog from '@/components/SSLDetailDialog';
import SSLExecutiveDashboard from '@/components/SSLExecutiveDashboard';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UrlData {
    id: number;
    url: string;
    issuer: string | null;
    validFrom: string | null;
    expiryDate: string | null;
    daysRemaining: number | null;
    status: 'GOOD' | 'WARNING' | 'EXPIRED' | 'ERROR' | 'PENDING';
    serviceStatus?: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';
    responseTime?: number | null;
    httpStatusCode?: number | null;
    lastServiceCheck?: string | null;
    consecutiveFailures?: number;
    lastChecked: string;
    lastError?: string | null;
    starred?: boolean;
}

type StatusFilter = 'ALL' | 'STARRED' | 'GOOD' | 'WARNING' | 'EXPIRED' | 'ERROR' | 'PENDING';
type SortField = 'domain' | 'status' | 'issuer' | 'daysRemaining' | 'validFrom' | 'expiryDate' | 'lastChecked';
type SortDirection = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE = 20;

const STATUS_CONFIG: Record<UrlData['status'], { label: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
    GOOD: {
        label: 'Good',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    WARNING: {
        label: 'Warning',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
    },
    EXPIRED: {
        label: 'Expired',
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
    },
    ERROR: {
        label: 'Error',
        dotColor: 'bg-slate-500',
        textColor: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
    },
    PENDING: {
        label: 'Pending',
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
};

const SSLMonitor = () => {
    const [urls, setUrls] = useState<UrlData[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search, filter, sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [sortField, setSortField] = useState<SortField>('domain');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    // Detail dialog
    const [detailUrl, setDetailUrl] = useState<UrlData | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Show add URL form
    const [showAddForm, setShowAddForm] = useState(false);

    // Format dates safely
    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd');
        } catch {
            return '-';
        }
    };

    const formatDateTime = (dateStr: string | null): string => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
        } catch {
            return '-';
        }
    };

    const fetchUrls = async () => {
        try {
            const res = await apiFetch(`${getApiUrl()}/api/urls`);
            const data = await res.json();
            setUrls(data);
        } catch (error) {
            console.error('Error fetching URLs:', error);
        }
    };

    useEffect(() => {
        fetchUrls();
    }, []);

    // Auto-poll service status every 30 seconds (lightweight endpoint)
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const res = await apiFetch(`${getApiUrl()}/api/service-status`);
                if (res.ok) {
                    const statusData = await res.json();
                    setUrls(prev => prev.map(u => {
                        const update = statusData.find((s: any) => s.id === u.id);
                        if (update) {
                            return {
                                ...u,
                                serviceStatus: update.serviceStatus,
                                responseTime: update.responseTime,
                                httpStatusCode: update.httpStatusCode,
                                lastServiceCheck: update.lastServiceCheck,
                                consecutiveFailures: update.consecutiveFailures,
                            };
                        }
                        return u;
                    }));
                }
            } catch {
                // Silent fail for background polling
            }
        }, 30000);

        return () => clearInterval(pollInterval);
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, sortField, sortDirection, pageSize]);

    const handleAddUrl = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUrl) return;
        setLoading(true);
        try {
            const res = await apiFetch(`${getApiUrl()}/api/urls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newUrl }),
            });
            if (res.ok) {
                setNewUrl('');
                setShowAddForm(false);
                fetchUrls();
                toast.success('URL added successfully');
            } else {
                toast.error('Failed to add URL');
            }
        } catch (error) {
            console.error('Error adding URL:', error);
            toast.error('Error adding URL');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStar = async (id: number) => {
        // Optimistic update
        setUrls(prev => prev.map(u => u.id === id ? { ...u, starred: !u.starred } : u));
        try {
            const res = await apiFetch(`${getApiUrl()}/api/urls/${id}/star`, { method: 'PATCH' });
            if (!res.ok) throw new Error('Failed to toggle star');
            const updated = await res.json();
            setUrls(prev => prev.map(u => u.id === id ? updated : u));
        } catch (error) {
            // Revert on failure
            setUrls(prev => prev.map(u => u.id === id ? { ...u, starred: !u.starred } : u));
            toast.error('Failed to update star');
        }
    };

    const handleDelete = async (id: number) => {
        const previousUrls = urls;
        setUrls(urls.filter(url => url.id !== id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        try {
            const res = await apiFetch(`${getApiUrl()}/api/urls/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error('Failed to delete');
            }
            toast.success('URL deleted');
        } catch (error) {
            console.error('Error deleting URL:', error);
            setUrls(previousUrls);
            toast.error('Failed to delete URL');
        }
    };

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(selectedIds);
        if (idsToDelete.length === 0) return;

        const previousUrls = urls;
        setUrls(urls.filter(url => !selectedIds.has(url.id)));
        setSelectedIds(new Set());

        try {
            await Promise.all(
                idsToDelete.map(id =>
                    apiFetch(`${getApiUrl()}/api/urls/${id}`, { method: 'DELETE' })
                )
            );
            toast.success(`Deleted ${idsToDelete.length} URLs`);
        } catch (error) {
            console.error('Error bulk deleting:', error);
            setUrls(previousUrls);
            toast.error('Failed to delete some URLs');
        }
    };

    const handleBulkRefresh = async () => {
        const ids = Array.from(selectedIds);
        toast.success(`Refreshing ${ids.length} certificates...`);
        try {
            const results = await Promise.all(
                ids.map(id => apiFetch(`${getApiUrl()}/api/urls/${id}/refresh`, { method: 'POST' }).then(r => r.ok ? r.json() : null))
            );
            setUrls(prev => prev.map(u => {
                const updated = results.find((r: UrlData | null) => r && r.id === u.id);
                return updated || u;
            }));
            toast.success(`Refreshed ${ids.length} certificates`);
        } catch {
            toast.error('Failed to refresh some certificates');
        }
    };

    const handleBulkStar = async (star: boolean) => {
        const ids = Array.from(selectedIds);
        const targets = urls.filter(u => ids.includes(u.id) && !!u.starred !== star);
        if (targets.length === 0) {
            toast.info(`Selected items are already ${star ? 'starred' : 'unstarred'}`);
            return;
        }
        // Optimistic
        setUrls(prev => prev.map(u => ids.includes(u.id) ? { ...u, starred: star } : u));
        try {
            await Promise.all(
                targets.map(u => apiFetch(`${getApiUrl()}/api/urls/${u.id}/star`, { method: 'PATCH' }))
            );
            toast.success(`${star ? 'Starred' : 'Unstarred'} ${targets.length} URLs`);
        } catch {
            toast.error('Failed to update some URLs');
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await apiFetch(`${getApiUrl()}/api/refresh`, { method: 'POST' });
            toast.success('SSL scan started');
            setTimeout(fetchUrls, 2000);
        } catch (error) {
            console.error('Error refreshing:', error);
            toast.error('Failed to start scan');
        } finally {
            setRefreshing(false);
        }
    };

    const handleRefreshSingle = async (id: number) => {
        try {
            const res = await apiFetch(`${getApiUrl()}/api/urls/${id}/refresh`, { method: 'POST' });
            if (res.ok) {
                const updated = await res.json();
                setUrls(prev => prev.map(u => u.id === id ? updated : u));
                setDetailUrl(updated);
                toast.success('Certificate refreshed');
            }
        } catch (error) {
            console.error('Error refreshing URL:', error);
            toast.error('Failed to refresh certificate');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const urlList = text.split(/[\n,]+/).map(u => u.trim()).filter(u => u);

            if (urlList.length === 0) return;

            setLoading(true);
            try {
                const res = await apiFetch(`${getApiUrl()}/api/urls/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: urlList }),
                });
                if (res.ok) {
                    toast.success(`Imported ${urlList.length} URLs successfully!`);
                    fetchUrls();
                } else {
                    toast.error('Failed to import URLs');
                }
            } catch (error) {
                console.error('Error importing:', error);
                toast.error('Error importing URLs');
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // Hostname extraction
    const extractHostname = (url: string): string => {
        try {
            return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        } catch {
            return url;
        }
    };

    // Filtered + sorted data
    const filteredAndSorted = useMemo(() => {
        let result = [...urls];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item => {
                const hostname = extractHostname(item.url).toLowerCase();
                const issuer = (item.issuer || '').toLowerCase();
                return hostname.includes(q) || issuer.includes(q);
            });
        }

        if (statusFilter === 'STARRED') {
            result = result.filter(item => item.starred);
        } else if (statusFilter !== 'ALL') {
            result = result.filter(item => item.status === statusFilter);
        }

        result.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'domain': {
                    const aHost = extractHostname(a.url).toLowerCase();
                    const bHost = extractHostname(b.url).toLowerCase();
                    cmp = aHost.localeCompare(bHost);
                    break;
                }
                case 'status': {
                    const order = ['EXPIRED', 'ERROR', 'WARNING', 'PENDING', 'GOOD'];
                    cmp = order.indexOf(a.status) - order.indexOf(b.status);
                    break;
                }
                case 'issuer': {
                    cmp = (a.issuer || '').localeCompare(b.issuer || '');
                    break;
                }
                case 'daysRemaining': {
                    const aDays = a.daysRemaining ?? -Infinity;
                    const bDays = b.daysRemaining ?? -Infinity;
                    cmp = aDays - bDays;
                    break;
                }
                case 'validFrom': {
                    const aTime = a.validFrom ? new Date(a.validFrom).getTime() : 0;
                    const bTime = b.validFrom ? new Date(b.validFrom).getTime() : 0;
                    cmp = aTime - bTime;
                    break;
                }
                case 'expiryDate': {
                    const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
                    const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
                    cmp = aTime - bTime;
                    break;
                }
                case 'lastChecked': {
                    const aTime = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
                    const bTime = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
                    cmp = aTime - bTime;
                    break;
                }
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [urls, searchQuery, statusFilter, sortField, sortDirection]);

    // Pagination calculations
    const totalItems = filteredAndSorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = filteredAndSorted.slice(startIndex, endIndex);

    // Selection handlers
    const isAllSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));
    const isSomeSelected = paginatedItems.some(item => selectedIds.has(item.id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                paginatedItems.forEach(item => next.delete(item.id));
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                paginatedItems.forEach(item => next.add(item.id));
                return next;
            });
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Sort toggle handler
    const handleSortChange = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'lastChecked' || field === 'expiryDate' ? 'desc' : 'asc');
        }
    };

    // CSV export
    const handleExportCSV = useCallback(() => {
        const escapeCSV = (val: string) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };

        const headers = ['URL', 'Service', 'SSL Status', 'Issuer', 'Valid From', 'Expiry Date', 'Days Remaining', 'Last Checked', 'Error'];
        const rows = filteredAndSorted.map(item => [
            escapeCSV(item.url),
            escapeCSV(item.serviceStatus || 'UNKNOWN'),
            escapeCSV(item.status),
            escapeCSV(item.issuer || ''),
            escapeCSV(formatDate(item.validFrom)),
            escapeCSV(formatDate(item.expiryDate)),
            item.daysRemaining !== null ? String(item.daysRemaining) : '',
            escapeCSV(formatDateTime(item.lastChecked)),
            escapeCSV(item.lastError || ''),
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ssl-monitor-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredAndSorted]);

    const handleExportSelectedCSV = useCallback(() => {
        const selected = filteredAndSorted.filter(u => selectedIds.has(u.id));
        if (selected.length === 0) return;
        const escapeCSV = (val: string) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`;
            return val;
        };
        const headers = ['URL', 'Service', 'SSL Status', 'Issuer', 'Valid From', 'Expiry Date', 'Days Remaining', 'Last Checked', 'Error'];
        const rows = selected.map(item => [
            escapeCSV(item.url), escapeCSV(item.serviceStatus || 'UNKNOWN'), escapeCSV(item.status), escapeCSV(item.issuer || ''),
            escapeCSV(formatDate(item.validFrom)), escapeCSV(formatDate(item.expiryDate)),
            item.daysRemaining !== null ? String(item.daysRemaining) : '',
            escapeCSV(formatDateTime(item.lastChecked)), escapeCSV(item.lastError || ''),
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ssl-selected-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredAndSorted, selectedIds]);

    // Stats
    const starredCount = urls.filter(u => u.starred).length;
    const attentionCount = urls.filter(u => ['WARNING', 'EXPIRED', 'ERROR'].includes(u.status)).length;
    const criticalCount = urls.filter(u => u.status === 'EXPIRED' || (u.status === 'WARNING' && u.daysRemaining !== null && u.daysRemaining <= 7)).length;

    // Sort indicator
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-3 h-3 text-primary" />
            : <ArrowDown className="w-3 h-3 text-primary" />;
    };

    // Render days remaining with color coding
    const renderDaysRemaining = (item: UrlData) => {
        if (item.daysRemaining === null) return <span className="text-muted-foreground">-</span>;
        if (item.daysRemaining <= 0) return <span className="text-rose-400 font-semibold">Expired</span>;
        if (item.daysRemaining <= 7) return <span className="text-rose-400 font-semibold">{item.daysRemaining}d</span>;
        if (item.daysRemaining <= 30) return <span className="text-amber-400 font-medium">{item.daysRemaining}d</span>;
        return <span className="text-emerald-400">{item.daysRemaining}d</span>;
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* ── Header Bar ── */}
            <div className="border-b border-border bg-card/50">
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                        {/* Tab indicator */}
                        <div className="flex items-center gap-2.5">
                            <Shield className="w-4 h-4 text-primary" />
                            <h1 className="text-sm font-semibold tracking-wide uppercase text-foreground">
                                SSL Monitor
                            </h1>
                            <span className="text-[11px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-md tabular-nums">
                                {urls.length}
                            </span>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-5 bg-border" />

                        {/* Add button */}
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept=".txt,.csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Import
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredAndSorted.length === 0}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                        <div className="w-px h-5 bg-border" />
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors ${refreshing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Scanning...' : 'Scan All'}
                        </button>
                    </div>
                </div>

                {/* Add URL form (collapsible) */}
                {showAddForm && (
                    <div className="px-5 pb-3 border-t border-border/50">
                        <form onSubmit={handleAddUrl} className="flex items-center gap-2 pt-3">
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    autoFocus
                                    className="w-full bg-background border border-input rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !newUrl.trim()}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Add Site'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowAddForm(false); setNewUrl(''); }}
                                className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* ── Info banner ── */}
            <div className="px-5 py-2 bg-amber-500/5 border-b border-amber-500/10 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs text-muted-foreground">
                    Assets marked with <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline -mt-0.5" /> are highly critical to your organization's operations.
                    {starredCount > 0 && <span className="text-foreground font-medium"> {starredCount} starred.</span>}
                    {criticalCount > 0 && <span className="text-rose-400 font-medium"> {criticalCount} expiring soon.</span>}
                </span>
            </div>

            {/* ── Search & Filter toolbar ── */}
            <div className="px-5 py-2.5 border-b border-border flex items-center gap-3 bg-card/30">
                <div className="relative flex-1 max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search domains..."
                        className="w-full bg-background/50 border border-border rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
                    />
                </div>

                <div className="w-px h-5 bg-border" />

                {/* Status filter pills */}
                <div className="flex items-center gap-1">
                    {(['ALL', 'STARRED', 'GOOD', 'WARNING', 'EXPIRED', 'ERROR'] as StatusFilter[]).map(status => {
                        const count = status === 'ALL'
                            ? urls.length
                            : status === 'STARRED'
                                ? urls.filter(u => u.starred).length
                                : urls.filter(u => u.status === status).length;
                        const isActive = statusFilter === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                    isActive
                                        ? status === 'STARRED' ? 'bg-amber-400/10 text-amber-400' : 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                }`}
                            >
                                {status === 'STARRED' ? (
                                    <Star className={`w-3 h-3 ${isActive ? 'fill-amber-400 text-amber-400' : ''}`} />
                                ) : status !== 'ALL' ? (
                                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status as UrlData['status']].dotColor}`} />
                                ) : null}
                                <span>{status === 'ALL' ? 'All' : status === 'STARRED' ? 'Starred' : STATUS_CONFIG[status as UrlData['status']].label}</span>
                                <span className={`text-[10px] tabular-nums ${isActive ? (status === 'STARRED' ? 'text-amber-400/70' : 'text-primary/70') : 'text-muted-foreground/60'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1" />

                {/* Page size */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Show</span>
                    <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                        <SelectTrigger className="w-16 h-7 bg-background/50 text-xs border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── Executive Dashboard + Timeline ── */}
            {urls.length > 0 && (
                <div className="border-b border-border">
                    <SSLExecutiveDashboard urls={urls} />
                </div>
            )}

            {/* ── Detail Dialog ── */}
            <SSLDetailDialog
                urlData={detailUrl}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onRefresh={handleRefreshSingle}
                onToggleStar={(id) => {
                    handleToggleStar(id);
                    // Update the detailUrl state to reflect the star change immediately
                    setDetailUrl(prev => prev && prev.id === id ? { ...prev, starred: !prev.starred } : prev);
                }}
            />

            {/* ── Bulk action bar ── */}
            {selectedIds.size > 0 && (
                <div className="px-5 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                    <span className="text-xs text-foreground">
                        <span className="font-semibold">{selectedIds.size}</span> item{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleBulkRefresh}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button
                            onClick={() => handleBulkStar(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                            <Star className="w-3 h-3" />
                            Star
                        </button>
                        <button
                            onClick={() => handleBulkStar(false)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                        >
                            <Star className="w-3 h-3" />
                            Unstar
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button
                            onClick={handleExportSelectedCSV}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Export
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {selectedIds.size} URLs?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will remove {selectedIds.size} URL{selectedIds.size !== 1 ? 's' : ''} from your monitoring list. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        Delete All
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* ── Data Table ── */}
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-card/50 hover:bg-card/50">
                            <TableHead className="w-10 px-3">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                    className="translate-y-[1px]"
                                    {...(isSomeSelected && !isAllSelected ? { 'data-state': 'indeterminate' as const } : {})}
                                />
                            </TableHead>
                            <TableHead className="min-w-[220px]">
                                <button
                                    onClick={() => handleSortChange('domain')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Domain
                                    <SortIcon field="domain" />
                                </button>
                            </TableHead>
                            <TableHead className="w-[80px]">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Service
                                </span>
                            </TableHead>
                            <TableHead className="w-[100px]">
                                <button
                                    onClick={() => handleSortChange('status')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    SSL Cert
                                    <SortIcon field="status" />
                                </button>
                            </TableHead>
                            <TableHead className="min-w-[140px]">
                                <button
                                    onClick={() => handleSortChange('issuer')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Issuer
                                    <SortIcon field="issuer" />
                                </button>
                            </TableHead>
                            <TableHead className="w-[100px]">
                                <button
                                    onClick={() => handleSortChange('daysRemaining')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Expires In
                                    <SortIcon field="daysRemaining" />
                                </button>
                            </TableHead>
                            <TableHead className="w-[110px]">
                                <button
                                    onClick={() => handleSortChange('validFrom')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Valid From
                                    <SortIcon field="validFrom" />
                                </button>
                            </TableHead>
                            <TableHead className="w-[110px]">
                                <button
                                    onClick={() => handleSortChange('expiryDate')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Expiry Date
                                    <SortIcon field="expiryDate" />
                                </button>
                            </TableHead>
                            <TableHead className="w-[140px]">
                                <button
                                    onClick={() => handleSortChange('lastChecked')}
                                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Last Checked
                                    <SortIcon field="lastChecked" />
                                </button>
                            </TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                            {urls.length === 0
                                                ? <Shield className="w-5 h-5 text-muted-foreground" />
                                                : <Search className="w-5 h-5 text-muted-foreground" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {urls.length === 0 ? 'No sites monitored yet' : 'No matches found'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {urls.length === 0
                                                    ? 'Click "Add" to start monitoring HTTPS certificates.'
                                                    : 'Try adjusting your search or filter criteria.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item) => {
                                const config = STATUS_CONFIG[item.status];
                                const isSelected = selectedIds.has(item.id);
                                const isCritical = item.status === 'EXPIRED' || (item.daysRemaining !== null && item.daysRemaining <= 7);

                                return (
                                    <TableRow
                                        key={item.id}
                                        className={`border-b border-border/50 cursor-pointer transition-colors ${
                                            isSelected ? 'bg-primary/5' : item.starred ? 'bg-amber-500/[0.03]' : ''
                                        } ${item.starred ? 'hover:bg-amber-500/[0.06]' : 'hover:bg-accent/5'}`}
                                        data-state={isSelected ? 'selected' : undefined}
                                    >
                                        <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelect(item.id)}
                                                aria-label={`Select ${extractHostname(item.url)}`}
                                                className="translate-y-[1px]"
                                            />
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium truncate max-w-[260px] ${item.starred ? 'text-amber-50' : 'text-foreground'}`}>
                                                    {extractHostname(item.url)}
                                                </span>
                                                {item.starred && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex-shrink-0 cursor-default" onClick={(e) => e.stopPropagation()}>
                                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-[220px]">
                                                            <p className="font-semibold text-amber-400 text-xs">Asset Critical</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Noted for URL Service Sensitivity</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                            {item.status === 'ERROR' && item.lastError && (
                                                <p className="text-[10px] text-rose-400/70 mt-0.5 truncate max-w-[280px]">
                                                    {item.lastError}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                {item.serviceStatus === 'UP' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 w-fit">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Up
                                                    </span>
                                                ) : item.serviceStatus === 'DOWN' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20 w-fit">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        Down
                                                    </span>
                                                ) : item.serviceStatus === 'DEGRADED' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 w-fit">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        Slow
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20 w-fit">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        —
                                                    </span>
                                                )}
                                                {item.responseTime != null && (
                                                    <span className={`text-[10px] tabular-nums pl-0.5 ${
                                                        item.responseTime > 3000 ? 'text-amber-400/70' :
                                                        item.responseTime > 5000 ? 'text-rose-400/70' :
                                                        'text-muted-foreground/60'
                                                    }`}>
                                                        {item.responseTime < 1000 ? `${item.responseTime}ms` : `${(item.responseTime / 1000).toFixed(1)}s`}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                                                {config.label}
                                            </span>
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5 text-xs text-muted-foreground"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            <span className="truncate block max-w-[160px]">
                                                {item.status === 'GOOD' || item.status === 'WARNING' ? (item.issuer || '-') : '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5 text-xs"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            {item.status === 'GOOD' || item.status === 'WARNING' ? renderDaysRemaining(item) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5 text-xs text-muted-foreground tabular-nums"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            {item.status === 'GOOD' || item.status === 'WARNING' ? formatDate(item.validFrom) : '-'}
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5 text-xs text-muted-foreground tabular-nums"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            {item.status === 'GOOD' || item.status === 'WARNING' ? formatDate(item.expiryDate) : '-'}
                                        </TableCell>
                                        <TableCell
                                            className="py-2.5 text-xs text-muted-foreground tabular-nums"
                                            onClick={() => { setDetailUrl(item); setDetailOpen(true); }}
                                        >
                                            {formatDateTime(item.lastChecked)}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem onClick={() => { setDetailUrl(item); setDetailOpen(true); }}>
                                                        <Eye className="w-3.5 h-3.5 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRefreshSingle(item.id)}>
                                                        <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                                        Refresh
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => window.open(item.url.startsWith('http') ? item.url : `https://${item.url}`, '_blank')}>
                                                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                                        Open in Browser
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-rose-400 hover:bg-rose-500/10 w-full">
                                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                                Delete
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Stop Monitoring?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will remove <strong>{extractHostname(item.url)}</strong> from your monitoring list.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Pagination Footer ── */}
            {totalItems > 0 && (
                <div className="border-t border-border bg-card/30 px-5 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {startIndex + 1}-{endIndex} of {totalItems}
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={safeCurrentPage <= 1}
                            className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            First
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage <= 1}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (safeCurrentPage <= 3) {
                                pageNum = i + 1;
                            } else if (safeCurrentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = safeCurrentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`min-w-[1.75rem] h-7 rounded-md text-xs font-medium transition-colors ${
                                        safeCurrentPage === pageNum
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage >= totalPages}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={safeCurrentPage >= totalPages}
                            className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SSLMonitor;
