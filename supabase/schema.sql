-- TrackingDuit — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Every table is owned per-user and protected by row level security; the client
-- only ever sees its own rows, so the anon key is safe to ship.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helper types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tx_type') then
    create type tx_type as enum ('income', 'expense', 'transfer');
  end if;
  if not exists (select 1 from pg_type where typname = 'wallet_type') then
    create type wallet_type as enum ('cash', 'bank', 'ewallet', 'credit', 'investment');
  end if;
  if not exists (select 1 from pg_type where typname = 'cat_type') then
    create type cat_type as enum ('income', 'expense');
  end if;
  if not exists (select 1 from pg_type where typname = 'tx_source') then
    create type tx_source as enum ('manual', 'ocr', 'import', 'sheet');
  end if;
end $$;

-- -------------------------------------------------------------------- profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Pengguna',
  email text,
  avatar_color text not null default '#0f9d76',
  avatar_url text,
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type wallet_type not null default 'cash',
  initial_balance numeric(16, 2) not null default 0,
  currency text not null default 'IDR',
  color text not null default '#0f9d76',
  icon text not null default 'wallet',
  note text,
  archived smallint not null default 0,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ------------------------------------------------------------------ categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type cat_type not null default 'expense',
  icon text not null default 'ellipsis',
  color text not null default '#94a3b8',
  is_default smallint not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ---------------------------------------------------------------- transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type tx_type not null,
  amount numeric(16, 2) not null check (amount > 0),
  wallet_id uuid not null references wallets on delete cascade,
  to_wallet_id uuid references wallets on delete set null,
  category_id uuid references categories on delete set null,
  date date not null,
  note text,
  merchant text,
  tags text[] not null default '{}',
  receipt_id uuid,
  source tx_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0,
  constraint transfer_needs_target check (type <> 'transfer' or to_wallet_id is not null),
  constraint transfer_distinct_wallets check (to_wallet_id is null or to_wallet_id <> wallet_id)
);

create index if not exists transactions_user_date_idx on transactions (user_id, date desc);
create index if not exists transactions_wallet_idx on transactions (wallet_id);
create index if not exists transactions_to_wallet_idx on transactions (to_wallet_id) where to_wallet_id is not null;
create index if not exists transactions_updated_idx on transactions (user_id, updated_at);

-- --------------------------------------------------------------------- budgets
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid not null references categories on delete cascade,
  amount numeric(16, 2) not null check (amount > 0),
  period text not null default 'monthly' check (period in ('monthly', 'weekly')),
  start_date date not null,
  rollover smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ---------------------------------------------------------------- saving goals
create table if not exists saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  target_amount numeric(16, 2) not null check (target_amount > 0),
  saved_amount numeric(16, 2) not null default 0,
  deadline date,
  wallet_id uuid references wallets on delete set null,
  color text not null default '#0f9d76',
  icon text not null default 'target',
  archived smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ----------------------------------------------------------------------- bills
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  amount numeric(16, 2) not null check (amount > 0),
  due_date date not null,
  repeat text not null default 'monthly' check (repeat in ('none', 'weekly', 'monthly', 'yearly')),
  category_id uuid references categories on delete set null,
  wallet_id uuid references wallets on delete set null,
  reminder_days integer not null default 3,
  last_paid_at timestamptz,
  auto_create_tx smallint not null default 1,
  archived smallint not null default 0,
  is_installment smallint not null default 0,
  installment_total integer,
  installment_paid integer,
  installment_amount_per_period numeric(16, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ---------------------------------------------------------------- ocr receipts
create table if not exists ocr_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  image_path text,
  raw_text text not null default '',
  parsed jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  engine text not null default 'tesseract',
  transaction_id uuid references transactions on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- -------------------------------------------------------------------- salaries
create table if not exists salaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  month text not null,
  amount numeric(16, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- --------------------------------------------------------------- notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('bill', 'budget', 'goal', 'sync', 'info')),
  read smallint not null default 0,
  ref_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted smallint not null default 0
);

-- ------------------------------------------------------------------- sync logs
create table if not exists sync_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  target text not null check (target in ('supabase', 'google-sheet')),
  direction text not null check (direction in ('push', 'pull', 'two-way')),
  status text not null check (status in ('success', 'error', 'partial')),
  pushed integer not null default 0,
  pulled integer not null default 0,
  message text not null default '',
  at timestamptz not null default now()
);

-- ------------------------------------------------------------------ audit_logs
create table if not exists audit_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  table_name text not null,
  row_id text not null,
  action text not null,
  at timestamptz not null default now()
);

-- --------------------------------------------------------- updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'wallets', 'categories', 'transactions',
    'budgets', 'saving_goals', 'bills', 'ocr_receipts', 'notifications', 'salaries'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on %I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------- row level security
-- Every table: a user may only touch rows where user_id = auth.uid().
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table saving_goals enable row level security;
alter table bills enable row level security;
alter table ocr_receipts enable row level security;
alter table salaries enable row level security;
alter table notifications enable row level security;
alter table sync_logs enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'wallets', 'categories', 'transactions', 'budgets', 'saving_goals',
    'bills', 'ocr_receipts', 'notifications', 'sync_logs', 'audit_logs', 'salaries'
  ]
  loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all
       using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ------------------------------------------------------------ profile bootstrap
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name, email)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Pengguna'), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- --------------------------------------------------------------- balance view
-- initial_balance + income − expense + transfers in − transfers out
create or replace view wallet_balances as
select
  w.id as wallet_id,
  w.user_id,
  w.name,
  w.initial_balance
    + coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type in ('expense', 'transfer') then t.amount else 0 end), 0)
    + coalesce(
        (select sum(amount) from transactions
         where to_wallet_id = w.id and type = 'transfer' and deleted = 0), 0)
    as balance
from wallets w
left join transactions t on t.wallet_id = w.id and t.deleted = 0
where w.deleted = 0
group by w.id, w.user_id, w.name, w.initial_balance;

-- ------------------------------------------------------------- receipt storage
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "own receipt files" on storage.objects;
create policy "own receipt files" on storage.objects
  for all
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
