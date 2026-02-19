-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded',
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create doc_chunks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and set up basic policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;

-- Allow anon key to insert/select users
CREATE POLICY "Allow anon to insert users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon to select users" ON public.users
  FOR SELECT USING (true);

-- Allow anon key to insert/select documents
CREATE POLICY "Allow anon to insert documents" ON public.documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon to select documents" ON public.documents
  FOR SELECT USING (true);

-- Allow anon key to insert/select doc_chunks
CREATE POLICY "Allow anon to insert doc_chunks" ON public.doc_chunks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon to select doc_chunks" ON public.doc_chunks
  FOR SELECT USING (true);
