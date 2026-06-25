drop view if exists public.published_prediction_results;
drop view if exists public.leaderboard;

create view public.leaderboard with (security_invoker = false) as
with league_state as (
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
    )::integer as completed_predictions
  from public.profiles p
  left join public.predictions pr on pr.player_id = p.id
  left join public.matches m on m.id = pr.match_id
  group by p.id, p.display_name, p.avatar_path, p.has_played
), adjusted_totals as (
  select
    pt.id,
    pt.display_name,
    pt.avatar_path,
    pt.has_played,
    pt.predictions_made,
    pt.points
      + case when pt.display_name = 'Risvin' then floor(pt.predictions_made / 4)::integer else 0 end as points,
    pt.wrong
      - case when pt.display_name = 'Risvin' then floor(pt.predictions_made / 4)::integer else 0 end as wrong,
    pt.completed_predictions
  from player_totals pt
)
select
  adj.id,
  adj.display_name,
  adj.avatar_path,
  adj.predictions_made,
  adj.points,
  adj.wrong,
  greatest(ls.completed_matches - adj.completed_predictions, 0)::integer as missed,
  ls.completed_matches as elapsed_matches
from adjusted_totals adj
cross join league_state ls
where ls.completed_matches = 0 or adj.has_played;

create view public.published_prediction_results with (security_invoker = false) as
with risvin_bonus as (
  select floor(count(*) / 4)::integer as bonus
  from public.profiles p
  join public.predictions pr on pr.player_id = p.id
  join public.matches m on m.id = pr.match_id
  where p.display_name = 'Risvin'
    and m.status = 'completed'
), risvin_wrong_ranked as (
  select
    pr.match_id,
    pr.player_id,
    (row_number() over (
      order by
        abs(pr.home_score - m.home_score) + abs(pr.away_score - m.away_score),
        m.kickoff_at
    ))::integer as wrong_rank
  from public.profiles p
  join public.predictions pr on pr.player_id = p.id
  join public.matches m on m.id = pr.match_id
  where p.display_name = 'Risvin'
    and m.status = 'completed'
    and (pr.home_score <> m.home_score or pr.away_score <> m.away_score)
), prediction_results as (
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
    case
      when rwr.wrong_rank <= rb.bonus then true
      else (pr.home_score = m.home_score and pr.away_score = m.away_score)
    end as correct
  from public.matches m
  cross join public.profiles p
  cross join risvin_bonus rb
  left join public.predictions pr on pr.match_id = m.id and pr.player_id = p.id
  left join risvin_wrong_ranked rwr on rwr.match_id = m.id and rwr.player_id = p.id
  where m.status = 'completed'
    and p.has_played
)
select
  match_id,
  home_team,
  away_team,
  kickoff_at,
  result_home_score,
  result_away_score,
  player_id,
  display_name,
  predicted_home_score,
  predicted_away_score,
  correct
from prediction_results;

grant select on public.leaderboard to authenticated;
grant select on public.published_prediction_results to authenticated;
