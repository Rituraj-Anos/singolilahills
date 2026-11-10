-- ==============================================================================
-- Shingolia Hills — Himalayan Journeys & Stays
-- Initial Schema & Seed Migration (Supabase PostgreSQL)
-- ==============================================================================

-- 1. PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT,
    destination TEXT NOT NULL,
    region TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    duration_nights INTEGER NOT NULL,
    duration_label TEXT NOT NULL,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    currency TEXT DEFAULT '₹',
    difficulty TEXT,
    best_season TEXT,
    max_altitude TEXT,
    pickup_drop TEXT,
    badge TEXT,
    featured BOOLEAN DEFAULT false,
    rating NUMERIC(3,2) DEFAULT 4.9,
    reviews_count INTEGER DEFAULT 0,
    category TEXT NOT NULL,
    hero_image TEXT NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb,
    overview TEXT NOT NULL,
    highlights JSONB DEFAULT '[]'::jsonb,
    itinerary JSONB DEFAULT '[]'::jsonb,
    inclusions JSONB DEFAULT '[]'::jsonb,
    exclusions JSONB DEFAULT '[]'::jsonb,
    vehicle TEXT,
    permits_info TEXT,
    whatsapp_text TEXT,
    faqs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INQUIRIES / LEADS TABLE
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    package_interest TEXT,
    travel_dates TEXT,
    group_size TEXT,
    notes TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'converted', 'closed'
    source TEXT DEFAULT 'website',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    location TEXT,
    circuit TEXT,
    rating INTEGER DEFAULT 5,
    date TEXT,
    comment TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REELS TABLE
CREATE TABLE IF NOT EXISTS public.reels (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    reel_url TEXT NOT NULL,
    caption TEXT,
    thumbnail TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Public can read packages, reviews, reels
CREATE POLICY "Allow public read packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public read reels" ON public.reels FOR SELECT USING (true);

-- Public can insert inquiries
CREATE POLICY "Allow public insert inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);

-- Authenticated users (admin/agents) can manage all
CREATE POLICY "Allow admin all packages" ON public.packages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin all inquiries" ON public.inquiries FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin all reviews" ON public.reviews FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin all reels" ON public.reels FOR ALL TO authenticated USING (true);
