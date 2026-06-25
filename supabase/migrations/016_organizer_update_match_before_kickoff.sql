create or replace function public.organizer_update_match(
  p_match_id uuid,
  p_home_team text,
  p_away_team text,
  p_kickoff_at timestamptz,
  p_stage text,
  p_is_knockout boolean default false
) returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare v_match public.matches;
begin
  if not public.is_organizer() then raise exception 'Organizer access required'; end if;
  if p_kickoff_at <= now() then raise exception 'Kickoff must be in the future'; end if;
  if trim(p_home_team) = trim(p_away_team) then raise exception 'Choose two different teams'; end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'scheduled' then raise exception 'Completed matches cannot be edited'; end if;
  if now() >= v_match.kickoff_at then raise exception 'Match cannot be edited after kickoff'; end if;

  update public.matches
  set
    home_team = trim(p_home_team),
    away_team = trim(p_away_team),
    kickoff_at = p_kickoff_at,
    stage = trim(p_stage),
    is_knockout = p_is_knockout,
    updated_at = now()
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

revoke all on function public.organizer_update_match(uuid, text, text, timestamptz, text, boolean) from public;
grant execute on function public.organizer_update_match(uuid, text, text, timestamptz, text, boolean) to authenticated;
