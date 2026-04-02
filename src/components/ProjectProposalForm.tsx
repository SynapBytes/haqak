import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPicker from './LocationPicker';

interface ProjectFormData {
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  targetAmount: number | '';
}

export const ProjectProposalForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    location: '',
    latitude: null,
    longitude: null,
    targetAmount: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState<{ center_id: string | null; verification_status: string | null } | null>(null);
  const [hasMpRole, setHasMpRole] = useState(false);

  const isVerifiedCitizenOnly = !!user && profile?.verification_status === 'verified' && !!profile?.center_id && !hasMpRole;

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const [{ data: profileData }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('center_id, verification_status').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);

      setProfile(profileData ?? null);
      setHasMpRole((roles ?? []).some((r) => r.role === 'mp'));
    };

    load();
  }, [user?.id]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'العنوان مطلوب';
    if (formData.title.trim().length < 10) newErrors.title = 'يجب أن يكون العنوان 10 أحرف على الأقل';

    if (!formData.description.trim()) newErrors.description = 'الوصف مطلوب';
    if (formData.description.trim().length < 50) newErrors.description = 'يجب أن يكون الوصف 50 حرف على الأقل';

    if (!formData.location.trim()) newErrors.location = 'حدد موقع المشروع';
    if (Number(formData.targetAmount) <= 0) newErrors.targetAmount = 'يجب أن تكون الميزانية أكبر من صفر';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmitProposal = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول');
      return;
    }

    if (!isVerifiedCitizenOnly) {
      toast.error('إنشاء المشاريع متاح فقط للمواطنين الموثقين');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const centerId = profile?.center_id;
      if (!centerId) {
        throw new Error('لا يوجد مركز مرتبط بالحساب');
      }

      const { data: insertedProject, error: projectError } = await supabase
        .from('community_projects')
        .insert({
          creator_user_id: user.id,
          center_id: centerId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          target_amount: Number(formData.targetAmount),
          status: 'funding_active',
        })
        .select('id')
        .single();

      if (projectError) throw projectError;

      const { error: founderError } = await supabase.from('project_founders').insert({
        project_id: insertedProject.id,
        founder_user_id: user.id,
      });

      if (founderError) throw founderError;

      setDone(true);
      toast.success('تم إنشاء المشروع وإضافتك كمؤسس أول بنجاح');

      setFormData({
        title: '',
        description: '',
        location: '',
        latitude: null,
        longitude: null,
        targetAmount: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Submission error:', error);
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المشروع';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            إنشاء مشروع مجتمعي جديد
          </CardTitle>
          <CardDescription>
            إنشاء المشروع متاح فقط للمواطنين الموثقين، ويتم ربطه تلقائياً بمركزك.
          </CardDescription>
        </CardHeader>
      </Card>

      {!isVerifiedCitizenOnly && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            يلزم أن تكون مواطناً موثقاً ومحدد المركز لإنشاء مشروع أو الانضمام كمؤسس.
          </AlertDescription>
        </Alert>
      )}

      {done && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            تم إنشاء المشروع بنجاح ويمكنك الآن دعوة 4 مؤسسين موثقين من نفس المركز.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان المشروع *</Label>
            <Input
              id="title"
              placeholder="مثال: صيانة إنارة الشارع الرئيسي"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف المشروع *</Label>
            <Textarea
              id="description"
              placeholder="اشرح المشروع بالتفصيل"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label>موقع المشروع *</Label>
            <Input
              placeholder="اسم الشارع أو الحي"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={errors.location ? 'border-red-500' : ''}
            />
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
            />
            {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">الميزانية المطلوبة (جنيه مصري) *</Label>
            <Input
              id="targetAmount"
              type="number"
              placeholder="50000"
              value={formData.targetAmount}
              onChange={(e) => {
                const next = e.target.value;
                setFormData({ ...formData, targetAmount: next === '' ? '' : parseInt(next, 10) || 0 });
              }}
              className={errors.targetAmount ? 'border-red-500' : ''}
            />
            {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount}</p>}
          </div>

          <Button
            onClick={handleSubmitProposal}
            disabled={loading || !isVerifiedCitizenOnly}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                إنشاء المشروع
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectProposalForm;
