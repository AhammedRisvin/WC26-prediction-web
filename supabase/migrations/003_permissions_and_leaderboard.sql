-- RLS policies decide which rows are visible, but table privileges must also
-- permit authenticated users to perform the read.
grant select on public.profiles to authenticated;
grant select on public.matches to authenticated;
grant select on public.predictions to authenticated;
grant select on public.prediction_audit to authenticated;
grant select on public.result_audit to authenticated;

drop view if exists public.leaderboard;

create view public.leaderboard
with (security_invoker = true)
as
with league_state as (
  select
    count(*) filter (where kickoff_at <= now())::integer as elapsed_matches
  from public.matches
),
player_totals as (
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
    )::integer as wrong
  from public.profiles p
  left join public.predictions pr on pr.player_id = p.id
  left join public.matches m on m.id = pr.match_id
  group by p.id, p.display_name, p.avatar_path, p.has_played
)
select
  pt.id,
  pt.display_name,
  pt.avatar_path,
  pt.predictions_made,
  pt.points,
  pt.wrong,
  greatest(ls.elapsed_matches - pt.predictions_made, 0)::integer as missed,
  ls.elapsed_matches
from player_totals pt
cross join league_state ls
where ls.elapsed_matches = 0 or pt.has_played;

grant select on public.leaderboard to authenticated;
