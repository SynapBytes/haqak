import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { sendPushToUser } from "@/lib/pushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  MessageCircle, Send, X, Loader2, Lock, Phone, PhoneCall
} from "lucide-react";

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatDrawerProps {
  issueId: string;
  issueTitle: string;
  citizenUserId: string;
  citizenPhone?: string;
  isMP: boolean;
  onClose: () => void;
}

const ChatDrawer = ({ issueId, issueTitle, citizenUserId, citizenPhone, isMP, onClose }: ChatDrawerProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const user = session?.user ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadConversation = async () => {
      if (!user) return;
      setLoading(true);
      const { data: conv } = await supabase.from("chat_conversations").select("*").eq("issue_id", issueId).maybeSingle();
      if (conv) {
        setConversationId(conv.id);
        setIsClosed(conv.is_closed);
        const { data: msgs } = await supabase.from("chat_messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
        if (msgs) setMessages(msgs);
      }
      setLoading(false);
    };
    loadConversation();
  }, [issueId, user]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => { if (prev.some(m => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `id=eq.${conversationId}` }, (payload) => {
        setIsClosed((payload.new as any).is_closed);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const startConversation = async () => {
    if (!user || !isMP) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from("chat_conversations").insert({ issue_id: issueId, mp_user_id: user.id, citizen_user_id: citizenUserId }).select("id").single();
      if (error) throw error;
      setConversationId(data.id);
      setIsClosed(false);
      toast.success(t("chat.started"));
      await supabase.from("notifications").insert({ user_id: citizenUserId, title: t("chat.new_chat_notif"), message: t("chat.new_chat_body", { title: issueTitle }), issue_id: issueId });
      sendPushToUser(citizenUserId, t("chat.new_chat_notif"), t("chat.new_chat_body", { title: issueTitle }), { issue_id: issueId });
    } catch (err: any) {
      if (err.message?.includes("unique")) { toast.error(t("chat.exists")); } else { toast.error(t("chat.error_start")); }
    } finally { setSending(false); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !conversationId || !newMessage.trim() || isClosed) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({ conversation_id: conversationId, sender_id: user.id, message: newMessage.trim() });
      if (error) throw error;
      setNewMessage("");
    } catch { toast.error(t("chat.error_send")); } finally { setSending(false); }
  };

  const closeConversation = async () => {
    if (!conversationId || !isMP) return;
    const { error } = await supabase.from("chat_conversations").update({ is_closed: true, closed_at: new Date().toISOString() }).eq("id", conversationId);
    if (error) { toast.error(t("common.error")); } else { setIsClosed(true); toast.success(t("chat.closed_success")); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-lg h-[80vh] md:h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{issueTitle}</h3>
              <p className="text-[10px] text-muted-foreground">
                {isClosed ? `🔒 ${t("chat.closed")}` : conversationId ? t("chat.active") : t("chat.no_conversation")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isMP && citizenPhone && (
              <div className="flex items-center gap-1">
                {showPhone ? (
                  <a href={`tel:${citizenPhone}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">
                    <PhoneCall className="w-3.5 h-3.5" />{citizenPhone}
                  </a>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setShowPhone(true);
                  }} className="gap-1 text-xs h-8">
                    <Phone className="w-3.5 h-3.5" />{t("chat.show_phone")}
                  </Button>
                )}
              </div>
            )}
            {isMP && conversationId && !isClosed && (
              <Button variant="ghost" size="sm" onClick={closeConversation} className="gap-1 text-xs h-8 text-destructive hover:text-destructive">
                <Lock className="w-3.5 h-3.5" />{t("chat.close_chat")}
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
          ) : !conversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
              {isMP ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">{t("chat.no_chat_mp")}</p>
                  <Button onClick={startConversation} disabled={sending} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    {t("chat.start")}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("chat.no_chat_citizen")}</p>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">{t("chat.no_messages")}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-accent text-accent-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {conversationId && !isClosed && (
          <form onSubmit={sendMessage} className="p-3 border-t border-border bg-card shrink-0">
            <div className="flex gap-2">
              <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={t("chat.type_message")} className="text-right flex-1" disabled={sending} />
              <Button type="submit" size="sm" disabled={sending || !newMessage.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90 h-10 w-10 p-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        )}

        {conversationId && isClosed && (
          <div className="p-3 border-t border-border bg-muted/50 text-center shrink-0">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />{t("chat.closed")}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ChatDrawer;
