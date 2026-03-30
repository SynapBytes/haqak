import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, XCircle, Search, Filter, Download } from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  status: "success" | "failure";
  error_message?: string;
  created_at: string;
}

interface UrgentAlert {
  id: string;
  issue_id: string;
  urgency_level: "critical" | "high" | "medium";
  urgency_keywords: string[];
  detected_at: string;
  notified_mps: string[];
  notified_admins: string[];
  resolved_at?: string;
}

const AdminAuditDashboard = () => {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    // Tables audit_logs and urgent_issue_alerts not yet created – use empty data
    setAuditLogs([]);
    setUrgentAlerts([]);
    setLoading(false);
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesSearch = searchTerm === "" || 
      log.action.includes(searchTerm) ||
      log.entity_type.includes(searchTerm) ||
      log.user_id.includes(searchTerm);
    return matchesAction && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    return status === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const downloadReport = async () => {
    try {
      const csv = [
        ["Action", "Entity Type", "Entity ID", "Status", "User ID", "Created At"],
        ...filteredLogs.map((log) => [
          log.action,
          log.entity_type,
          log.entity_id,
          log.status,
          log.user_id,
          new Date(log.created_at).toLocaleString(),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t("admin.report_downloaded"));
    } catch (error) {
      toast.error(t("admin.download_error"));
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="alerts">Urgent Alerts</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Audit Logs</CardTitle>
              <CardDescription>Monitor all system activities and user actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failure">Failure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">&nbsp;</label>
                  <Button onClick={downloadReport} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Action</th>
                        <th className="px-4 py-3 text-left font-medium">Entity</th>
                        <th className="px-4 py-3 text-left font-medium">User</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            Loading...
                          </td>
                        </tr>
                      ) : filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No audit logs found
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-t hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <Badge variant="outline">{log.action}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{log.entity_type}</p>
                                <p className="text-xs text-muted-foreground">{log.entity_id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{log.user_id.slice(0, 8)}...</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <span className="capitalize">{log.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urgent Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Urgent Issue Alerts</CardTitle>
              <CardDescription>Monitor and manage urgent issues requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : urgentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No urgent alerts</div>
                ) : (
                  urgentAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <Badge className={getUrgencyColor(alert.urgency_level)}>
                              {alert.urgency_level.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">Issue #{alert.issue_id.slice(0, 8)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {alert.urgency_keywords.map((keyword) => (
                              <Badge key={keyword} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.detected_at).toLocaleString()}
                            </div>
                            <div>Notified: {alert.notified_mps?.length || 0} MPs, {alert.notified_admins?.length || 0} Admins</div>
                            {alert.resolved_at && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                                Resolved
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAuditDashboard;
