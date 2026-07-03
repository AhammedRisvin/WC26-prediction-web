create or replace function public.organizer_update_result(
  p_match_id uuid,
  p_home_score smallint,
  p_away_score smallint,
  p_advancing_team text default null
) returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare v_match public.matches;
begin
  if not public.is_organizer() then raise exception 'Organizer access required'; end if;
  if p_home_score not between 0 and 20 or p_away_score not between 0 and 20 then
    raise exception 'Scores must be between 0 and 20';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'completed' then raise exception 'Result has not been published yet'; end if;
  if v_match.is_knockout and p_advancing_team not in (v_match.home_team, v_match.away_team) then
    raise exception 'Pick the advancing team';
  end if;

  update public.matches
  set home_score = p_home_score,
      away_score = p_away_score,
      advancing_team = p_advancing_team,
      updated_at = now()
  where id = p_match_id
  returning * into v_match;

  insert into public.result_audit(match_id, organizer_id, home_score, away_score, advancing_team)
  values (p_match_id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team);

  return v_match;
end;
$$;

revoke all on function public.organizer_update_result(uuid, smallint, smallint, text) from public;
grant execute on function public.organizer_update_result(uuid, smallint, smallint, text) to authenticated;
