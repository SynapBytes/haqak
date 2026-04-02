import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizeText } from "@/lib/sanitize";
import { buildMpPublicImagePath, uploadMpPublicImage } from "@/lib/storage";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { validateImageFile } from "@/lib/contentSecurity";

interface MPPost {
  id: string;
  title: string | null;
  body: string;
  images: string[];
  created_at: string;
  ai_meta: Record<string, unknown> | null;
}

const MPPublicPostsManager = () => {
  const { user, profile } = useAuth();
  const { csrfHeader, csrfToken } = useCsrfToken();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [posts, setPosts] = useState<MPPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [aiMeta, setAiMeta] = useState<Record<string, unknown> | null>(null);

  const canPublish = useMemo(() => profile?.is_approved && profile?.verification_status === "verified", [profile]);

  const loadPosts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("mp_public_posts")
      .select("id, title, body, images, created_at, ai_meta")
      .eq("mp_user_id", user.id)
      .order("created_at", { ascending: false });
    setPosts(
      (data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        created_at: p.created_at,
        ai_meta: (p.ai_meta as Record<string, unknown>) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadPosts();
  }, [user?.id]);

  const handleUploadImages = async (fileList: FileList | null) => {
    if (!user || !fileList) return;
    const nextFiles = Array.from(fileList).slice(0, 5);
    const uploaded: string[] = [];
    for (const file of nextFiles) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.errors[0] ?? "صورة غير صالحة");
        continue;
      }
      const path = buildMpPublicImagePath(user.id, file.name);
      await uploadMpPublicImage(path, file);
      const { data } = supabase.storage.from("mp-public-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded].slice(0, 5));
  };

  const handleRefine = async () => {
    if (!body.trim()) return;
    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-mp-post", {
        body: { title: sanitizeText(title), body: sanitizeText(body) },
        headers: { [csrfHeader]: csrfToken },
      });
      if (error) throw error;
      setTitle(sanitizeText(data?.refined_title ?? title));
      setBody(sanitizeText(data?.refined_body ?? body));
      setAiMeta((data?.ai_meta as Record<string, unknown>) ?? null);
      toast.success("تم تحسين النص بالذكاء الاصطناعي");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحسين النص");
    } finally {
      setRefining(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !profile?.center_id) return;
    if (!canPublish) {
      toast.error("يلزم اعتماد وتحقق النائب قبل النشر");
      return;
    }
    if (!body.trim()) {
      toast.error("النص مطلوب");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        mp_user_id: user.id,
        center_id: profile.center_id,
        title: title ? sanitizeText(title) : null,
        body: sanitizeText(body),
        images,
        visibility: "public" as const,
        ai_meta: aiMeta,
      };
      const { error } = await supabase.from("mp_public_posts").insert(payload);
      if (error) throw error;
      toast.success("تم نشر المنشور");
      setTitle("");
      setBody("");
      setImages([]);
      setAiMeta(null);
      await loadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر نشر المنشور");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mp_public_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم حذف المنشور");
    await loadPosts();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>المنشورات/المشاريع العامة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canPublish && (
            <p className="text-sm text-destructive">النشر متاح فقط بعد اعتماد وتحقق النائب.</p>
          )}
          <Input placeholder="العنوان (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="اكتب المنشور العام..." value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => void handleUploadImages(e.target.files)}
          />
          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((url) => (
                <img key={url} src={url} alt="post" className="w-24 h-24 rounded-md object-cover" />
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefine} disabled={refining || !body.trim()}>
              {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحسين بالذكاء الاصطناعي"}
            </Button>
            <Button onClick={handleCreate} disabled={saving || !canPublish}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>منشوراتي العامة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد منشورات عامة بعد.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="border rounded-xl p-3 space-y-2">
                {post.title && <h4 className="font-semibold">{post.title}</h4>}
                <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                {!!post.images.length && (
                  <div className="flex gap-2 flex-wrap">
                    {post.images.map((url) => (
                      <img key={url} src={url} alt="post" className="w-24 h-24 rounded-md object-cover" />
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("ar-EG")}</span>
                  <Button variant="destructive" size="sm" onClick={() => void handleDelete(post.id)}>
                    حذف
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MPPublicPostsManager;
