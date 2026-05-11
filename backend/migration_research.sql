-- Research logs for tracking deep research sessions
CREATE TABLE IF NOT EXISTS public.research_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic TEXT NOT NULL,
    sources_found INTEGER DEFAULT 0,
    depth TEXT DEFAULT 'standard',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_logs_user ON public.research_logs(user_id);

ALTER TABLE public.research_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own research logs" ON public.research_logs;
CREATE POLICY "Users manage own research logs" ON public.research_logs
    FOR ALL USING (user_id = auth.uid()::text);
