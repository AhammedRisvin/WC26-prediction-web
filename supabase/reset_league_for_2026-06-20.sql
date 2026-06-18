-- ONE-TIME DESTRUCTIVE RESET
-- Run this in Supabase SQL Editor to start a fresh league on June 20, 2026.
--
-- Preserved:
--   auth.users, profiles, display names, organizer roles, passwords, avatars
--
-- Permanently deleted:
--   matches, predictions, prediction audit, result audit

begin;

delete from public.prediction_audit;
delete from public.result_audit;
delete from public.predictions;
delete from public.matches;

update public.profiles
set has_played = false;

-- Restart audit IDs for a genuinely clean season.
alter sequence if exists public.prediction_audit_id_seq restart with 1;
alter sequence if exists public.result_audit_id_seq restart with 1;

commit;

-- Verification: all four counts must be zero.
select
  (select count(*) from public.matches) as matches,
  (select count(*) from public.predictions) as predictions,
  (select count(*) from public.prediction_audit) as prediction_audit,
  (select count(*) from public.result_audit) as result_audit,
  (select count(*) from public.profiles where has_played) as active_players;
