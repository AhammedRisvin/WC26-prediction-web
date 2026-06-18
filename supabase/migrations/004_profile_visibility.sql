-- Before kickoff, everyone must be visible with zero statistics.
-- After the league begins, only players who have submitted at least once remain public.
drop policy if exists "authenticated players can see active profiles" on public.profiles;

create policy "players visible before league or after participation"
on public.profiles for select to authenticated
using (
  not exists (select 1 from public.matches where kickoff_at <= now())
  or has_played
  or id = (select auth.uid())
);
