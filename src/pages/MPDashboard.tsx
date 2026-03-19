import { useState } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockIssues, categories } from "@/data/mockIssues";
import { Search, Filter, BarChart3, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { IssueStatus } from "@/components/StatusBadge";

const MPDashboard = () => {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedStatus, setSelectedStatus] = useState<"all" | IssueStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIssues = mockIssues.filter((issue) => {
    const matchesCategory = selectedCategory === "الكل" || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || issue.status === selectedStatus;
    const matchesSearch = !searchQuery || issue.title.includes(searchQuery) || issue.description.includes(searchQuery);
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const totalIssues = mockIssues.length;
  const resolvedCount = mockIssues.filter((i) => i.status === "resolved").length;
  const pendingCount = mockIssues.filter((i) => i.status === "received").length;
  const inProgressCount = mockIssues.filter((i) => i.status === "in-progress").length;

  const statCards = [
    { label: "إجمالي المشاكل", value: totalIssues, icon: BarChart3, color: "text-accent" },
    { label: "بانتظار المعالجة", value: pendingCount, icon: AlertCircle, color: "text-warning" },
    { label: "قيد المعالجة", value: inProgressCount, icon: Clock, color: "text-info" },
    { label: "تم الحل", value: resolvedCount, icon: CheckCircle2, color: "text-success" },
  ];

  const statusFilters: { key: "all" | IssueStatus; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "received", label: "تم الاستلام" },
    { key: "in-progress", label: "قيد المعالجة" },
    { key: "resolved", label: "تم الحل" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">لوحة تحكم النائب</h1>
          <p className="text-muted-foreground text-sm">نظرة عامة على مشاكل الدائرة</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="civic-card"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="civic-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مشكلة..."
                className="pr-10 text-right"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((sf) => (
                <Button
                  key={sf.key}
                  variant={selectedStatus === sf.key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedStatus(sf.key)}
                >
                  {sf.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-border">
            <Filter className="w-4 h-4 text-muted-foreground mt-1" />
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-xs"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-4">
          عرض {filteredIssues.length} من {totalIssues} مشكلة
        </div>

        <div className="space-y-4">
          {filteredIssues.map((issue, i) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <IssueCard issue={issue} />
            </motion.div>
          ))}
          {filteredIssues.length === 0 && (
            <div className="civic-card text-center py-12">
              <p className="text-muted-foreground">لا توجد مشاكل مطابقة للفلتر المحدد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MPDashboard;
