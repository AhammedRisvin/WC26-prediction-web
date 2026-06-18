create extension if not exists pgcrypto;

create type public.match_status as enum ('scheduled', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique,
  is_organizer boolean not null default false,
  avatar_path text,
  has_played boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  stage text not null,
  is_knockout boolean not null default false,
  kickoff_at timestamptz not null,
  status public.match_status not null default 'scheduled',
  home_score smallint check (home_score between 0 and 20),
  away_score smallint check (away_score between 0 and 20),
  advancing_team text,
  result_published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team <> away_team),
  check (
    (status = 'scheduled' and home_score is null and away_score is null)
    or
    (status = 'completed' and home_score is not null and away_score is not null)
  )
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  player_id uuid not null references public.profiles(id),
  home_score smallint not null check (home_score between 0 and 20),
  away_score smallint not null check (away_score between 0 and 20),
  advancing_team text,
  edit_count smallint not null default 0 check (edit_count between 0 and 3),
  submitted_at timestamptz not null default now(),
  last_edited_at timestamptz,
  unique (match_id, player_id)
);

create table public.prediction_audit (
  id bigint generated always as identity primary key,
  prediction_id uuid not null references public.predictions(id),
  player_id uuid not null references public.profiles(id),
  home_score smallint not null,
  away_score smallint not null,
  advancing_team text,
  action text not null check (action in ('submitted', 'edited')),
  occurred_at timestamptz not null default now()
);

create table public.result_audit (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id),
  organizer_id uuid not null references public.profiles(id),
  home_score smallint not null,
  away_score smallint not null,
  advancing_team text,
  occurred_at timestamptz not null default now()
);

create index predictions_player_idx on public.predictions(player_id);
create index predictions_match_idx on public.predictions(match_id);
create index matches_kickoff_idx on public.matches(kickoff_at);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_audit enable row level security;
alter table public.result_audit enable row level security;

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_organizer
  );
$$;

create policy "authenticated players can see active profiles"
on public.profiles for select to authenticated
using (has_played or id = (select auth.uid()));

create policy "players can update own avatar only"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and display_name = (select display_name from public.profiles where id = (select auth.uid()))
  and is_organizer = (select is_organizer from public.profiles where id = (select auth.uid()))
);

create policy "authenticated players can read matches"
on public.matches for select to authenticated using (true);

create policy "owner before kickoff, everyone after kickoff"
on public.predictions for select to authenticated
using (
  player_id = (select auth.uid())
  or exists (
    select 1 from public.matches m
    where m.id = match_id and now() >= m.kickoff_at
  )
);

create policy "players can see own prediction audit"
on public.prediction_audit for select to authenticated
using (player_id = (select auth.uid()));

create policy "authenticated can see result audit"
on public.result_audit for select to authenticated
using (true);

create or replace function public.submit_prediction(
  p_match_id uuid,
  p_home_score smallint,
  p_away_score smallint,
  p_advancing_team text default null
) returns public.predictions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_prediction public.predictions;
  v_action text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_home_score not between 0 and 20 or p_away_score not between 0 and 20 then
    raise exception 'Scores must be between 0 and 20';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'scheduled' then raise exception 'Match is completed'; end if;
  if now() >= v_match.kickoff_at - interval '15 minutes' then
    raise exception 'Predictions are locked';
  end if;
  if v_match.is_knockout and p_advancing_team not in (v_match.home_team, v_match.away_team) then
    raise exception 'Choose a valid advancing team';
  end if;

  select * into v_prediction
  from public.predictions
  where match_id = p_match_id and player_id = (select auth.uid())
  for update;

  if found then
    if v_prediction.edit_count >= 3 then raise exception 'Edit limit reached'; end if;
    update public.predictions set
      home_score = p_home_score,
      away_score = p_away_score,
      advancing_team = p_advancing_team,
      edit_count = edit_count + 1,
      last_edited_at = now()
    where id = v_prediction.id returning * into v_prediction;
    v_action := 'edited';
  else
    insert into public.predictions(match_id, player_id, home_score, away_score, advancing_team)
    values (p_match_id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team)
    returning * into v_prediction;
    update public.profiles set has_played = true where id = (select auth.uid());
    v_action := 'submitted';
  end if;

  insert into public.prediction_audit(
    prediction_id, player_id, home_score, away_score, advancing_team, action
  ) values (
    v_prediction.id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team, v_action
  );
  return v_prediction;
end;
$$;

create or replace function public.organizer_add_match(
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
  insert into public.matches(home_team, away_team, kickoff_at, stage, is_knockout, created_by)
  values (trim(p_home_team), trim(p_away_team), p_kickoff_at, trim(p_stage), p_is_knockout, (select auth.uid()))
  returning * into v_match;
  return v_match;
end;
$$;

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
  if not public.is_organizer() then raise exception 'Organizer access required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if now() < v_match.kickoff_at then raise exception 'Cannot publish before kickoff'; end if;
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
  where id = p_match_id returning * into v_match;

  insert into public.result_audit(match_id, organizer_id, home_score, away_score, advancing_team)
  values (p_match_id, (select auth.uid()), p_home_score, p_away_score, p_advancing_team);
  return v_match;
end;
$$;

revoke all on function public.submit_prediction(uuid, smallint, smallint, text) from public;
revoke all on function public.organizer_add_match(text, text, timestamptz, text, boolean) from public;
revoke all on function public.organizer_publish_result(uuid, smallint, smallint, text) from public;
grant execute on function public.submit_prediction(uuid, smallint, smallint, text) to authenticated;
grant execute on function public.organizer_add_match(text, text, timestamptz, text, boolean) to authenticated;
grant execute on function public.organizer_publish_result(uuid, smallint, smallint, text) to authenticated;

create view public.leaderboard with (security_invoker = true) as
select
  p.id,
  p.display_name,
  p.avatar_path,
  count(pr.id) as predictions_made,
  count(*) filter (
    where m.status = 'completed'
      and pr.home_score = m.home_score
      and pr.away_score = m.away_score
  ) as points,
  count(*) filter (
    where m.status = 'completed'
      and (pr.home_score <> m.home_score or pr.away_score <> m.away_score)
  ) as wrong
from public.profiles p
left join public.predictions pr on pr.player_id = p.id
left join public.matches m on m.id = pr.match_id
where p.has_played
group by p.id, p.display_name, p.avatar_path;

create view public.published_prediction_results with (security_invoker = true) as
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
  (
    pr.home_score = m.home_score and pr.away_score = m.away_score
  ) as correct
from public.matches m
cross join public.profiles p
left join public.predictions pr on pr.match_id = m.id and pr.player_id = p.id
where m.status = 'completed' and p.has_played;

grant select on public.leaderboard to authenticated;
grant select on public.published_prediction_results to authenticated;
