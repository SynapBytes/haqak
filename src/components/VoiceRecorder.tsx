import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onRecordingComplete: (blob: Blob) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete, onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        onRecordingComplete(blob);
        handleTranscription(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("جاري التسجيل... تحدث بوضوح");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("تعذر الوصول إلى الميكروفون. يرجى التأكد من الأذونات.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    // In a real implementation, we would send this to a Whisper API or Gemini via Edge Function
    // For this prototype, we simulate the transcription delay
    setTimeout(() => {
      const mockTranscription = "هناك مشكلة كبيرة في انقطاع المياه في شارعنا منذ ثلاثة أيام، نرجو التدخل السريع لحل الأزمة.";
      onTranscriptionComplete(mockTranscription);
      setIsTranscribing(false);
      toast.success("تم تحويل الصوت إلى نص بنجاح");
    }, 2000);
  };

  const reset = () => {
    setAudioBlob(null);
    setIsTranscribing(false);
  };

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        {!isRecording && !audioBlob && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
            <Button type="button" onClick={startRecording} variant="outline" className="gap-2 rounded-xl border-accent/20 text-accent hover:bg-accent/5">
              <Mic className="w-4 h-4" />
              تسجيل صوتي
            </Button>
          </motion.div>
        )}

        {isRecording && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-xl animate-pulse">
              <div className="w-2 h-2 rounded-full bg-destructive"></div>
              <span className="text-xs font-bold">جاري التسجيل...</span>
            </div>
            <Button type="button" onClick={stopRecording} variant="destructive" size="icon" className="rounded-full w-10 h-10">
              <Square className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {audioBlob && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-success/10 text-success rounded-xl">
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span className="text-xs font-bold">{isTranscribing ? "جاري التحويل..." : "تم التحويل"}</span>
            </div>
            <Button type="button" onClick={reset} variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceRecorder;
