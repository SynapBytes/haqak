# آلية الدفع على مراحل (Milestone Payments) وآلية التصويت على الاسترداد (Refund Voting) لمشروع Sutak

## 1. المقدمة

يستعرض هذا المستند التصميم المقترح لآليتي الدفع على مراحل (Milestone Payments) والتصويت على الاسترداد (Refund Voting) ضمن مشروع Sutak. تهدف هاتان الآليتان إلى تعزيز الثقة، الشفافية، والمساءلة المالية، مما يضمن حماية أموال المساهمين وتحقيق أهداف المشاريع المجتمعية بكفاءة.

## 2. الأهداف الرئيسية

*   ضمان صرف الأموال للمقاولين بناءً على الإنجاز الفعلي للمشروع.
*   توفير آلية للمساهمين لمراقبة تقدم المشروع والموافقة على الدفعات.
*   حماية المساهمين في حال فشل المشروع أو عدم اكتماله من خلال آلية استرداد واضحة.
*   دمج الآليتين مع نظام البلوكشين لضمان الشفافية وعدم القابلية للتغيير.

## 3. آلية الدفع على مراحل (Milestone Payments)

تعتمد هذه الآلية على تقسيم المشروع إلى مراحل محددة، حيث يتم صرف جزء من المبلغ الإجمالي عند اكتمال كل مرحلة والموافقة عليها.

### 3.1. تعريف المراحل (Milestone Definition)

*   عند إنشاء المشروع، يقوم المقاول المعتمد بتقديم خطة عمل مفصلة تتضمن تقسيم المشروع إلى مراحل واضحة (مثلاً: شراء المواد، بدء التنفيذ، إنجاز 50%، التسليم النهائي).
*   يتم تحديد نسبة من إجمالي تمويل المشروع لكل مرحلة (مثلاً: 30% للمرحلة الأولى، 40% للثانية، 30% للثالثة).
*   يتم عرض هذه المراحل ونسب الدفع للمساهمين للموافقة عليها قبل بدء جمع التبرعات.

### 3.2. عملية الموافقة على الدفع (Payment Approval Process)

*   عند اكتمال مرحلة معينة، يقوم المقاول بتقديم طلب "إنجاز مرحلة" عبر منصة Sutak، مرفقاً به الأدلة (صور، فيديوهات، تقارير).
*   يتم إخطار المساهمين بطلب الإنجاز، ويمكنهم مراجعة الأدلة والتصويت على الموافقة أو الرفض.
*   تتطلب الموافقة على صرف الدفعة موافقة نسبة معينة من المساهمين (مثلاً: 70% من المساهمين الذين صوتوا، أو 51% من إجمالي المساهمين).
*   في حال عدم الحصول على الموافقة، يتم إعطاء المقاول فترة لتصحيح الأوضاع أو تقديم أدلة إضافية.
*   بعد الموافقة، يتم إصدار أمر صرف (Disbursement Order) آلياً من حساب Sutak Escrow إلى حساب المقاول المعتمد في CIB.

### 3.3. التكامل التقني لآلية الدفع على مراحل

#### 3.3.1. قاعدة البيانات (Database Schema)

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

#### 3.3.2. واجهة برمجة التطبيقات (API Endpoints)

*   **`/api/projects/{id}/milestones`**: لإنشاء وعرض مراحل المشروع.
*   **`/api/milestones/{id}/submit_completion`**: لتقديم المقاول أدلة إنجاز المرحلة.
*   **`/api/milestones/{id}/vote`**: لتصويت المساهمين على الموافقة أو الرفض.
*   **`/api/milestones/{id}/disburse`**: نقطة نهاية إدارية/نظامية لصرف الدفعة بعد الموافقة.

## 4. آلية التصويت على الاسترداد (Refund Voting)

توفر هذه الآلية حماية للمساهمين في حال عدم اكتمال المشروع أو فشله، مما يسمح لهم باسترداد أموالهم بشروط محددة.

### 4.1. شروط تفعيل الاسترداد (Refund Trigger Conditions)

يمكن تفعيل آلية الاسترداد في الحالات التالية:

*   **عدم اكتمال جمع التبرعات:** إذا لم يصل المشروع إلى هدفه التمويلي خلال الفترة المحددة.
*   **فشل المشروع:** إذا توقف المقاول عن العمل أو لم يتمكن من إكمال المشروع بعد بدء التنفيذ.
*   **تصويت الأغلبية:** إذا صوتت نسبة معينة من المساهمين (مثلاً 51%) لصالح إلغاء المشروع واسترداد الأموال.

### 4.2. عملية التصويت على الاسترداد (Refund Voting Process)

*   في حال استيفاء أحد شروط تفعيل الاسترداد، يتم فتح باب التصويت للمساهمين.
*   يتم إخطار جميع المساهمين بضرورة التصويت خلال فترة زمنية محددة (مثلاً 7 أيام).
*   يصوت المساهمون بـ "نعم" لاسترداد الأموال أو "لا" للاستمرار في محاولة إنجاز المشروع (إذا كان ذلك ممكناً).
*   إذا وصلت نسبة التصويت بـ "نعم" إلى 51% من إجمالي المساهمين (أو من المساهمين الذين صوتوا)، يتم تفعيل عملية الاسترداد آلياً.

### 4.3. عملية الاسترداد (Refund Process)

*   عند تفعيل الاسترداد، يقوم النظام آلياً ببدء عملية تحويل الأموال من حساب Sutak Escrow إلى الحسابات البنكية أو المحافظ الإلكترونية للمساهمين.
*   يتم خصم "رسوم التشغيل التقنية" (2-3%) التي تم ذكرها سابقاً من المبلغ الأصلي لكل مساهم، ويتم إرجاع المبلغ المتبقي.
*   يتم توضيح جميع الخصومات بشفافية للمساهمين في كشف حساب الاسترداد.
*   يتم تسجيل كل عملية استرداد في سجل البلوكشين.

### 4.4. التكامل التقني لآلية التصويت على الاسترداد

#### 4.4.1. قاعدة البيانات (Database Schema)

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

#### 4.4.2. واجهة برمجة التطبيقات (API Endpoints)

*   **`/api/projects/{id}/start_refund_vote`**: نقطة نهاية إدارية/نظامية لبدء عملية التصويت على الاسترداد.
*   **`/api/projects/{id}/vote_refund`**: لتصويت المساهمين على الاسترداد.
*   **`/api/projects/{id}/process_refunds`**: نقطة نهاية إدارية/نظامية لتفعيل عملية الاسترداد بعد اكتمال التصويت.

## 5. التكامل مع البلوكشين (Blockchain Integration)

سيتم تسجيل جميع الأحداث الرئيسية المتعلقة بالدفع على مراحل والتصويت على الاسترداد في سجل البلوكشين `public.blockchain_audit_trail` لضمان الشفافية الكاملة وعدم القابلية للتغيير:

*   تعريف مرحلة جديدة للمشروع.
*   تقديم المقاول لطلب إنجاز مرحلة.
*   تصويت المساهمين على الموافقة/الرفض على دفعة مرحلة.
*   صرف دفعة مرحلة للمقاول.
*   بدء عملية التصويت على الاسترداد.
*   تصويت المساهمين على الاسترداد.
*   تنفيذ عملية استرداد الأموال للمساهمين.

## 6. الخلاصة

تعتبر آليتا الدفع على مراحل والتصويت على الاسترداد ركيزتين أساسيتين لتعزيز الثقة والأمان في منصة Sutak. من خلال هذه الآليات، نضمن أن أموال المساهمين تُدار بشفافية، وتُصرف بمسؤولية، وتُحمى في حال عدم اكتمال المشاريع، مما يعزز من مصداقية المنصة ويشجع على المشاركة المجتمعية الفعالة.
