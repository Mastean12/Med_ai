-- ============================================================
-- Noctual AI — Learning Systems Migration v4
-- ============================================================
-- Creates tables for AI tutoring, exams, adaptive learning.
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. CHAT_SESSIONS — AI tutoring conversation sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Session',
    mode TEXT NOT NULL DEFAULT 'beginner',
    model TEXT DEFAULT 'deepseek-chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);

-- 2. CHAT_MESSAGES — individual messages in tutoring sessions
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

-- 3. EXAM_ATTEMPTS — quiz/exam attempts
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_id UUID,
    exam_type TEXT NOT NULL DEFAULT 'mcq',
    total_questions INTEGER NOT NULL DEFAULT 10,
    correct_answers INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_limit_seconds INTEGER,
    metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id);

-- 4. QUIZ_QUESTIONS — generated exam questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic TEXT
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_attempt ON public.quiz_questions(attempt_id);

-- 5. QUIZ_ANSWERS — student answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    selected_answer TEXT,
    is_correct BOOLEAN,
    time_taken_seconds REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON public.quiz_answers(attempt_id);

-- 6. LEARNING_PROFILES — user learning profile
CREATE TABLE IF NOT EXISTS public.learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    learning_style TEXT,
    strengths JSONB DEFAULT '[]',
    weaknesses JSONB DEFAULT '[]',
    study_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_learning_profiles_user ON public.learning_profiles(user_id);

-- 7. TOPIC_MASTERY — topic-level mastery tracking
CREATE TABLE IF NOT EXISTS public.topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic TEXT NOT NULL,
    mastery_score REAL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic)
);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON public.topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_due ON public.topic_mastery(user_id, next_review);

-- 8. RECOMMENDATIONS — AI-generated study recommendations
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    recommendation TEXT NOT NULL,
    reason TEXT,
    category TEXT,
    priority INTEGER DEFAULT 0,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMestAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations(user_id);

-- 9. RLS Policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policies for all tables
DROP POLICY IF EXISTS "Users manage own chat_sessions" ON public.chat_sessions;
CREATE POLICY "Users manage own chat_sessions" ON public.chat_sessions
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own chat_messages" ON public.chat_messages;
CREATE POLICY "Users manage own chat_messages" ON public.chat_messages
    FOR ALL USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own exam_attempts" ON public.exam_attempts;
CREATE POLICY "Users manage own exam_attempts" ON public.exam_attempts
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own quiz_questions" ON public.quiz_questions;
CREATE POLICY "Users manage own quiz_questions" ON public.quiz_questions
    FOR ALL USING (attempt_id IN (SELECT id FROM public.exam_attempts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own quiz_answers" ON public.quiz_answers;
CREATE POLICY "Users manage own quiz_answers" ON public.quiz_answers
    FOR ALL USING (attempt_id IN (SELECT id FROM public.exam_attempts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own learning_profile" ON public.learning_profiles;
CREATE POLICY "Users manage own learning_profile" ON public.learning_profiles
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own topic_mastery" ON public.topic_mastery;
CREATE POLICY "Users manage own topic_mastery" ON public.topic_mastery
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own recommendations" ON public.recommendations;
CREATE POLICY "Users manage own recommendations" ON public.recommendations
    FOR ALL USING (user_id = auth.uid());


-- ============================================================
-- 10. FLASHCARDS — saved flashcard collection
-- ============================================================
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

-- 11. FLASHCARD_REVIEWS — spaced repetition tracking
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
CREATE INDEX IF NOT EXISTS idx_reviews_owner ON public.flashcard_reviews(owner_id);

-- 12. STUDY_SESSIONS — session tracking
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

-- 13. FLASHCARD_SESSIONS — generation logging
CREATE TABLE IF NOT EXISTS public.flashcard_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    document_id UUID,
    cards_generated INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_owner ON public.flashcard_sessions(owner_id);

-- 14. STUDENT_QUESTIONS — question logging
CREATE TABLE IF NOT EXISTS public.student_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    document_id UUID,
    question TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON public.student_questions(owner_id);

-- RLS for new tables
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own flashcards" ON public.flashcards;
CREATE POLICY "Users manage own flashcards" ON public.flashcards
    FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own reviews" ON public.flashcard_reviews;
CREATE POLICY "Users manage own reviews" ON public.flashcard_reviews
    FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own sessions" ON public.study_sessions;
CREATE POLICY "Users manage own sessions" ON public.study_sessions
    FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own flashcard_sessions" ON public.flashcard_sessions;
CREATE POLICY "Users manage own flashcard_sessions" ON public.flashcard_sessions
    FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own questions" ON public.student_questions;
CREATE POLICY "Users manage own questions" ON public.student_questions
    FOR ALL USING (owner_id = auth.uid());
