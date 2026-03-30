import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, FileText, Eye, Lock, UserCheck, Bell, Trash2, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const sections = [
  {
    icon: AlertTriangle,
    title: "تنويه مهم",
    content:
      "التطبيق لا يمثل جهة حكومية رسمية، بل منصة تواصل وتنظيم بين المواطنين وممثليهم. الهدف منه تسهيل عرض المشاكل وتنظيم المتابعة بشكل أكثر وضوحًا واحترافية.",
  },
  {
    icon: FileText,
    title: "البيانات التي يتم جمعها",
    content:
      "قد نقوم بجمع الاسم، رقم الهاتف، البريد الإلكتروني، بيانات الحساب، تفاصيل الشكاوى والمشاكل، وأي صور أو ملفات يرفعها المستخدم داخل المنصة، بالإضافة إلى بعض البيانات التقنية اللازمة لتحسين الأداء وتجربة الاستخدام.",
  },
  {
    icon: Eye,
    title: "كيفية استخدام البيانات",
    content:
      "تُستخدم البيانات لإدارة الحسابات، تحسين الخدمة، توجيه الشكاوى إلى أعضاء مجلس النواب المعنيين، إرسال الإشعارات والتحديثات، وتنظيم سير المتابعة داخل التطبيق بما يضمن وضوح التواصل وكفاءته.",
  },
  {
    icon: Lock,
    title: "حماية البيانات",
    content:
      "نلتزم بحماية بيانات المستخدمين وعدم مشاركتها مع أطراف خارجية دون إذن صريح، إلا إذا كان ذلك مطلوبًا قانونيًا. كما نتخذ إجراءات تقنية وتنظيمية مناسبة لتأمين البيانات أثناء التخزين والمعالجة.",
  },
  {
    icon: UserCheck,
    title: "خصوصية رقم المواطن",
    content:
      "رقم هاتف المواطن لا يظهر بشكل عام داخل المنصة، ولا يتم إتاحته إلا لعضو مجلس النواب فقط عند الحاجة الفعلية للتواصل المباشر بخصوص المشكلة أو الشكوى المقدمة.",
  },
  {
    icon: Bell,
    title: "الإشعارات والتواصل",
    content:
      "قد نستخدم بيانات التواصل لإرسال إشعارات مهمة تخص حالة الشكوى، أو أي تحديثات متعلقة بالحساب أو بسياسات التطبيق، بهدف إبقاء المستخدم على اطلاع دائم بما يخص طلبه.",
  },
  {
    icon: Trash2,
    title: "حقوق المستخدم",
    content:
      "يحق للمستخدم طلب تعديل بياناته أو حذفها، كما يمكنه طلب إغلاق حسابه وفقًا لسياسات المنصة. لأي طلبات أو استفسارات متعلقة بالخصوصية أو حماية البيانات، يرجى التواصل مع البريد الإداري: admin@haqak.org",
  },
];

const PrivacyPolicy = () => {
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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/10 bg-accent/[0.08] px-4 py-2 text-xs font-bold text-accent">
            <Shield className="h-4 w-4" />
            سياسة الخصوصية
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">سياسة الخصوصية</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            توضح هذه الصفحة كيف نتعامل مع بياناتك عند استخدام منصة حقك، وما هي حقوقك وآليات حماية معلوماتك.
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
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
          <Link to="/terms" className="font-medium text-accent hover:underline">
            شروط الاستخدام
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
