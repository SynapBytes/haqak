-- Advanced Features: SMS Tracking, Audit Logs, and Urgent Alerts

-- ============================================================================
-- 1. SMS Tracking Links Table
-- ============================================================================
CREATE TABLE public.sms_tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  full_url TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('citizen', 'mp', 'admin')),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  click_count INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.sms_tracking_links ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_sms_tracking_short_code ON public.sms_tracking_links(short_code);
CREATE INDEX idx_sms_tracking_issue_id ON public.sms_tracking_links(issue_id);
CREATE INDEX idx_sms_tracking_recipient ON public.sms_tracking_links(recipient_type, recipient_id);
CREATE INDEX idx_sms_tracking_created_at ON public.sms_tracking_links(created_at);

-- Policies
CREATE POLICY "Admins can view all tracking links" ON public.sms_tracking_links
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own tracking links" ON public.sms_tracking_links
  FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id OR 
         issue_id IN (SELECT id FROM public.issues WHERE user_id = auth.uid()) OR
         issue_id IN (SELECT id FROM public.issues WHERE assigned_mp_id = auth.uid()));

-- ============================================================================
-- 2. Urgent Issues Alerts Table
-- ============================================================================
CREATE TABLE public.urgent_issue_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL UNIQUE,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('critical', 'high', 'medium')) DEFAULT 'medium',
  urgency_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_mps UUID[] DEFAULT ARRAY[]::UUID[],
  notified_admins UUID[] DEFAULT ARRAY[]::UUID[],
  last_notification_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.urgent_issue_alerts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_urgent_alerts_urgency ON public.urgent_issue_alerts(urgency_level);
CREATE INDEX idx_urgent_alerts_detected_at ON public.urgent_issue_alerts(detected_at);
CREATE INDEX idx_urgent_alerts_resolved_at ON public.urgent_issue_alerts(resolved_at);

-- Policies
CREATE POLICY "Admins can view all urgent alerts" ON public.urgent_issue_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "MPs can view urgent alerts for their issues" ON public.urgent_issue_alerts
  FOR SELECT TO authenticated
  USING (issue_id IN (SELECT id FROM public.issues WHERE assigned_mp_id = auth.uid()) AND
         public.has_role(auth.uid(), 'mp'));

CREATE POLICY "Citizens can view urgent alerts for their issues" ON public.urgent_issue_alerts
  FOR SELECT TO authenticated
  USING (issue_id IN (SELECT id FROM public.issues WHERE user_id = auth.uid()));

-- ============================================================================
-- 3. Audit Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backfill columns when audit_logs already exists from older migrations
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);

-- Policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Issue Urgency Tracking
-- ============================================================================
-- Add urgency column to issues table if it doesn't exist
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS urgency_level TEXT CHECK (urgency_level IN ('critical', 'high', 'medium', 'low')) DEFAULT 'low';

ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS urgent_reason TEXT;

-- Create index for urgent issues
CREATE INDEX IF NOT EXISTS idx_issues_urgent ON public.issues(is_urgent, urgency_level);

-- ============================================================================
-- 5. SMS Notification History
-- ============================================================================
CREATE TABLE public.sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('issue_created', 'status_update', 'urgent_alert', 'resolution_notice')),
  twilio_sid TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'delivered')) DEFAULT 'queued',
  tracking_link_id UUID REFERENCES public.sms_tracking_links(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_sms_notifications_issue_id ON public.sms_notifications(issue_id);
CREATE INDEX idx_sms_notifications_status ON public.sms_notifications(status);
CREATE INDEX idx_sms_notifications_message_type ON public.sms_notifications(message_type);
CREATE INDEX idx_sms_notifications_created_at ON public.sms_notifications(created_at);

-- Policies
CREATE POLICY "Admins can view all SMS notifications" ON public.sms_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view SMS for their issues" ON public.sms_notifications
  FOR SELECT TO authenticated
  USING (issue_id IN (SELECT id FROM public.issues WHERE user_id = auth.uid() OR assigned_mp_id = auth.uid()));

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to generate short code for SMS tracking
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, (random() * 61 + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action, entity_type, entity_id, old_values, new_values, status, error_message
  ) VALUES (
    p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, p_status, p_error_message
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to detect urgent issues
CREATE OR REPLACE FUNCTION public.detect_urgent_issue(
  p_issue_id UUID,
  p_title TEXT,
  p_description TEXT
)
RETURNS TABLE(is_urgent BOOLEAN, urgency_level TEXT, keywords TEXT[]) AS $$
DECLARE
  urgent_keywords TEXT[] := ARRAY['قتل', 'اغتصاب', 'عنف', 'تهديد', 'حريق', 'غرق', 'حادث', 'كارثة', 'طوارئ', 'عاجل', 'حرج', 'خطر', 'جريمة'];
  critical_keywords TEXT[] := ARRAY['قتل', 'اغتصاب', 'عنف مسلح', 'كارثة', 'حريق'];
  high_keywords TEXT[] := ARRAY['عنف', 'تهديد', 'حادث', 'طوارئ'];
  keyword TEXT;
  combined_text TEXT;
  detected_keywords TEXT[];
  urgency TEXT;
  is_urg BOOLEAN;
BEGIN
  combined_text := LOWER(COALESCE(p_title, '') || ' ' || COALESCE(p_description, ''));
  
  -- Check for critical keywords
  detected_keywords := ARRAY[]::TEXT[];
  FOREACH keyword IN ARRAY urgent_keywords LOOP
    IF combined_text LIKE '%' || keyword || '%' THEN
      detected_keywords := array_append(detected_keywords, keyword);
    END IF;
  END LOOP;
  
  -- Determine urgency level
  IF detected_keywords && critical_keywords THEN
    urgency := 'critical';
    is_urg := true;
  ELSIF detected_keywords && high_keywords THEN
    urgency := 'high';
    is_urg := true;
  ELSIF array_length(detected_keywords, 1) > 0 THEN
    urgency := 'medium';
    is_urg := true;
  ELSE
    urgency := 'low';
    is_urg := false;
  END IF;
  
  RETURN QUERY SELECT is_urg, urgency, detected_keywords;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Triggers
-- ============================================================================

-- Trigger to update updated_at for new tables
CREATE TRIGGER update_sms_tracking_links_updated_at BEFORE UPDATE ON public.sms_tracking_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_urgent_issue_alerts_updated_at BEFORE UPDATE ON public.urgent_issue_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to log issue creation
CREATE OR REPLACE FUNCTION public.log_issue_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.user_id,
    'create',
    'issue',
    NEW.id,
    NULL,
    jsonb_build_object('title', NEW.title, 'category', NEW.category, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_issue_creation_trigger
AFTER INSERT ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.log_issue_creation();

-- Trigger to log issue updates
CREATE OR REPLACE FUNCTION public.log_issue_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_audit_event(
    COALESCE(auth.uid(), NEW.user_id),
    'update',
    'issue',
    NEW.id,
    jsonb_build_object('status', OLD.status, 'assigned_mp_id', OLD.assigned_mp_id),
    jsonb_build_object('status', NEW.status, 'assigned_mp_id', NEW.assigned_mp_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_issue_update_trigger
AFTER UPDATE ON public.issues
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_mp_id IS DISTINCT FROM NEW.assigned_mp_id)
EXECUTE FUNCTION public.log_issue_update();
