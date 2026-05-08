-- ============================================================
-- Noctual AI — Production Database Migration v2
-- ============================================================
-- Run this in Supabase SQL Editor to upgrade the schema.
-- All tables use RLS with owner-based policies.
-- ============================================================

-- ==========================================
-- 1. FLASHCARDS — Individual card storage
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    document_id UUID,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    chunk_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_owner ON public.flashcards(owner_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_document ON public.flashcards(document_id);

-- ==========================================
-- 2. FLASHCARD_REVIEWS — Spaced repetition (SM-2)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_at TIMESTAMPTZ,
    repetition_count INTEGER DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reviews_flashcard ON public.flashcard_reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_reviews_owner_due ON public.flashcard_reviews(owner_id, next_review_at);

-- ==========================================
-- 3. STUDY_SESSIONS — Session tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'flashcards',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    cards_reviewed INTEGER DEFAULT 0,
    questions_asked INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON public.study_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dates ON public.study_sessions(owner_id, started_at);

-- ==========================================
-- 4. USAGE_COUNTERS — Freemium tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    day TEXT NOT NULL,
    ai_requests INTEGER DEFAULT 0,
    UNIQUE(owner_id, day)
);

CREATE INDEX IF NOT EXISTS idx_usage_owner_day ON public.usage_counters(owner_id, day);

-- ==========================================
-- 5. STUDENT_QUESTIONS — Question logging
-- ==========================================
CREATE TABLE IF NOT EXISTS public.student_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    document_id UUID,
    question TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_owner ON public.student_questions(owner_id);

-- ==========================================
-- 6. SUBSCRIPTIONS — Billing
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE,
    plan TEXT DEFAULT 'free',
    active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON public.subscriptions(owner_id);

-- ==========================================
-- 7. FLASHCARD_SESSIONS — Generation logging
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flashcard_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    document_id UUID,
    cards_generated INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_owner ON public.flashcard_sessions(owner_id);

-- ==========================================
-- 8. DOCUMENTS — Ensure required columns
-- ==========================================
-- The documents table likely already exists. Add/alter only if needed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN owner_id UUID;
    END IF;
END $$;

-- ==========================================
-- 9. DOC_CHUNKS — Ensure required columns
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'doc_chunks' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.doc_chunks ADD COLUMN owner_id UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'doc_chunks' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE public.doc_chunks ADD COLUMN embedding vector(384);
    END IF;
END $$;

-- ==========================================
-- 10. RLS POLICIES
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;

-- Flashcard policies (owner-scoped)
DROP POLICY IF EXISTS "Users can manage their flashcards" ON public.flashcards;
CREATE POLICY "Users can manage their flashcards" ON public.flashcards
    FOR ALL USING (owner_id = auth.uid()::text);

-- Review policies
DROP POLICY IF EXISTS "Users can manage their reviews" ON public.flashcard_reviews;
CREATE POLICY "Users can manage their reviews" ON public.flashcard_reviews
    FOR ALL USING (owner_id = auth.uid()::text);

-- Session policies
DROP POLICY IF EXISTS "Users can manage their sessions" ON public.study_sessions;
CREATE POLICY "Users can manage their sessions" ON public.study_sessions
    FOR ALL USING (owner_id = auth.uid()::text);

-- Usage counter policies
DROP POLICY IF EXISTS "Users can read their usage" ON public.usage_counters;
CREATE POLICY "Users can read their usage" ON public.usage_counters
    FOR SELECT USING (owner_id = auth.uid()::text);

-- Student questions policies
DROP POLICY IF EXISTS "Users can manage their questions" ON public.student_questions;
CREATE POLICY "Users can manage their questions" ON public.student_questions
    FOR ALL USING (owner_id = auth.uid()::text);

-- Subscription policies
DROP POLICY IF EXISTS "Users can read their subscription" ON public.subscriptions;
CREATE POLICY "Users can read their subscription" ON public.subscriptions
    FOR SELECT USING (owner_id = auth.uid()::text);

-- Flashcard sessions policies
DROP POLICY IF EXISTS "Users can manage their flashcard sessions" ON public.flashcard_sessions;
CREATE POLICY "Users can manage their flashcard sessions" ON public.flashcard_sessions
    FOR ALL USING (owner_id = auth.uid()::text);

-- ==========================================
-- 11. pgvector FUNCTION — match_doc_chunks
-- ==========================================
-- Ensure the vector similarity search function exists
CREATE OR REPLACE FUNCTION public.match_doc_chunks(
    p_owner_id TEXT,
    p_document_id UUID,
    p_match_count INTEGER,
    p_query_embedding vector(384)
)
RETURNS TABLE (
    id UUID,
    owner_id TEXT,
    document_id UUID,
    chunk_index INTEGER,
    chunk_text TEXT,
    similarity REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.owner_id,
        dc.document_id,
        dc.chunk_index,
        dc.chunk_text,
        (1 - (dc.embedding <=> p_query_embedding))::REAL AS similarity
    FROM doc_chunks dc
    WHERE dc.owner_id = p_owner_id
      AND dc.document_id = p_document_id
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- ==========================================
-- 12. ANALYTICS FUNCTION — weekly activity
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_weekly_activity(p_owner_id TEXT)
RETURNS TABLE (
    activity_date DATE,
    questions_count BIGINT,
    flashcards_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        d::DATE AS activity_date,
        COALESCE(q.cnt, 0) AS questions_count,
        COALESCE(f.cnt, 0) AS flashcards_count
    FROM generate_series(
        CURRENT_DATE - INTERVAL '13 days',
        CURRENT_DATE,
        '1 day'::INTERVAL
    ) d
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM student_questions sq
        WHERE sq.owner_id = p_owner_id
          AND sq.created_at::DATE = d::DATE
    ) q ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM flashcard_reviews fr
        WHERE fr.owner_id = p_owner_id
          AND fr.reviewed_at::DATE = d::DATE
    ) f ON true
    ORDER BY d::DATE;
$$;
