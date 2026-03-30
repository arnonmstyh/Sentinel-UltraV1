import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw, Shield, AlertTriangle, Clock, Star, Activity, Wifi, WifiOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UrlData {
  id: number;
  url: string;
  issuer: string | null;
  validFrom: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: "GOOD" | "WARNING" | "EXPIRED" | "ERROR" | "PENDING";
  serviceStatus?: "UP" | "DOWN" | "DEGRADED" | "UNKNOWN";
  responseTime?: number | null;
  httpStatusCode?: number | null;
  lastServiceCheck?: string | null;
  consecutiveFailures?: number;
  lastChecked: string;
  lastError?: string | null;
  starred?: boolean;
}

interface SSLDetailDialogProps {
  urlData: UrlData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: (id: number) => void;
  onToggleStar?: (id: number) => void;
}

const STATUS_CONFIG: Record<
  UrlData["status"],
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  GOOD: {
    label: "Good",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
  },
  WARNING: {
    label: "Warning",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
  },
  EXPIRED: {
    label: "Expired",
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
  },
  ERROR: {
    label: "Error",
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
  },
  PENDING: {
    label: "Pending",
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    borderColor: "border-gray-400/30",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "-";
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM d, yyyy HH:mm");
  } catch {
    return "-";
  }
}

function calculateLifetimePercent(
  validFrom: string | null,
  expiryDate: string | null
): number | null {
  if (!validFrom || !expiryDate) return null;
  try {
    const start = new Date(validFrom).getTime();
    const end = new Date(expiryDate).getTime();
    const now = Date.now();
    const total = end - start;
    if (total <= 0) return 100;
    const elapsed = now - start;
    const percent = (elapsed / total) * 100;
    return Math.max(0, Math.min(100, percent));
  } catch {
    return null;
  }
}

const SSLDetailDialog = ({
  urlData,
  open,
  onOpenChange,
  onRefresh,
  onToggleStar,
}: SSLDetailDialogProps) => {
  if (!urlData) return null;

  const statusConfig = STATUS_CONFIG[urlData.status];
  const lifetimePercent = calculateLifetimePercent(
    urlData.validFrom,
    urlData.expiryDate
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-card border-border text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            SSL Certificate Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* URL + Status Badge */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground break-all leading-relaxed">
              {urlData.url}
            </p>
            <Badge
              className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border shrink-0`}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Service Health */}
          <div className="space-y-3 rounded-lg border border-border bg-background/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Service Health
            </h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {urlData.serviceStatus === "UP" ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium text-emerald-400">Up</span>
                    </>
                  ) : urlData.serviceStatus === "DOWN" ? (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                      <span className="font-medium text-rose-400">Down</span>
                    </>
                  ) : urlData.serviceStatus === "DEGRADED" ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium text-amber-400">Slow</span>
                    </>
                  ) : (
                    <span className="font-medium text-muted-foreground">Unknown</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Response</span>
                <p className={`font-medium mt-0.5 tabular-nums ${
                  urlData.responseTime != null && urlData.responseTime > 3000
                    ? "text-amber-400"
                    : urlData.responseTime != null && urlData.responseTime > 5000
                      ? "text-rose-400"
                      : "text-foreground"
                }`}>
                  {urlData.responseTime != null
                    ? urlData.responseTime < 1000
                      ? `${urlData.responseTime}ms`
                      : `${(urlData.responseTime / 1000).toFixed(1)}s`
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">HTTP</span>
                <p className={`font-medium mt-0.5 tabular-nums ${
                  urlData.httpStatusCode != null && urlData.httpStatusCode >= 400
                    ? "text-rose-400"
                    : "text-foreground"
                }`}>
                  {urlData.httpStatusCode ?? "-"}
                </p>
              </div>
            </div>
            {urlData.lastServiceCheck && (
              <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Checked {formatDistanceToNow(new Date(urlData.lastServiceCheck), { addSuffix: true })}
                {urlData.consecutiveFailures != null && urlData.consecutiveFailures > 0 && (
                  <span className="text-rose-400/80 ml-1">
                    ({urlData.consecutiveFailures} consecutive failure{urlData.consecutiveFailures !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Certificate Details */}
          <div className="space-y-3 rounded-lg border border-border bg-background/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Certificate Info
            </h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Issuer</span>
                <p className="font-medium text-foreground mt-0.5">
                  {urlData.issuer || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Days Remaining</span>
                <p
                  className={`font-medium mt-0.5 ${
                    urlData.daysRemaining !== null && urlData.daysRemaining <= 7
                      ? "text-amber-400"
                      : urlData.daysRemaining !== null &&
                          urlData.daysRemaining <= 0
                        ? "text-rose-400"
                        : "text-foreground"
                  }`}
                >
                  {urlData.daysRemaining !== null
                    ? `${urlData.daysRemaining} days`
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valid From</span>
                <p className="font-medium text-foreground mt-0.5">
                  {formatDate(urlData.validFrom)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Expiry Date</span>
                <p className="font-medium text-foreground mt-0.5">
                  {formatDate(urlData.expiryDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Lifetime Progress Bar */}
          {lifetimePercent !== null && (
            <div className="space-y-2 rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Certificate Lifetime
                </h4>
                <span className="text-xs text-muted-foreground">
                  {lifetimePercent.toFixed(1)}% elapsed
                </span>
              </div>
              <Progress
                value={lifetimePercent}
                className={`h-3 ${
                  lifetimePercent >= 90
                    ? "[&>div]:bg-rose-500"
                    : lifetimePercent >= 75
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-emerald-500"
                }`}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{formatDate(urlData.validFrom)}</span>
                <span>{formatDate(urlData.expiryDate)}</span>
              </div>
            </div>
          )}

          {/* Last Checked */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Last Checked: {formatDateTime(urlData.lastChecked)}</span>
          </div>

          {/* Error Message */}
          {urlData.lastError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-400">{urlData.lastError}</p>
            </div>
          )}

          {/* Asset Critical Toggle */}
          {onToggleStar && (
            <button
              onClick={() => onToggleStar(urlData.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 transition-all ${
                urlData.starred
                  ? "border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10"
                  : "border-border bg-background/50 hover:bg-secondary/50"
              }`}
            >
              <Star
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  urlData.starred
                    ? "text-amber-400 fill-amber-400"
                    : "text-muted-foreground"
                }`}
              />
              <div className="text-left flex-1">
                <p className={`text-sm font-medium ${urlData.starred ? "text-amber-400" : "text-foreground"}`}>
                  {urlData.starred ? "Asset Critical" : "Mark as Critical"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {urlData.starred
                    ? "Noted for URL Service Sensitivity. Click to remove."
                    : "Flag this URL as critical to your organization's operations."}
                </p>
              </div>
            </button>
          )}

          {/* Refresh Button */}
          <Button
            onClick={() => onRefresh(urlData.id)}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh This Certificate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SSLDetailDialog;
