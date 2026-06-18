create or replace function public.organizer_publish_result(
  p_match_id uuid,
  p_home_score smallint,
  p_away_score smallint,
  p_advancing_team text default null
) returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare v_match public.matches;
begin
  if not public.is_organizer() then
    raise exception 'Organizer access required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then raise exception 'Match not found'; end if;

  if now() < v_match.kickoff_at + interval '2 hours' then
    raise exception 'Result entry opens 2 hours after kickoff';
  end if;

  if p_home_score not between 0 and 20 or p_away_score not between 0 and 20 then
    raise exception 'Scores must be between 0 and 20';
  end if;

  if v_match.is_knockout and p_advancing_team not in (v_match.home_team, v_match.away_team) then
    raise exception 'Choose a valid advancing team';
  end if;

  update public.matches set
    status = 'completed',
    home_score = p_home_score,
    away_score = p_away_score,
    advancing_team = p_advancing_team,
    result_published_at = now(),
    updated_at = now()
  where id = p_match_id
  returning * into v_match;

  insert into public.result_audit(
    match_id, organizer_id, home_score, away_score, advancing_team
  ) values (
    p_match_id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team
  );

  return v_match;
end;
$$;

revoke all on function public.organizer_publish_result(uuid, smallint, smallint, text) from public;
grant execute on function public.organizer_publish_result(uuid, smallint, smallint, text) to authenticated;
