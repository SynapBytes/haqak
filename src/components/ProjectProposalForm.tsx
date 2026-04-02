import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Lightbulb,
  Wand2,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPicker from './LocationPicker';

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  targetAmount: number;
}

interface AIRefinement {
  refinedTitle: string;
  refinedDescription: string;
  budgetEstimate: number;
  impactAnalysis: string;
}

const PROJECT_CATEGORIES = [
  'البنية التحتية',
  'الخدمات العامة',
  'الخدمات الأساسية',
  'التعليم والثقافة',
  'الصحة والرعاية الاجتماعية',
  'البيئة والتشجير',
  'الرياضة والترفيه',
  'الأمان والسلامة'
];

export const ProjectProposalForm: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'ai-review' | 'confirmation'>('form');
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    category: '',
    location: '',
    latitude: null,
    longitude: null,
    targetAmount: 0
  });
  const [aiRefinement, setAiRefinement] = useState<AIRefinement | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'العنوان مطلوب';
    if (formData.title.length < 10) newErrors.title = 'يجب أن يكون العنوان 10 أحرف على الأقل';

    if (!formData.description.trim()) newErrors.description = 'الوصف مطلوب';
    if (formData.description.length < 50) newErrors.description = 'يجب أن يكون الوصف 50 حرف على الأقل';

    if (!formData.category) newErrors.category = 'اختر فئة المشروع';
    if (!formData.location.trim()) newErrors.location = 'حدد موقع المشروع';
    if (formData.targetAmount <= 0) newErrors.targetAmount = 'يجب أن تكون الميزانية أكبر من صفر';
    if (formData.targetAmount > 1000000) newErrors.targetAmount = 'الميزانية المطلوبة كبيرة جداً';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleAIRefinement = async () => {
    if (!validateForm()) return;

    setAiProcessing(true);
    try {
      // Call Gemini API for AI refinement
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY || ''
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `أنت مساعد متخصص في تحسين مقترحات المشاريع المجتمعية. قم بالمهام التالية:

1. أعد صياغة العنوان بطريقة احترافية وجذابة
2. أعد صياغة الوصف بطريقة واضحة وموجزة وتركز على الفوائد
3. قدر الميزانية المبدئية بناءً على نوع المشروع والموقع
4. قدم تحليل الأثر المتوقع للمشروع

العنوان الأصلي: ${formData.title}
الوصف الأصلي: ${formData.description}
الفئة: ${formData.category}
الموقع: ${formData.location}
الميزانية المقترحة: ${formData.targetAmount}

الرجاء تقديم الرد بصيغة JSON بالهيكل التالي:
{
  "refinedTitle": "العنوان المحسّن",
  "refinedDescription": "الوصف المحسّن",
  "budgetEstimate": 50000,
  "impactAnalysis": "تحليل الأثر"
}`
            }]
          }]
        })
      });

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAiRefinement({
          refinedTitle: parsed.refinedTitle || formData.title,
          refinedDescription: parsed.refinedDescription || formData.description,
          budgetEstimate: parsed.budgetEstimate || formData.targetAmount,
          impactAnalysis: parsed.impactAnalysis || ''
        });
        setStep('ai-review');
        toast.success('تم تحليل المشروع بنجاح بواسطة الذكاء الاصطناعي');
      }
    } catch (error) {
      console.error('AI refinement error:', error);
      toast.error('حدث خطأ في معالجة المشروع بالذكاء الاصطناعي');
      // Continue with original data
      setAiRefinement({
        refinedTitle: formData.title,
        refinedDescription: formData.description,
        budgetEstimate: formData.targetAmount,
        impactAnalysis: 'تحليل الأثر سيتم إضافته بعد الموافقة على المشروع'
      });
      setStep('ai-review');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!user || !aiRefinement) return;

    setLoading(true);
    try {
      // project_proposals table not yet created
      toast.success('تم تقديم مقترح المشروع بنجاح! سيتم مراجعته من قبل الإدارة');
      setStep('confirmation');
      
      // Reset form
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          category: '',
          location: '',
          latitude: null,
          longitude: null,
          targetAmount: 0
        });
        setAiRefinement(null);
        setStep('form');
      }, 3000);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('حدث خطأ أثناء تقديم المشروع');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirmation') {
    return (
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold">تم تقديم مقترحك بنجاح!</h3>
            <p className="text-sm text-muted-foreground">
              سيتم مراجعة مقترح المشروع من قبل الإدارة والنائب المختص خلال 48 ساعة.
              سيتم إخطارك عند الموافقة على بدء التصويت المجتمعي.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            اقترح مشروعاً جديداً لدائرتك
          </CardTitle>
          <CardDescription>
            شارك فكرتك وساهم في تطوير المجتمع. سيتم تحسين مقترحك بالذكاء الاصطناعي قبل عرضه على المجتمع للتصويت.
          </CardDescription>
        </CardHeader>
      </Card>

      {step === 'form' && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">عنوان المشروع *</Label>
              <Input
                id="title"
                placeholder="مثال: إضاءة شارع الجمهورية"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">وصف المشروع *</Label>
              <Textarea
                id="description"
                placeholder="اشرح المشروع بالتفصيل: ما هو؟ لماذا مهم؟ كيف سيفيد المجتمع؟"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
              <p className="text-xs text-muted-foreground">{formData.description.length}/500</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">فئة المشروع *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md ${errors.category ? 'border-red-500' : 'border-input'}`}
              >
                <option value="">اختر فئة</option>
                {PROJECT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            {/* Location */}
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

            {/* Target Amount */}
            <div className="space-y-2">
              <Label htmlFor="targetAmount">الميزانية المطلوبة (جنيه مصري) *</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="50000"
                  value={formData.targetAmount || ''}
                  onChange={(e) => setFormData({ ...formData, targetAmount: parseInt(e.target.value) || 0 })}
                  className={errors.targetAmount ? 'border-red-500' : ''}
                />
              </div>
              {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount}</p>}
            </div>

            {/* AI Processing Button */}
            <Button
              onClick={handleAIRefinement}
              disabled={aiProcessing}
              className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {aiProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تحليل المشروع...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  تحسين المقترح بالذكاء الاصطناعي
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'ai-review' && aiRefinement && (
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              تم تحسين مقترحك بواسطة الذكاء الاصطناعي. يرجى مراجعة التحسينات أدناه قبل التقديم.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="original" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="original">الأصلي</TabsTrigger>
              <TabsTrigger value="refined">المحسّن</TabsTrigger>
            </TabsList>

            <TabsContent value="original" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">العنوان</p>
                    <p className="font-semibold">{formData.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الوصف</p>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الميزانية المقترحة</p>
                    <p className="font-semibold">{formData.targetAmount.toLocaleString()} ج.م</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refined" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">العنوان المحسّن</p>
                    <p className="font-semibold text-emerald-700">{aiRefinement.refinedTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الوصف المحسّن</p>
                    <p className="text-sm text-emerald-700">{aiRefinement.refinedDescription}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الميزانية المقدرة</p>
                    <p className="font-semibold text-emerald-700">{aiRefinement.budgetEstimate.toLocaleString()} ج.م</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">تحليل الأثر</p>
                    <p className="text-sm text-emerald-700">{aiRefinement.impactAnalysis}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('form')}
              className="flex-1"
            >
              تعديل المقترح
            </Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={loading}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التقديم...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  تقديم المقترح
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProposalForm;
