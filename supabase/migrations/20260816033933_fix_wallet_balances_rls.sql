-- Prevent the aggregate view from bypassing wallets/transactions RLS.
-- The explicit owner predicates are defense in depth for future policy changes.
create or replace view public.wallet_balances
with (security_invoker = true)
as
select
  w.id as wallet_id,
  w.user_id,
  w.name,
  w.initial_balance
    + coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type in ('expense', 'transfer') then t.amount else 0 end), 0)
    + coalesce(
        (
          select sum(incoming.amount)
          from public.transactions as incoming
          where incoming.to_wallet_id = w.id
            and incoming.type = 'transfer'
            and incoming.deleted = 0
            and incoming.user_id = (select auth.uid())
        ),
        0
      ) as balance
from public.wallets as w
left join public.transactions as t
  on t.wallet_id = w.id
  and t.deleted = 0
  and t.user_id = (select auth.uid())
where w.deleted = 0
  and w.user_id = (select auth.uid())
group by w.id, w.user_id, w.name, w.initial_balance;

revoke all on table public.wallet_balances from anon;
revoke all on table public.wallet_balances from authenticated;
grant select on table public.wallet_balances to authenticated;
grant all on table public.wallet_balances to service_role;
