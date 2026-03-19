import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Gavel, AlertTriangle, Scale, ShieldCheck, Ban, Users, FileText } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const sections = [
  {
    icon: AlertTriangle,
    title: "تنويه مهم",
    content:
      "التطبيق لا يمثل جهة حكومية رسمية، بل منصة تواصل وتنظيم بين المواطنين وممثليهم. استخدام التطبيق يعني موافقتك على هذه الشروط والأحكام.",
  },
  {
    icon: Scale,
    title: "طبيعة الخدمة",
    content:
      "يعمل التطبيق كوسيط رقمي فقط بين المواطن وعضو مجلس النواب، ويهدف إلى تسهيل عرض المشاكل وتنظيم المتابعة. التطبيق لا يضمن نتيجة معينة ولا يفرض على أي نائب اتخاذ إجراء محدد تجاه أي شكوى.",
  },
  {
    icon: ShieldCheck,
    title: "الاستخدام القانوني",
    content:
      "يجب استخدام التطبيق لأغراض قانونية ومشروعة فقط، مع تقديم معلومات صحيحة وعدم استغلال المنصة في أنشطة مضللة أو غير قانونية أو تسيء للآخرين أو للجهات العامة.",
  },
  {
    icon: Ban,
    title: "المحتوى غير المسموح",
    content:
      "يُمنع إرسال أي محتوى يتضمن إساءة، سبًّا، تشهيرًا، تهديدًا، خطاب كراهية، معلومات كاذبة متعمدة، أو أي مواد غير لائقة أو مخالفة للقانون أو الآداب العامة.",
  },
  {
    icon: Users,
    title: "مسؤولية النواب",
    content:
      "عضو مجلس النواب غير ملزم بحل كل مشكلة تُعرض عليه من خلال التطبيق، ويظل القرار النهائي وآلية التعامل مع المشكلة ضمن نطاق صلاحياته وتقديره الشخصي أو المؤسسي.",
  },
  {
    icon: Gavel,
    title: "حقوق إدارة التطبيق",
    content:
      "يحق لإدارة التطبيق مراجعة أو إخفاء أو حذف أي محتوى مخالف، كما يحق لها تعليق أو إيقاف الحسابات التي تنتهك هذه الشروط أو تستخدم المنصة بشكل يضر بالمستخدمين أو بسلامة الخدمة.",
  },
  {
    icon: FileText,
    title: "إخلاء المسؤولية",
    content:
      "يتم تقديم التطبيق كما هو، دون ضمانات صريحة أو ضمنية. لا يتحمل التطبيق مسؤولية مباشرة أو غير مباشرة عن عدم استجابة النائب، أو عن أي قرارات تُتخذ خارج نطاق المنصة.",
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-4xl px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/[0.08] px-4 py-2 text-xs font-bold text-primary">
            <Gavel className="h-4 w-4" />
            شروط الاستخدام
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">شروط الاستخدام</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            يرجى قراءة هذه الشروط بعناية قبل استخدام منصة Sutak، حيث تنظّم هذه الشروط طريقة استخدام التطبيق وحدود مسؤوليته.
          </p>
        </motion.div>

        <div className="space-y-5">
          {sections.map((section, index) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <section.icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-foreground md:text-xl">{section.title}</h2>
              </div>
              <p className="text-sm leading-8 text-muted-foreground md:text-base">{section.content}</p>
            </motion.section>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <span>يمكنك أيضًا الاطلاع على </span>
          <Link to="/privacy" className="font-medium text-accent hover:underline">
            سياسة الخصوصية
          </Link>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
