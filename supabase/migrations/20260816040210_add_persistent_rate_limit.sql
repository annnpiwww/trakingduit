-- Persistent, atomic rate limiting for serverless API routes.
-- The table is intentionally inaccessible to client roles; only the definer
-- function may read or mutate buckets.
create table if not exists public.rate_limit_buckets (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  constraint rate_limit_buckets_key_length check (char_length(key) between 1 and 255),
  constraint rate_limit_buckets_count_nonnegative check (request_count >= 0)
);

revoke all on table public.rate_limit_buckets from anon, authenticated;
grant all on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.rate_limit_buckets%rowtype;
  v_reset_at timestamptz;
begin
  if p_key is null or char_length(p_key) = 0 or char_length(p_key) > 255 then
    raise exception 'invalid rate limit key';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'invalid rate limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid rate limit window';
  end if;

  insert into public.rate_limit_buckets (key, window_started_at, request_count)
  values (p_key, v_now, 1)
  on conflict (key) do update
  set
    window_started_at = case
      when public.rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
        then v_now
      else public.rate_limit_buckets.window_started_at
    end,
    request_count = case
      when public.rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
        then 1
      when public.rate_limit_buckets.request_count < p_limit
        then public.rate_limit_buckets.request_count + 1
      else public.rate_limit_buckets.request_count
    end
  returning * into v_row;

  v_reset_at := v_row.window_started_at + make_interval(secs => p_window_seconds);

  return query
  select
    v_row.request_count <= p_limit,
    greatest(0, p_limit - v_row.request_count),
    greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
