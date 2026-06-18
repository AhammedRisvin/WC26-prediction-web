drop policy if exists "players can update own avatar only" on public.profiles;

create policy "players update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke update on public.profiles from authenticated;
grant update (avatar_path) on public.profiles to authenticated;
