import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  Check,
  Landmark,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type LucideIcon = (props: React.ComponentProps<"svg">) => JSX.Element;

export type BusinessCategory = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
};

export const MAX_CATEGORIES = 10;

const REQUIRED_DEMO_SELECTION = [
  "civic-center",
  "social-services",
  "community-center",
  "software-company",
  "event-technology",
];

export const AVAILABLE_CATEGORIES: BusinessCategory[] = [
  {
    id: "civic-center",
    label: "Civic center",
    description: "المركز الرئيسي للعمليات المدنية والتنسيق المجتمعي",
    icon: Landmark,
    keywords: ["مدني", "مركز", "civic"],
  },
  {
    id: "social-services",
    label: "Social services organization",
    description: "الجهة المسؤولة عن خدمات الدعم الاجتماعي والرعاية",
    icon: Users,
    keywords: ["اجتماعية", "خدمات", "social"],
  },
  {
    id: "community-center",
    label: "Community center",
    description: "مساحة مجتمعية للفعاليات، التدريب، واللقاءات التطوعية",
    icon: Building2,
    keywords: ["community", "مركز مجتمعي", "تطوع"],
  },
  {
    id: "software-company",
    label: "Software company",
    description: "مقدم حلول برمجية ومنصات تقنية لخدمة المواطنين",
    icon: Sparkles,
    keywords: ["برمجيات", "تقنية", "software"],
  },
  {
    id: "event-technology",
    label: "Event technology service",
    description: "دعم الفعاليات بالتقنيات السمعية والبصرية والتذاكر الذكية",
    icon: CalendarRange,
    keywords: ["فعاليات", "events", "تقنية"],
  },
  {
    id: "education-hub",
    label: "Education & training hub",
    description: "برامج تعليمية، مسرعات تعلم، ومختبرات مهارات رقمية",
    icon: Building2,
    keywords: ["تعليم", "تدريب", "digital"],
  },
  {
    id: "healthcare-partner",
    label: "Healthcare partner",
    description: "مقدمو خدمات طبية، عيادات مجتمعية، ودعم الصحة العامة",
    icon: Users,
    keywords: ["صحة", "health", "عيادة"],
  },
  {
    id: "logistics-network",
    label: "Logistics & mobility network",
    description: "خدمات نقل، توصيل، وإدارة سلاسل الإمداد داخل الدائرة",
    icon: Landmark,
    keywords: ["نقل", "mobility", "logistics"],
  },
  {
    id: "green-energy",
    label: "Green energy cooperative",
    description: "حلول الطاقة المتجددة والاستدامة للمباني والفعاليات",
    icon: Sparkles,
    keywords: ["طاقة", "خضراء", "energy"],
  },
  {
    id: "security-audit",
    label: "Security & compliance audit",
    description: "حماية البيانات، الامتثال، وعمليات المراجعة الذكية",
    icon: Shield,
    keywords: ["أمن", "security", "compliance"],
  },
  {
    id: "financial-services",
    label: "Financial services office",
    description: "التمويل المجتمعي، المدفوعات الرقمية، وحلول المحافظ",
    icon: Landmark,
    keywords: ["مالية", "fintech", "مدفوعات"],
  },
  {
    id: "media-lab",
    label: "Media & outreach lab",
    description: "إعلام مجتمعي، بث مباشر، ورواية القصص الرقمية",
    icon: Users,
    keywords: ["إعلام", "media", "outreach"],
  },
];

export const resolvePrimaryAfterAdd = (currentPrimaryId: string | null, addedId: string) =>
  currentPrimaryId ?? addedId;

export const resolvePrimaryAfterRemoval = (
  updatedSelection: BusinessCategory[],
  currentPrimaryId: string | null,
) => {
  if (!updatedSelection.length) return null;
  const stillExists = currentPrimaryId && updatedSelection.some((cat) => cat.id === currentPrimaryId);
  return stillExists ? currentPrimaryId : updatedSelection[0].id;
};

type BusinessCategorySelectorProps = {
  initialSelectedIds?: string[];
  onChange?: (payload: { selected: BusinessCategory[]; primary: BusinessCategory | null }) => void;
};

export function BusinessCategorySelector({
  initialSelectedIds,
  onChange,
}: BusinessCategorySelectorProps) {
  const initialSelection = useMemo(() => {
    const seedIds = initialSelectedIds ?? REQUIRED_DEMO_SELECTION;
    return seedIds
      .map((id) => AVAILABLE_CATEGORIES.find((cat) => cat.id === id))
      .filter((cat): cat is BusinessCategory => Boolean(cat))
      .slice(0, MAX_CATEGORIES);
  }, [initialSelectedIds]);

  const [selectedCategories, setSelectedCategories] = useState<BusinessCategory[]>(initialSelection);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(initialSelection[0]?.id ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 220);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const selectedIds = useMemo(
    () => new Set(selectedCategories.map((cat) => cat.id)),
    [selectedCategories],
  );

  const filteredCategories = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return AVAILABLE_CATEGORIES.filter((cat) => {
      if (selectedIds.has(cat.id)) return false;
      if (!query) return true;
      return (
        cat.label.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query) ||
        cat.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
      );
    });
  }, [debouncedSearch, selectedIds]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredCategories.length]);

  const primaryCategory = useMemo(
    () => selectedCategories.find((cat) => cat.id === primaryCategoryId) ?? null,
    [primaryCategoryId, selectedCategories],
  );

  const updatePrimaryAfterRemoval = useCallback(
    (nextSelection: BusinessCategory[]) => {
      setPrimaryCategoryId((current) => resolvePrimaryAfterRemoval(nextSelection, current));
    },
    [],
  );

  const handleAddCategory = useCallback(
    (category: BusinessCategory) => {
      setSelectedCategories((prev) => {
        if (prev.some((cat) => cat.id === category.id)) {
          toast.warning("تم اختيار هذه الفئة بالفعل");
          return prev;
        }
        if (prev.length >= MAX_CATEGORIES) {
          toast.warning("تم الوصول للحد الأقصى (10 فئات)");
          return prev;
        }
        const nextSelection = [...prev, category];
        setPrimaryCategoryId((current) => resolvePrimaryAfterAdd(current, category.id));
        return nextSelection;
      });
    },
    [],
  );

  const handleRemoveCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => {
      const nextSelection = prev.filter((cat) => cat.id !== categoryId);
      updatePrimaryAfterRemoval(nextSelection);
      return nextSelection;
    });
  }, [updatePrimaryAfterRemoval]);

  const handlePrimaryChange = useCallback((categoryId: string) => {
    setPrimaryCategoryId(categoryId);
  }, []);

  useEffect(() => {
    if (!onChange) return;
    onChange({
      selected: selectedCategories,
      primary: primaryCategory,
    });
  }, [onChange, primaryCategory, selectedCategories]);

  const remainingSlots = MAX_CATEGORIES - selectedCategories.length;
  const progressValue = (selectedCategories.length / MAX_CATEGORIES) * 100;

  const handleKeyboardNavigation = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!filteredCategories.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((idx) => (idx + 1) % filteredCategories.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((idx) => (idx - 1 + filteredCategories.length) % filteredCategories.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        handleAddCategory(filteredCategories[activeIndex]);
      }
    },
    [activeIndex, filteredCategories, handleAddCategory],
  );

  return (
    <Card
      dir="rtl"
      className="civic-card relative overflow-hidden border border-white/30 bg-gradient-to-br from-white/80 via-white/70 to-white/40 shadow-2xl backdrop-blur-xl dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/50"
      aria-label="اختيار فئات الأعمال"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-blue-50/60 via-transparent to-purple-50/40 dark:from-indigo-950/40 dark:via-transparent dark:to-purple-900/20" />
      <CardHeader className="relative z-10 space-y-1 text-right">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
            مُحدد الفئات الاقتصادية
          </CardTitle>
          <Badge variant="outline" className="gap-1 rounded-full border-primary/40 bg-primary/10 px-3 text-primary">
            <Star className="h-3 w-3" />
            محسّن للأداء
          </Badge>
        </div>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          اختر حتى 10 فئات أعمال مع تعيين فئة أساسية تلقائياً. يدعم البحث السريع، التحكم الكامل عبر لوحة المفاتيح،
          وتجربة RTL ملساء.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-5 text-right">
        <div className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-lg backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>التقدم</span>
            <span className="font-semibold text-foreground">
              {selectedCategories.length}/{MAX_CATEGORIES}
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="h-full rounded-full bg-gradient-to-l from-blue-500 via-indigo-500 to-purple-500"
              aria-label={`تم اختيار ${selectedCategories.length} من ${MAX_CATEGORIES}`}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search className="h-4 w-4 text-primary" />
            ابحث عن فئة
            <span className="text-xs text-muted-foreground">(يدعم الأسهم + Enter)</span>
          </label>
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleKeyboardNavigation}
              placeholder="مثال: Civic center، خدمات اجتماعية، تقنية..."
              aria-label="ابحث عن فئة أعمال"
              className="h-12 rounded-2xl border border-white/60 bg-white/80 pr-12 text-right shadow-inner backdrop-blur-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-800/70 dark:bg-slate-900/80"
            />
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />

            <div className="absolute inset-x-0 top-[110%] z-30">
              <div className="rounded-2xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80">
                <ScrollArea className="max-h-64">
                  <AnimatePresence initial={false}>
                    {filteredCategories.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="p-4"
                      >
                        <Alert className="border-dashed">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>لا توجد نتائج</AlertTitle>
                          <AlertDescription>حاول تعديل كلمات البحث أو مسح الحقول المحددة.</AlertDescription>
                        </Alert>
                      </motion.div>
                    ) : (
                      filteredCategories.map((category, index) => (
                        <motion.button
                          key={category.id}
                          type="button"
                          onClick={() => handleAddCategory(category)}
                          role="option"
                          aria-selected={activeIndex === index}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-right transition-colors last:border-b-0 dark:border-slate-800/60",
                            activeIndex === index
                              ? "bg-primary/10 text-foreground ring-1 ring-primary/40"
                              : "hover:bg-muted/40",
                          )}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <category.icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground">{category.label}</p>
                              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-[11px]">
                                إضافة
                              </Badge>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">{category.description}</p>
                          </div>
                          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
                        </motion.button>
                      ))
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">الفئات المختارة</p>
              <p className="text-xs text-muted-foreground">الفئة الأولى تُعيَّن تلقائياً كـ أساسية</p>
            </div>
            <Badge className="rounded-full bg-primary/10 text-primary">
              {remainingSlots > 0 ? `متبقي ${remainingSlots}` : "اكتمل الحد"}
            </Badge>
          </div>
          <Separator className="my-3" />

          {selectedCategories.length === 0 ? (
            <Alert className="border-dashed">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>لم يتم اختيار أي فئة بعد</AlertTitle>
              <AlertDescription>ابدأ بالبحث أعلاه لإضافة الفئات الأكثر صلة بمبادرتك.</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap-reverse gap-3">
              <AnimatePresence initial={false}>
                {selectedCategories.map((category) => {
                  const isPrimary = category.id === primaryCategoryId;
                  return (
                    <motion.div
                      key={category.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur-sm transition hover:shadow-md",
                        isPrimary
                          ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30"
                          : "border-dashed border-muted/70 bg-muted/30",
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <category.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{category.label}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{category.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant={isPrimary ? "default" : "ghost"}
                          aria-pressed={isPrimary}
                          aria-label={isPrimary ? "الفئة الأساسية" : "تعيين كفئة أساسية"}
                          className={cn(
                            "h-8 w-8 rounded-full transition",
                            isPrimary
                              ? "bg-gradient-to-l from-blue-500 to-purple-500 text-white shadow"
                              : "border border-muted-foreground/20 text-muted-foreground",
                          )}
                          onClick={() => handlePrimaryChange(category.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`إزالة ${category.label}`}
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveCategory(category.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {selectedCategories.length >= MAX_CATEGORIES && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>وصلت للحد الأقصى</AlertTitle>
            <AlertDescription>احذف فئة لفتح مساحة جديدة قبل إضافة المزيد.</AlertDescription>
          </Alert>
        )}

        {primaryCategory && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-inner backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-l from-blue-500 to-purple-500 text-white shadow-lg">
                <Star className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Primary</p>
                <p className="text-lg font-bold text-foreground">{primaryCategory.label}</p>
                <p className="text-sm text-muted-foreground">{primaryCategory.description}</p>
              </div>
              <div className="ms-auto">
                <Badge variant="outline" className="rounded-full border-white/50 bg-white/50 backdrop-blur">
                  <Check className="mr-1 h-3 w-3 text-primary" />
                  مُثبت
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BusinessCategorySelector;
