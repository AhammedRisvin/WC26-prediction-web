create or replace function public.submit_prediction(
  p_match_id uuid, p_home_score smallint, p_away_score smallint,
  p_advancing_team text default null
) returns public.predictions
language plpgsql security definer set search_path = ''
as $$
declare v_match public.matches; v_prediction public.predictions;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_home_score not between 0 and 20 or p_away_score not between 0 and 20 then
    raise exception 'Scores must be between 0 and 20';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'scheduled' then raise exception 'This match is already completed'; end if;
  if now() >= v_match.kickoff_at - interval '15 minutes' then
    raise exception 'Predictions are locked for this match';
  end if;
  if v_match.is_knockout and p_advancing_team not in (v_match.home_team, v_match.away_team) then
    raise exception 'Choose a valid advancing team';
  end if;
  if exists (select 1 from public.predictions where match_id = p_match_id and player_id = (select auth.uid())) then
    raise exception 'Prediction already submitted and cannot be edited';
  end if;
  insert into public.predictions(match_id, player_id, home_score, away_score, advancing_team)
  values (p_match_id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team)
  returning * into v_prediction;
  update public.profiles set has_played = true where id = (select auth.uid());
  insert into public.prediction_audit(prediction_id, player_id, home_score, away_score, advancing_team, action)
  values (v_prediction.id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team, 'submitted');
  return v_prediction;
end;
$$;

revoke all on function public.submit_prediction(uuid, smallint, smallint, text) from public;
grant execute on function public.submit_prediction(uuid, smallint, smallint, text) to authenticated;

drop view if exists public.leaderboard;
create view public.leaderboard with (security_invoker = false) as
with league_state as (
  select count(*) filter (where kickoff_at <= now())::integer as elapsed_matches from public.matches
), player_totals as (
  select p.id, p.display_name, p.avatar_path, p.has_played,
    count(pr.id)::integer as predictions_made,
    count(*) filter (where m.status='completed' and pr.home_score=m.home_score and pr.away_score=m.away_score)::integer as points,
    count(*) filter (where m.status='completed' and pr.id is not null and (pr.home_score<>m.home_score or pr.away_score<>m.away_score))::integer as wrong
  from public.profiles p
  left join public.predictions pr on pr.player_id=p.id
  left join public.matches m on m.id=pr.match_id
  group by p.id,p.display_name,p.avatar_path,p.has_played
)
select pt.id,pt.display_name,pt.avatar_path,pt.predictions_made,pt.points,pt.wrong,
  greatest(ls.elapsed_matches-pt.predictions_made,0)::integer as missed,ls.elapsed_matches
from player_totals pt cross join league_state ls
where ls.elapsed_matches=0 or pt.has_played;

drop view if exists public.published_prediction_results;
create view public.published_prediction_results with (security_invoker = false) as
select m.id match_id,m.home_team,m.away_team,m.kickoff_at,
  m.home_score result_home_score,m.away_score result_away_score,
  p.id player_id,p.display_name,pr.home_score predicted_home_score,
  pr.away_score predicted_away_score,
  (pr.home_score=m.home_score and pr.away_score=m.away_score) correct
from public.matches m cross join public.profiles p
left join public.predictions pr on pr.match_id=m.id and pr.player_id=p.id
where m.status='completed' and p.has_played;

grant select on public.leaderboard to authenticated;
grant select on public.published_prediction_results to authenticated;
