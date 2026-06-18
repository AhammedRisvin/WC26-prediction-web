import { playerLoginEmail, supabase } from './supabase';

export type PlayerProfile = {
  id: string;
  display_name: string;
  is_organizer: boolean;
  avatar_path: string | null;
  has_played: boolean;
};

export async function signInWithCode(name: string, code: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signInWithPassword({
    email: playerLoginEmail(name),
    password: code,
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function changePassword(password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.updateUser({ password });
}

export async function getMyProfile() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single();
  if (error) throw error;
  return data as PlayerProfile;
}

export async function getMatches() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_at');
  if (error) throw error;
  return data;
}

export async function getMyPredictions() {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];
  const { data, error } = await supabase
    .from('predictions')
    .select('id, match_id, home_score, away_score, advancing_team, submitted_at')
    .eq('player_id', authData.user.id)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPublishedPredictionResults() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('published_prediction_results')
    .select('*')
    .order('kickoff_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function savePrediction(
  matchId: string,
  homeScore: number,
  awayScore: number,
  advancingTeam?: string,
) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('submit_prediction', {
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_advancing_team: advancingTeam ?? null,
  });
  if (error) throw error;
  return data;
}

export async function addMatch(input: {
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  stage: string;
  knockout: boolean;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('organizer_add_match', {
    p_home_team: input.homeTeam,
    p_away_team: input.awayTeam,
    p_kickoff_at: input.kickoffAt,
    p_stage: input.stage,
    p_is_knockout: input.knockout,
  });
  if (error) throw error;
  return data;
}

export async function publishResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  advancingTeam?: string,
) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('organizer_publish_result', {
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_advancing_team: advancingTeam ?? null,
  });
  if (error) throw error;
  return data;
}
