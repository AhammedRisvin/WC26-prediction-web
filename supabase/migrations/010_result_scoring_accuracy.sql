-- Only completed matches affect points, wrong calls, and missed matches.
-- A final result can be published once.

create or replace function public.organizer_publish_result(
  p_match_id uuid, p_home_score smallint, p_away_score smallint,
  p_advancing_team text default null
) returns public.matches
language plpgsql security definer set search_path = ''
as $$
declare v_match public.matches;
begin
  if not public.is_organizer() then raise exception 'Organizer access required'; end if;
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status='completed' then raise exception 'Result has already been published'; end if;
  if now() < v_match.kickoff_at + interval '2 hours' then
    raise exception 'Result entry opens 2 hours after kickoff';
  end if;
  if p_home_score not between 0 and 20 or p_away_score not between 0 and 20 then
    raise exception 'Scores must be between 0 and 20';
  end if;
  if v_match.is_knockout and p_advancing_team not in (v_match.home_team,v_match.away_team) then
    raise exception 'Choose a valid advancing team';
  end if;
  update public.matches set status='completed',home_score=p_home_score,away_score=p_away_score,
    advancing_team=p_advancing_team,result_published_at=now(),updated_at=now()
  where id=p_match_id returning * into v_match;
  insert into public.result_audit(match_id,organizer_id,home_score,away_score,advancing_team)
  values(p_match_id,(select auth.uid()),p_home_score,p_away_score,p_advancing_team);
  return v_match;
end;
$$;

revoke all on function public.organizer_publish_result(uuid,smallint,smallint,text) from public;
grant execute on function public.organizer_publish_result(uuid,smallint,smallint,text) to authenticated;

drop view if exists public.leaderboard;
create view public.leaderboard with (security_invoker=false) as
with league_state as (
  select count(*) filter(where status='completed')::integer completed_matches from public.matches
), player_totals as (
  select p.id,p.display_name,p.avatar_path,p.has_played,count(pr.id)::integer predictions_made,
    count(*) filter(where m.status='completed' and pr.home_score=m.home_score and pr.away_score=m.away_score)::integer points,
    count(*) filter(where m.status='completed' and pr.id is not null and
      (pr.home_score<>m.home_score or pr.away_score<>m.away_score))::integer wrong,
    count(*) filter(where m.status='completed' and pr.id is not null)::integer completed_predictions
  from public.profiles p
  left join public.predictions pr on pr.player_id=p.id
  left join public.matches m on m.id=pr.match_id
  group by p.id,p.display_name,p.avatar_path,p.has_played
)
select pt.id,pt.display_name,pt.avatar_path,pt.predictions_made,pt.points,pt.wrong,
  greatest(ls.completed_matches-pt.completed_predictions,0)::integer missed,
  ls.completed_matches elapsed_matches
from player_totals pt cross join league_state ls
where ls.completed_matches=0 or pt.has_played;

grant select on public.leaderboard to authenticated;
