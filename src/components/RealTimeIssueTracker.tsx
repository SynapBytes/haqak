import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, CheckCircle2, AlertCircle, MessageSquare, User,
  Calendar, MapPin, Zap, Bell, Share2, Download, Eye,
  FileText, Phone, Mail, Send, Loader2, TrendingUp,
  Activity, Users, Target
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: "received" | "studying" | "contacted" | "resolved" | "rejected";
  title: string;
  description: string;
  actor: string;
  icon: React.ReactNode;
  color: string;
}

interface IssueUpdate {
  id: string;
  timestamp: Date;
  type: "comment" | "status_change" | "attachment" | "notification";
  content: string;
  author: string;
  isMP: boolean;
}

interface RealTimeIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  district: string;
  status: "new" | "in-progress" | "resolved" | "rejected";
  urgency: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  createdBy: string;
  mpAssigned?: string;
  views: number;
  comments: number;
  sentiment: "positive" | "negative" | "neutral";
  timeline: TimelineEvent[];
  updates: IssueUpdate[];
  notificationsEnabled: boolean;
}

const RealTimeIssueTracker = ({ issueId }: { issueId?: string }) => {
  const [issue, setIssue] = useState<RealTimeIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedTab, setSelectedTab] = useState("timeline");

  // Mock issue data
  const mockIssue: RealTimeIssue = {
    id: issueId || "issue-001",
    title: "مشكلة في الإضاءة بشارع النيل",
    description: "أعمدة الإضاءة في شارع النيل لم تعمل لمدة أسبوع، مما يشكل خطراً على المواطنين",
    category: "كهرباء",
    district: "وسط القاهرة",
    status: "in-progress",
    urgency: "high",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdBy: "أحمد محمد",
    mpAssigned: "النائب علي السيد",
    views: 342,
    comments: 18,
    sentiment: "negative",
    notificationsEnabled: true,
    timeline: [
      {
        id: "event-1",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "received",
        title: "تم استلام الطلب",
        description: "تم تسجيل الشكوى في النظام بنجاح",
        actor: "النظام",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-blue-500",
      },
      {
        id: "event-2",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        status: "studying",
        title: "قيد الدراسة",
        description: "تم تحويل الطلب للدراسة والتحليل من قبل فريق النائب",
        actor: "فريق النائب",
        icon: <FileText className="w-5 h-5" />,
        color: "text-amber-500",
      },
      {
        id: "event-3",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: "contacted",
        title: "تم التواصل مع الجهة المعنية",
        description: "تم التواصل مع شركة الكهرباء لحل المشكلة",
        actor: "النائب علي السيد",
        icon: <Phone className="w-5 h-5" />,
        color: "text-purple-500",
      },
      {
        id: "event-4",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: "contacted",
        title: "تحديث من الجهة المعنية",
        description: "تم تأكيد استلام الطلب وسيتم إصلاح الأعمدة خلال 48 ساعة",
        actor: "شركة الكهرباء",
        icon: <Mail className="w-5 h-5" />,
        color: "text-green-500",
      },
    ],
    updates: [
      {
        id: "update-1",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        type: "comment",
        content: "شكراً على سرعة التجاوب، نتطلع لحل المشكلة",
        author: "أحمد محمد",
        isMP: false,
      },
      {
        id: "update-2",
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        type: "status_change",
        content: "تم تحديث حالة الطلب من قيد الدراسة إلى تم التواصل مع الجهة المعنية",
        author: "النائب علي السيد",
        isMP: true,
      },
      {
        id: "update-3",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        type: "notification",
        content: "تم إرسال إشعار بتحديث حالة الطلب",
        author: "النظام",
        isMP: false,
      },
    ],
  };

  useEffect(() => {
    // Simulate loading issue data
    const timer = setTimeout(() => {
      setIssue(mockIssue);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [issueId]);

  // Simulate real-time updates
  useEffect(() => {
    if (!issue) return;

    const interval = setInterval(() => {
      // Randomly add new updates to simulate real-time activity
      if (Math.random() > 0.7) {
        const newUpdate: IssueUpdate = {
          id: `update-${Date.now()}`,
          timestamp: new Date(),
          type: "comment",
          content: "تحديث جديد من النظام",
          author: "النظام",
          isMP: false,
        };

        setIssue(prev => prev ? {
          ...prev,
          updates: [newUpdate, ...prev.updates],
          views: prev.views + Math.floor(Math.random() * 5),
          comments: prev.comments + (Math.random() > 0.8 ? 1 : 0),
        } : null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [issue]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("يرجى إدخال تعليق");
      return;
    }

    setSubmittingComment(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newUpdate: IssueUpdate = {
        id: `update-${Date.now()}`,
        timestamp: new Date(),
        type: "comment",
        content: newComment,
        author: user?.email || "مستخدم",
        isMP: false,
      };

      if (issue) {
        setIssue({
          ...issue,
          updates: [newUpdate, ...issue.updates],
          comments: issue.comments + 1,
        });
      }

      setNewComment("");
      toast.success("تم إضافة التعليق بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة التعليق");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          setNotificationsEnabled(!notificationsEnabled);
          toast.success(
            notificationsEnabled
              ? "تم تعطيل الإشعارات"
              : "تم تفعيل الإشعارات"
          );
        } else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            setNotificationsEnabled(true);
            toast.success("تم تفعيل الإشعارات بنجاح");
          }
        }
      }
    } catch (error) {
      toast.error("حدث خطأ في تفعيل الإشعارات");
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
        <CardContent className="pt-6 flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!issue) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-muted-foreground">لم يتم العثور على الطلب</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "in-progress":
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "bg-green-500/20 text-green-500";
      case "medium":
        return "bg-amber-500/20 text-amber-500";
      case "high":
        return "bg-orange-500/20 text-orange-500";
      case "critical":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const statusLabels = {
    new: "جديد",
    "in-progress": "قيد المعالجة",
    resolved: "تم الحل",
    rejected: "مرفوض",
  };

  const urgencyLabels = {
    low: "منخفضة",
    medium: "متوسطة",
    high: "عالية",
    critical: "حرجة",
  };

  return (
    <div className="w-full space-y-6">
      {/* Issue Header */}
      <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{issue.title}</h2>
                <p className="text-sm text-muted-foreground mt-2">{issue.description}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("تم نسخ الرابط")}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">مشاركة</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("تم تحميل الملف")}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تحميل</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">الحالة</p>
                <Badge className={getStatusColor(issue.status)}>
                  {statusLabels[issue.status as keyof typeof statusLabels]}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">الأولوية</p>
                <Badge className={getUrgencyColor(issue.urgency)}>
                  {urgencyLabels[issue.urgency as keyof typeof urgencyLabels]}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">الفئة</p>
                <Badge variant="outline">{issue.category}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">المنطقة</p>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {issue.district}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-accent/10">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{issue.views}</span> مشاهدة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{issue.comments}</span> تعليق
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(issue.createdAt, { locale: ar, addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{issue.createdBy}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MP Assignment */}
      {issue.mpAssigned && (
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مسؤول الطلب</p>
                  <p className="text-sm font-semibold text-foreground">{issue.mpAssigned}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">التواصل</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>تفاصيل الطلب</span>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={handleEnableNotifications}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">
                {notificationsEnabled ? "الإشعارات مفعلة" : "تفعيل الإشعارات"}
              </span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">الخط الزمني</span>
              </TabsTrigger>
              <TabsTrigger value="updates" className="gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">التحديثات</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">التعليقات</span>
              </TabsTrigger>
            </TabsList>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4 mt-4">
              <div className="space-y-4">
                {issue.timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-muted ${event.color}`}>
                        {event.icon}
                      </div>
                      {index < issue.timeline.length - 1 && (
                        <div className="w-0.5 h-12 bg-muted mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-foreground">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{event.actor}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(event.timestamp, { locale: ar, addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Updates Tab */}
            <TabsContent value="updates" className="space-y-4 mt-4">
              <div className="space-y-3">
                {issue.updates.map((update) => (
                  <div key={update.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{update.author}</span>
                        {update.isMP && (
                          <Badge className="text-xs bg-accent/20 text-accent border-accent/30">
                            نائب برلماني
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(update.timestamp, { locale: ar, addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{update.content}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 mt-4">
              <div className="space-y-4">
                {/* Add Comment Form */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="أضف تعليقك هنا..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-24 resize-none"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="w-full gap-2"
                  >
                    {submittingComment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        إرسال التعليق
                      </>
                    )}
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3 pt-4 border-t border-accent/10">
                  {issue.updates
                    .filter(u => u.type === "comment")
                    .map((comment) => (
                      <div key={comment.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(comment.timestamp, { locale: ar, addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeIssueTracker;
