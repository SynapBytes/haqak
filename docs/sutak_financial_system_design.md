# تصميم النظام المالي المتكامل لمشروع Sutak

## 1. مقدمة عامة

يهدف هذا المستند إلى تقديم تصميم شامل ومتكامل للنظام المالي لمشروع Sutak، مع التركيز على تعزيز الشفافية، الأمان، والمساءلة في إدارة أموال المساهمين. يستند هذا التصميم إلى تحويل نموذج العمل من الاعتماد على الجمعيات الأهلية إلى نموذج "القطاع الخاص الملتزم بالمسؤولية المجتمعية"، حيث تتولى شركة Sutak دور "المشغل التقني والمالي" بالتعاون مع بنك CIB.

يتناول هذا المستند ثلاثة محاور رئيسية:

*   **نظام المقاول المعتمد (Verified Vendor System):** لضمان أن الأموال تُصرف فقط لجهات رسمية وموثوقة.
*   **آلية الدفع على مراحل (Milestone Payments):** لربط صرف الأموال بالإنجاز الفعلي للمشاريع.
*   **آلية التصويت على الاسترداد (Refund Voting):** لحماية حقوق المساهمين في حال عدم اكتمال المشاريع.

تتكامل هذه المحاور مع نظام البلوكشين الحالي في Sutak لضمان سجل تدقيق غير قابل للتغيير، مما يعزز الثقة ويقلل من أي شبهات.

## 2. الهيكل القانوني والمالي (نموذج الـ Escrow التجاري)

بدلاً من الاعتماد على جمعيات أهلية، ستعمل شركة Sutak كـ "أمين استثمار" (Trustee) للمبالغ المجمعة. يتم فتح حساب فرعي مخصص (Sub-account) في بنك CIB لمشاريع Sutak (Escrow Account). يتم صياغة "شروط وأحكام" (Terms & Conditions) داخل التطبيق يوافق عليها المواطن قبل الدفع، تنص على أن الشركة هي "أمين استثمار" لهذه المبالغ لتنفيذ غرض محدد.

لضمان عدم وجود خسائر، يتم إضافة "رسوم تشغيل تقنية" بسيطة جداً (مثلاً 2-3%) تغطي عمولة البنك وتكاليف السيرفرات، بحيث يصل مبلغ التبرع كاملاً للمشروع دون أن تتحمل شركتكم أي تكاليف إضافية.

## 3. الربط مع CIB ونظام التحصيل الفوري

سيتم ربط التطبيق مباشرة ببوابة دفع CIB Merchant Services، مما يضمن دخول الأموال إلى حساب الشركة في "ثوانٍ". لزيادة السرعة والأمان، سيتم دمج نظام "المحافظ الإلكترونية الذكية" (Smart Wallets Integration) لدعم الدفع عبر "فودافون كاش" أو "CIB Smart Wallet".

## 4. "البلوكشين" كدرع حماية للشركة (Financial Transparency)

كل مليم يدخل الحساب يُسجل في Blockchain Ledger الخاص بـ Sutak. هذا يضمن عدم إمكانية تعديل سجلات الدفع، ويوفر "كشف حساب تقني" يطابق كشف حساب البنك، مما يرفع أي شبهة "غسيل أموال" أو "تربح غير مشروع" عن الشركة.


## 5. نظام المقاول المعتمد (Verified Vendor System)

### 5.1. المقدمة

يهدف هذا الجزء إلى توضيح التصميم المقترح لنظام المقاول المعتمد (Verified Vendor System) ضمن مشروع Sutak. يهدف هذا النظام إلى ضمان الشفافية، الأمان، والمساءلة في عملية صرف الأموال للمنفذين الفعليين للمشاريع المجتمعية، وذلك لتجنب أي شبهات أو مخاطر تتعلق بسوء استخدام الأموال أو عدم إتمام المشاريع.

### 5.2. الأهداف الرئيسية

*   ضمان أن الأموال يتم صرفها فقط لجهات رسمية وموثوقة.
*   توفير آلية واضحة للتحقق من هوية المقاولين ومؤهلاتهم.
*   دمج النظام مع البنية التحتية المالية الحالية (CIB) ونظام البلوكشين للمساءلة.
*   حماية الشركة والمساهمين من أي مخاطر قانونية أو مالية.

### 5.3. التعريف القانوني للمقاول المعتمد

يُعرف "المقاول المعتمد" بأنه أي كيان قانوني (شركة، مؤسسة، جهة حكومية) مسجل رسمياً ولديه القدرة القانونية والتقنية على تنفيذ المشاريع المجتمعية التي يتم تمويلها عبر منصة Sutak. يجب أن يستوفي المقاول المعتمد مجموعة من الشروط والمعايير التي تضمن أهليته وموثوقيته.

### 5.4. عملية التحقق من المقاولين (Vendor Verification Process)

تتضمن عملية التحقق من المقاولين عدة مراحل لضمان أعلى مستويات الأمان والموثوقية:

#### 5.4.1. التسجيل الأولي (Initial Registration)

*   يقوم المقاول بإنشاء حساب على منصة Sutak كـ "جهة منفذة".
*   يقدم المقاول معلومات أساسية مثل اسم الشركة، نوع الكيان القانوني، وبيانات الاتصال.

#### 5.4.2. تقديم المستندات القانونية (Submission of Legal Documents)

يجب على المقاول تقديم المستندات التالية للتحقق:

*   **السجل التجاري:** يثبت الكيان القانوني للشركة ونشاطها.
*   **البطاقة الضريبية:** تؤكد التسجيل الضريبي للشركة.
*   **رخصة مزاولة النشاط:** حسب طبيعة المشروع (مثلاً، رخصة مقاولات، رخصة توريد).
*   **شهادة تسجيل ضريبة القيمة المضافة (إن وجدت).**
*   **بيانات الحساب البنكي الرسمي للشركة:** يجب أن يكون حساباً بنكياً باسم الكيان القانوني للمقاول، ويفضل أن يكون في CIB لتسهيل التعاملات.
*   **سجل المشاريع السابقة (Portfolio):** لإثبات الخبرة والكفاءة.

#### 5.4.3. التحقق من المستندات (Document Verification)

*   يقوم فريق Sutak القانوني والإداري بمراجعة جميع المستندات المقدمة.
*   يتم التحقق من صحة المستندات من خلال الجهات الحكومية المختصة (السجل التجاري، مصلحة الضرائب، إلخ).
*   قد يتطلب الأمر إجراء مكالمات هاتفية أو زيارات ميدانية للتحقق من المقاولين ذوي المشاريع الكبيرة أو الحساسة.

#### 5.4.4. توقيع اتفاقية إطار (Framework Agreement)

*   بعد التحقق الناجح، يتم توقيع اتفاقية إطار بين Sutak والمقاول المعتمد. تحدد هذه الاتفاقية الشروط العامة للتعاون، معايير الجودة، آليات حل النزاعات، والالتزام بالشفافية.

#### 5.4.5. الاعتماد (Accreditation)

*   بعد استكمال جميع الخطوات، يتم منح المقاول صفة "مقاول معتمد" على منصة Sutak، ويصبح مؤهلاً لتقديم عروض لتنفيذ المشاريع.

### 5.5. التكامل التقني

#### 5.5.1. قاعدة البيانات (Database Schema)

سيتم إضافة جدول جديد `verified_vendors` أو توسيع جدول `users` ليشمل حقولاً خاصة بالمقاولين المعتمدين:

```sql
CREATE TABLE public.verified_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    legal_entity_type TEXT NOT NULL, -- e.g., 'شركة مساهمة', 'مؤسسة فردية'
    commercial_registration_no TEXT UNIQUE NOT NULL,
    tax_id_no TEXT UNIQUE NOT NULL,
    license_no TEXT, -- License for specific activities
    vat_registration_no TEXT, -- If applicable
    bank_name TEXT NOT NULL DEFAULT 'CIB',
    bank_account_number TEXT UNIQUE NOT NULL,
    bank_account_holder TEXT NOT NULL,
    contact_person_id UUID REFERENCES auth.users(id), -- Link to a user account
    status TEXT NOT NULL DEFAULT 'pending_verification', -- 'pending_verification', 'verified', 'rejected'
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for security
ALTER TABLE public.verified_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view their own profile" ON public.verified_vendors FOR SELECT USING (auth.uid() = contact_person_id);
CREATE POLICY "Admins can manage vendors" ON public.verified_vendors FOR ALL USING (auth.role() = 'admin');
```

#### 5.5.2. واجهة برمجة التطبيقات (API Endpoints)

*   **`/api/vendors/register`**: لتسجيل المقاولين الجدد.
*   **`/api/vendors/{id}/documents`**: لرفع المستندات.
*   **`/api/vendors/{id}/status`**: للاستعلام عن حالة التحقق.
*   **`/api/admin/vendors/{id}/verify`**: نقطة نهاية إدارية لتغيير حالة التحقق.

#### 5.5.3. واجهة المستخدم (User Interface)

*   **لوحة تحكم للمقاولين:** لعرض حالة التحقق، رفع المستندات، وعرض المشاريع المتاحة.
*   **واجهة إدارية:** لإدارة طلبات التحقق، مراجعة المستندات، وتغيير حالة المقاولين.

### 5.6. التكامل مع البلوكشين (Blockchain Integration)

سيتم تسجيل الأحداث الرئيسية المتعلقة بالمقاولين المعتمدين في سجل البلوكشين لضمان الشفافية وعدم القابلية للتغيير:

*   تسجيل مقاول جديد.
*   تغيير حالة التحقق (من قيد الانتظار إلى معتمد أو مرفوض).
*   توقيع اتفاقية إطار مع مقاول.
*   أي تعديلات جوهرية على بيانات المقاول.

سيتم استخدام `public.blockchain_audit_trail` الحالي لتسجيل هذه الأحداث، مع إضافة `payload` مناسب يصف الحدث.

### 5.7. الخلاصة

يوفر نظام المقاول المعتمد طبقة أساسية من الثقة والأمان لمشروع Sutak. من خلال عملية تحقق صارمة وتكامل تقني قوي، نضمن أن الأموال التي يساهم بها المواطنون تصل إلى أيدي أمينة وقادرة على تنفيذ المشاريع بكفاءة وشفافية.

## 6. آلية الدفع على مراحل (Milestone Payments) وآلية التصويت على الاسترداد (Refund Voting)

### 6.1. المقدمة

يستعرض هذا الجزء التصميم المقترح لآليتي الدفع على مراحل (Milestone Payments) والتصويت على الاسترداد (Refund Voting) ضمن مشروع Sutak. تهدف هاتان الآليتان إلى تعزيز الثقة، الشفافية، والمساءلة المالية، مما يضمن حماية أموال المساهمين وتحقيق أهداف المشاريع المجتمعية بكفاءة.

### 6.2. الأهداف الرئيسية

*   ضمان صرف الأموال للمقاولين بناءً على الإنجاز الفعلي للمشروع.
*   توفير آلية للمساهمين لمراقبة تقدم المشروع والموافقة على الدفعات.
*   حماية المساهمين في حال فشل المشروع أو عدم اكتماله من خلال آلية استرداد واضحة.
*   دمج الآليتين مع نظام البلوكشين لضمان الشفافية وعدم القابلية للتغيير.

### 6.3. آلية الدفع على مراحل (Milestone Payments)

تعتمد هذه الآلية على تقسيم المشروع إلى مراحل محددة، حيث يتم صرف جزء من المبلغ الإجمالي عند اكتمال كل مرحلة والموافقة عليها.

#### 6.3.1. تعريف المراحل (Milestone Definition)

*   عند إنشاء المشروع، يقوم المقاول المعتمد بتقديم خطة عمل مفصلة تتضمن تقسيم المشروع إلى مراحل واضحة (مثلاً: شراء المواد، بدء التنفيذ، إنجاز 50%، التسليم النهائي).
*   يتم تحديد نسبة من إجمالي تمويل المشروع لكل مرحلة (مثلاً: 30% للمرحلة الأولى، 40% للثانية، 30% للثالثة).
*   يتم عرض هذه المراحل ونسب الدفع للمساهمين للموافقة عليها قبل بدء جمع التبرعات.

#### 6.3.2. عملية الموافقة على الدفع (Payment Approval Process)

*   عند اكتمال مرحلة معينة، يقوم المقاول بتقديم طلب "إنجاز مرحلة" عبر منصة Sutak، مرفقاً به الأدلة (صور، فيديوهات، تقارير).
*   يتم إخطار المساهمين بطلب الإنجاز، ويمكنهم مراجعة الأدلة والتصويت على الموافقة أو الرفض.
*   تتطلب الموافقة على صرف الدفعة موافقة نسبة معينة من المساهمين (مثلاً: 70% من المساهمين الذين صوتوا، أو 51% من إجمالي المساهمين).
*   في حال عدم الحصول على الموافقة، يتم إعطاء المقاول فترة لتصحيح الأوضاع أو تقديم أدلة إضافية.
*   بعد الموافقة، يتم إصدار أمر صرف (Disbursement Order) آلياً من حساب Sutak Escrow إلى حساب المقاول المعتمد في CIB.

#### 6.3.3. التكامل التقني لآلية الدفع على مراحل

##### 6.3.3.1. قاعدة البيانات (Database Schema)

سيتم إضافة جداول جديدة أو تعديل جداول قائمة:

```sql
-- Table for project milestones
CREATE TABLE public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    percentage_of_total_fund DECIMAL(5,2) NOT NULL, -- e.g., 0.30 for 30%
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed_pending_approval', 'approved', 'rejected'
    completion_evidence JSONB, -- URLs to images, videos, reports
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_by_count INT DEFAULT 0, -- Number of contributors who approved
    rejected_by_count INT DEFAULT 0, -- Number of contributors who rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (project_id, milestone_number)
);

-- Table to record contributor votes on milestones
CREATE TABLE public.milestone_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE CASCADE,
    contributor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_status BOOLEAN NOT NULL, -- TRUE for approve, FALSE for reject
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (milestone_id, contributor_id)
);

-- Update projects table to track total funded amount and disbursed amount
ALTER TABLE public.projects
ADD COLUMN total_funded_amount DECIMAL(18,2) DEFAULT 0.00,
ADD COLUMN total_disbursed_amount DECIMAL(18,2) DEFAULT 0.00;
```

##### 6.3.3.2. واجهة برمجة التطبيقات (API Endpoints)

*   **`/api/projects/{id}/milestones`**: لإنشاء وعرض مراحل المشروع.
*   **`/api/milestones/{id}/submit_completion`**: لتقديم المقاول أدلة إنجاز المرحلة.
*   **`/api/milestones/{id}/vote`**: لتصويت المساهمين على الموافقة أو الرفض.
*   **`/api/milestones/{id}/disburse`**: نقطة نهاية إدارية/نظامية لصرف الدفعة بعد الموافقة.

### 6.4. آلية التصويت على الاسترداد (Refund Voting)

توفر هذه الآلية حماية للمساهمين في حال عدم اكتمال المشروع أو فشله، مما يسمح لهم باسترداد أموالهم بشروط محددة.

#### 6.4.1. شروط تفعيل الاسترداد (Refund Trigger Conditions)

يمكن تفعيل آلية الاسترداد في الحالات التالية:

*   **عدم اكتمال جمع التبرعات:** إذا لم يصل المشروع إلى هدفه التمويلي خلال الفترة المحددة.
*   **فشل المشروع:** إذا توقف المقاول عن العمل أو لم يتمكن من إكمال المشروع بعد بدء التنفيذ.
*   **تصويت الأغلبية:** إذا صوتت نسبة معينة من المساهمين (مثلاً 51%) لصالح إلغاء المشروع واسترداد الأموال.

#### 6.4.2. عملية التصويت على الاسترداد (Refund Voting Process)

*   في حال استيفاء أحد شروط تفعيل الاسترداد، يتم فتح باب التصويت للمساهمين.
*   يتم إخطار جميع المساهمين بضرورة التصويت خلال فترة زمنية محددة (مثلاً 7 أيام).
*   يصوت المساهمون بـ "نعم" لاسترداد الأموال أو "لا" للاستمرار في محاولة إنجاز المشروع (إذا كان ذلك ممكناً).
*   إذا وصلت نسبة التصويت بـ "نعم" إلى 51% من إجمالي المساهمين (أو من المساهمين الذين صوتوا)، يتم تفعيل عملية الاسترداد آلياً.

#### 6.4.3. عملية الاسترداد (Refund Process)

*   عند تفعيل الاسترداد، يقوم النظام آلياً ببدء عملية تحويل الأموال من حساب Sutak Escrow إلى الحسابات البنكية أو المحافظ الإلكترونية للمساهمين.
*   يتم خصم "رسوم التشغيل التقنية" (2-3%) التي تم ذكرها سابقاً من المبلغ الأصلي لكل مساهم، ويتم إرجاع المبلغ المتبقي.
*   يتم توضيح جميع الخصومات بشفافية للمساهمين في كشف حساب الاسترداد.
*   يتم تسجيل كل عملية استرداد في سجل البلوكشين.

#### 6.4.4. التكامل التقني لآلية التصويت على الاسترداد

##### 6.4.4.1. قاعدة البيانات (Database Schema)

```sql
-- Table for refund voting
CREATE TABLE public.refund_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    contributor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_for_refund BOOLEAN NOT NULL, -- TRUE for refund, FALSE to continue
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (project_id, contributor_id)
);

-- Update projects table to track refund status
ALTER TABLE public.projects
ADD COLUMN refund_status TEXT DEFAULT 'not_applicable', -- 'not_applicable', 'voting_open', 'refund_in_progress', 'refunded'
ADD COLUMN refund_vote_threshold DECIMAL(5,2) DEFAULT 0.51; -- 51%
```

##### 6.4.4.2. واجهة برمجة التطبيقات (API Endpoints)

*   **`/api/projects/{id}/start_refund_vote`**: نقطة نهاية إدارية/نظامية لبدء عملية التصويت على الاسترداد.
*   **`/api/projects/{id}/vote_refund`**: لتصويت المساهمين على الاسترداد.
*   **`/api/projects/{id}/process_refunds`**: نقطة نهاية إدارية/نظامية لتفعيل عملية الاسترداد بعد اكتمال التصويت.

### 6.5. التكامل مع البلوكشين (Blockchain Integration)

سيتم تسجيل جميع الأحداث الرئيسية المتعلقة بالدفع على مراحل والتصويت على الاسترداد في سجل البلوكشين `public.blockchain_audit_trail` لضمان الشفافية الكاملة وعدم القابلية للتغيير:

*   تعريف مرحلة جديدة للمشروع.
*   تقديم المقاول لطلب إنجاز مرحلة.
*   تصويت المساهمين على الموافقة/الرفض على دفعة مرحلة.
*   صرف دفعة مرحلة للمقاول.
*   بدء عملية التصويت على الاسترداد.
*   تصويت المساهمين على الاسترداد.
*   تنفيذ عملية استرداد الأموال للمساهمين.

### 6.6. الخلاصة

تعتبر آليتا الدفع على مراحل والتصويت على الاسترداد ركيزتين أساسيتين لتعزيز الثقة والأمان في منصة Sutak. من خلال هذه الآليات، نضمن أن أموال المساهمين تُدار بشفافية، وتُصرف بمسؤولية، وتُحمى في حال عدم اكتمال المشاريع، مما يعزز من مصداقية المنصة ويشجع على المشاركة المجتمعية الفعالة.
