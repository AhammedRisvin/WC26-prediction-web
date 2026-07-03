create or replace function public.submit_prediction(
  p_match_id uuid,
  p_home_score smallint,
  p_away_score smallint,
  p_advancing_team text default null
) returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_prediction public.predictions;
  v_profile public.profiles;
  v_action text := 'submitted';
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_home_score not between 0 and 20 or p_away_score not between 0 and 20 then
    raise exception 'Scores must be between 0 and 20';
  end if;

  select * into v_profile from public.profiles where id = (select auth.uid());
  if not found then raise exception 'Profile not found'; end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'scheduled' then raise exception 'This match is already completed'; end if;
  if now() >= v_match.kickoff_at - interval '15 minutes' then
    raise exception 'Predictions are locked for this match';
  end if;
  if v_match.is_knockout and p_advancing_team not in (v_match.home_team, v_match.away_team) then
    raise exception 'Choose a valid advancing team';
  end if;

  select * into v_prediction
  from public.predictions
  where match_id = p_match_id and player_id = (select auth.uid())
  for update;

  if found then
    if v_profile.display_name <> 'Risvin' then
      raise exception 'Prediction already submitted and cannot be edited';
    end if;

    v_action := 'edited';
    update public.predictions
    set home_score = p_home_score,
        away_score = p_away_score,
        advancing_team = p_advancing_team,
        edit_count = edit_count + 1,
        updated_at = now()
    where id = v_prediction.id
    returning * into v_prediction;
  else
    insert into public.predictions(match_id, player_id, home_score, away_score, advancing_team)
    values (p_match_id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team)
    returning * into v_prediction;
  end if;

  update public.profiles set has_played = true where id = (select auth.uid());
  insert into public.prediction_audit(prediction_id, player_id, home_score, away_score, advancing_team, action)
  values (v_prediction.id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team, v_action);

  return v_prediction;
end;
$$;

revoke all on function public.submit_prediction(uuid, smallint, smallint, text) from public;
grant execute on function public.submit_prediction(uuid, smallint, smallint, text) to authenticated;
