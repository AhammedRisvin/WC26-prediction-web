insert into public.profiles (id, display_name, is_organizer)
select
  id,
  case lower(email)
    when 'risvin@endiless-kemmyoonity.local' then 'Risvin'
    when 'hashil@endiless-kemmyoonity.local' then 'Hashil'
    when 'shanan@endiless-kemmyoonity.local' then 'Shanan'
    when 'rashad@endiless-kemmyoonity.local' then 'Rashad'
    when 'shahid@endiless-kemmyoonity.local' then 'Shahid'
    when 'shahinsha@endiless-kemmyoonity.local' then 'Shahinsha'
    when 'anil@endiless-kemmyoonity.local' then 'Anil'
    when 'anas@endiless-kemmyoonity.local' then 'Anas'
    when 'sreerag@endiless-kemmyoonity.local' then 'Sreerag'
  end,
  lower(email) = 'hashil@endiless-kemmyoonity.local'
from auth.users
where lower(email) in (
  'risvin@endiless-kemmyoonity.local',
  'hashil@endiless-kemmyoonity.local',
  'shanan@endiless-kemmyoonity.local',
  'rashad@endiless-kemmyoonity.local',
  'shahid@endiless-kemmyoonity.local',
  'shahinsha@endiless-kemmyoonity.local',
  'anil@endiless-kemmyoonity.local',
  'anas@endiless-kemmyoonity.local',
  'sreerag@endiless-kemmyoonity.local'
)
on conflict (id) do update set
  display_name = excluded.display_name,
  is_organizer = excluded.is_organizer;

do $$
begin
  if (select count(*) from public.profiles) <> 9 then
    raise exception 'Expected 9 profiles. Check that all Auth user emails match exactly.';
  end if;
end;
$$;
