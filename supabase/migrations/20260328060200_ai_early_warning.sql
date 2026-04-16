-- AI Early Warning System (Strategic Enhancement 1)

-- 1. Table for AI-Detected Anomalies (Hotspots)
CREATE TABLE IF NOT EXISTS public.ai_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- e.g., 'electricity', 'water', 'roads'
    location_region TEXT NOT NULL, -- e.g., 'حي الأمل'
    issue_count INTEGER NOT NULL,
    growth_rate FLOAT, -- Percentage increase in complaints
    severity_score FLOAT, -- 0.0 to 1.0 (AI calculated)
    status TEXT DEFAULT 'pending_alert', -- 'pending_alert', 'alerted', 'resolved'
    ai_analysis_summary TEXT, -- AI's explanation of why this is an anomaly
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Table for AI Alerts sent to MPs and Executives
CREATE TABLE IF NOT EXISTS public.ai_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_id UUID REFERENCES public.ai_anomalies(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id), -- MP or Executive
    alert_type TEXT DEFAULT 'early_warning', -- 'early_warning', 'critical_escalation'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Function to detect anomalies (Simulated logic for the prototype)
-- In a production system, this would be triggered by a cron job or after every N issues
CREATE OR REPLACE FUNCTION public.detect_issue_anomalies()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- Logic: Find regions where complaints in a specific category increased by > 50% in the last 24h
    -- For the prototype, we'll aggregate recent issues and flag those with high density
    FOR r IN 
        SELECT 
            category, 
            location as region, 
            count(*) as c,
            now() as current_time
        FROM public.issues
        WHERE created_at > now() - interval '24 hours'
        GROUP BY category, location
        HAVING count(*) >= 3 -- Threshold for anomaly in this prototype
    LOOP
        INSERT INTO public.ai_anomalies (category, location_region, issue_count, severity_score, ai_analysis_summary)
        VALUES (
            r.category, 
            r.region, 
            r.c, 
            0.85, 
            'زيادة مفاجئة في شكاوى ' || r.category || ' في منطقة ' || r.region || '. تم رصد ' || r.c || ' شكاوى خلال الـ 24 ساعة الماضية.'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies
ALTER TABLE public.ai_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MPs can view anomalies in their region" ON public.ai_anomalies
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND (p.center = location_region OR p.governorate = location_region)
    ));

CREATE POLICY "Users can view their own alerts" ON public.ai_alerts
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());
