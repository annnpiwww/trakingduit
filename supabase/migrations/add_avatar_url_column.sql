-- TrackingDuit — tambah kolom foto profil biar avatar ikut sync antar device
-- Paste di Supabase SQL Editor (project oeayigvhngzfimvbmyxg) lalu Run.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
NOTIFY pgrst, 'reload schema';
