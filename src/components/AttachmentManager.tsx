import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSignedDownloadUrl } from "@/lib/storage";

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  bucket?: string;
}

const AttachmentManager = ({ issueId }: { issueId: string }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttachments = async () => {
      const { data, error } = await supabase
        .from("issue_attachments")
        .select("id,file_path,file_name,file_type")
        .eq("issue_id", issueId);
      
      if (error) {
        console.error("Error fetching attachments:", error);
      } else {
        setAttachments(data || []);
      }
      setLoading(false);
    };

    fetchAttachments();
  }, [issueId]);

  const handleDownload = async (path: string, fileName: string, bucket?: string) => {
    try {
      const signedUrl = await getSignedDownloadUrl(bucket || "issue-attachments", path, 120);
      const link = document.createElement("a");
      link.href = signedUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`تم تحميل الملف: ${fileName}`);
    } catch (err) {
      toast.error("فشل تحميل الملف");
    }
  };

  if (loading) return <Loader2 className="w-4 h-4 animate-spin mx-auto" />;
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-accent" />
        المرفقات الرسمية الموثقة ({attachments.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((file) => (
          <div 
            key={file.id} 
            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-accent/30 transition-all group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-accent">
                {file.file_type?.includes("image") ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{file.file_name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{file.file_type?.split("/")[1] || "file"}</p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDownload(file.file_path, file.file_name, file.bucket)}
                className="w-8 h-8 rounded-full hover:bg-accent/10 hover:text-accent"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachmentManager;
