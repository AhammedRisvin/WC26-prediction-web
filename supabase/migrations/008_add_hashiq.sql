insert into public.profiles (id, display_name, is_organizer)
select id, 'Hashiq', false
from auth.users
where lower(email) = 'hashiq@endiless-kemmyoonity.local'
on conflict (id) do update set
  display_name = excluded.display_name,
  is_organizer = false;

do $$
begin
  if not exists (
    select 1 from public.profiles where display_name = 'Hashiq'
  ) then
    raise exception 'Hashiq Auth user was not found. Create hashiq@endiless-kemmyoonity.local first.';
  end if;
end;
$$;
