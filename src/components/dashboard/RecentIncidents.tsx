import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";
import { Link } from "react-router-dom";
import { useState } from "react";

const RecentIncidents = () => {
  const { incidents, loading } = useIncidents();
  const [currentPage, setCurrentPage] = useState(1);
  const incidentsPerPage = 5;
  
  const getSeverityVariant = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-red-500";
      case "investigating": return "text-yellow-500";
      case "resolved": return "text-green-500";
      case "closed": return "text-gray-500";
      default: return "text-muted-foreground";
    }
  };

  // Pagination logic
  const sortedIncidents = incidents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const totalPages = Math.ceil(sortedIncidents.length / incidentsPerPage);
  const startIndex = (currentPage - 1) * incidentsPerPage;
  const endIndex = startIndex + incidentsPerPage;
  const currentIncidents = sortedIncidents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            All Incidents
          </div>
          <div className="text-sm text-muted-foreground">
            {sortedIncidents.length} total • Page {currentPage} of {totalPages}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading recent incidents...</div>
          </div>
        ) : sortedIncidents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No incidents found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentIncidents.map((incident) => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="block p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 hover:shadow-glow overflow-hidden"
            >
              <div className="flex items-start justify-between mb-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-primary shrink-0">{incident.id}</span>
                    <Badge variant={getSeverityVariant(incident.severity)} className="text-xs shrink-0">
                      {incident.severity}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium text-foreground mb-1 truncate">{incident.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 break-words">{incident.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className={`text-xs font-medium capitalize ${getStatusColor(incident.status)}`}>
                  {incident.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {incident.createdAt.toLocaleDateString()}
                </span>
              </div>
            </Link>
              ))}
          </div>
        )}

        {/* Pagination Controls */}
        {sortedIncidents.length > incidentsPerPage && (
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedIncidents.length)} of {sortedIncidents.length} incidents
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentIncidents;
