drop view if exists public.published_prediction_results;
drop view if exists public.leaderboard;

create view public.leaderboard with (security_invoker = false) as
with settings as (
  select '2026-06-26 00:00:00+05:30'::timestamptz as bonus_starts_at
), league_state as (
  select count(*) filter (where status = 'completed')::integer as completed_matches
  from public.matches
), player_totals as (
  select
    p.id,
    p.display_name,
    p.avatar_path,
    p.has_played,
    count(pr.id)::integer as predictions_made,
    count(*) filter (
      where m.status = 'completed'
        and pr.home_score = m.home_score
        and pr.away_score = m.away_score
    )::integer as points,
    count(*) filter (
      where m.status = 'completed'
        and pr.id is not null
        and (pr.home_score <> m.home_score or pr.away_score <> m.away_score)
    )::integer as wrong,
    count(*) filter (
      where m.status = 'completed'
        and pr.id is not null
    )::integer as completed_predictions,
    count(pr.id) filter (
      where m.status = 'completed'
        and m.kickoff_at >= s.bonus_starts_at
    )::integer as eligible_completed_predictions
  from public.profiles p
  cross join settings s
  left join public.predictions pr on pr.player_id = p.id
  left join public.matches m on m.id = pr.match_id
  group by p.id, p.display_name, p.avatar_path, p.has_played
), raw_adjusted_totals as (
  select
    pt.id,
    pt.display_name,
    pt.avatar_path,
    pt.has_played,
    pt.predictions_made,
    pt.completed_predictions,
    pt.points
      + case when pt.display_name = 'Risvin' then floor(pt.eligible_completed_predictions / 4)::integer else 0 end as raw_points,
    pt.wrong
      - case when pt.display_name = 'Risvin' then floor(pt.eligible_completed_predictions / 4)::integer else 0 end as raw_wrong
  from player_totals pt
), capped_points as (
  select
    rat.id,
    rat.display_name,
    rat.avatar_path,
    rat.has_played,
    rat.predictions_made,
    rat.completed_predictions,
    least(greatest(rat.raw_points, 0), rat.predictions_made)::integer as points,
    greatest(rat.raw_wrong, 0)::integer as raw_wrong
  from raw_adjusted_totals rat
), capped_totals as (
  select
    cp.id,
    cp.display_name,
    cp.avatar_path,
    cp.has_played,
    cp.predictions_made,
    cp.completed_predictions,
    cp.points,
    least(cp.raw_wrong, greatest(cp.predictions_made - cp.points, 0))::integer as wrong
  from capped_points cp
)
select
  ct.id,
  ct.display_name,
  ct.avatar_path,
  ct.predictions_made,
  ct.points,
  ct.wrong,
  least(
    greatest(ls.completed_matches - ct.completed_predictions, 0),
    greatest(ls.completed_matches, 0)
  )::integer as missed,
  ls.completed_matches as elapsed_matches
from capped_totals ct
cross join league_state ls
where ls.completed_matches = 0 or ct.has_played;

create view public.published_prediction_results with (security_invoker = false) as
select
  m.id as match_id,
  m.home_team,
  m.away_team,
  m.kickoff_at,
  m.home_score as result_home_score,
  m.away_score as result_away_score,
  p.id as player_id,
  p.display_name,
  pr.home_score as predicted_home_score,
  pr.away_score as predicted_away_score,
  (pr.home_score = m.home_score and pr.away_score = m.away_score) as correct
from public.matches m
cross join public.profiles p
left join public.predictions pr on pr.match_id = m.id and pr.player_id = p.id
where m.status = 'completed'
  and p.has_played;

grant select on public.leaderboard to authenticated;
grant select on public.published_prediction_results to authenticated;
