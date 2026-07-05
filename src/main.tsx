import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  Home,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import "./pro.css";
import "./card-fix.css";
import "./identity.css";
import "./auth.css";
import "./live.css";
import { supabase } from "./lib/supabase";
import {
  addMatch,
  changePassword,
  editMatch,
  getMatches,
  getMyPredictions,
  getMyProfile,
  getPublishedPredictionResults,
  publishResult,
  savePrediction,
  signInWithCode,
  signOut,
  updateResult,
  type PlayerProfile,
} from "./lib/api";

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  stage: string;
  is_knockout: boolean;
  kickoff_at: string;
  status: "scheduled" | "completed";
  home_score: number | null;
  away_score: number | null;
};
type BoardRow = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  predictions_made: number;
  points: number;
  wrong: number;
  missed: number;
  elapsed_matches: number;
};
type Prediction = {
  id: string;
  match_id: string;
  home_score: number;
  away_score: number;
};
type PublishedResult = {
  match_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  result_home_score: number;
  result_away_score: number;
  player_id: string;
  display_name: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  correct: boolean | null;
};
const people = [
  "Risvin",
  "Hashil",
  "Hashiq",
  "Shanan",
  "Rashad",
  "Shahid",
  "Shahinsha",
  "Anil",
  "Anas",
  "Sreerag",
];
const countries = [
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Bosnia and Herzegovina",
  "Brazil",
  "Canada",
  "Cape Verde",
  "Colombia",
  "Croatia",
  "Curaçao",
  "Czechia",
  "DR Congo",
  "Ecuador",
  "Egypt",
  "England",
  "France",
  "Germany",
  "Ghana",
  "Haiti",
  "Iran",
  "Iraq",
  "Ivory Coast",
  "Japan",
  "Jordan",
  "Mexico",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Panama",
  "Paraguay",
  "Portugal",
  "Qatar",
  "Saudi Arabia",
  "Scotland",
  "Senegal",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Tunisia",
  "Türkiye",
  "Uruguay",
  "USA",
  "Uzbekistan",
];
const roundOf16Teams = [
  "Argentina",
  "Belgium",
  "Brazil",
  "Canada",
  "Colombia",
  "Egypt",
  "England",
  "France",
  "Mexico",
  "Morocco",
  "Norway",
  "Paraguay",
  "Portugal",
  "Spain",
  "Switzerland",
  "United States",
];
const flag: Record<string, string> = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia and Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  "Cabo Verde": "cv",
  Colombia: "co",
  Croatia: "hr",
  Curaçao: "cw",
  Czechia: "cz",
  "DR Congo": "cd",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  "Côte d'Ivoire": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Türkiye: "tr",
  Uruguay: "uy",
  USA: "us",
  "United States": "us",
  Uzbekistan: "uz",
};
const Flag = ({ team }: { team: string }) =>
  flag[team] ? (
    <span className="dialog-flag">
      <img src={`https://flagcdn.com/w160/${flag[team]}.png`} alt="" />
    </span>
  ) : (
    <span className="team-fallback">{team.slice(0, 2).toUpperCase()}</span>
  );
const stageClass = (stage: string) => {
  const normalized = stage.trim().toUpperCase();
  if (normalized === "GROUP STAGE") return "stage-group";
  if (normalized === "ROUND OF 32") return "stage-r32";
  if (normalized === "ROUND OF 16") return "stage-r16";
  if (normalized === "QUARTER-FINAL" || normalized === "QUARTER FINAL")
    return "stage-quarter";
  if (normalized === "SEMI-FINAL" || normalized === "SEMI FINAL")
    return "stage-semi";
  if (normalized === "FINAL") return "stage-final";
  return "stage-other";
};

function Game() {
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState("home"),
    [profile, setProfile] = useState<PlayerProfile | null>(null),
    [matches, setMatches] = useState<DbMatch[]>([]),
    [board, setBoard] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true),
    [active, setActive] = useState<DbMatch | null>(null),
    [organizer, setOrganizer] = useState(false),
    [editMatchDetails, setEditMatchDetails] = useState<DbMatch | null>(null),
    [resultMatch, setResultMatch] = useState<DbMatch | null>(null),
    [detailMatch, setDetailMatch] = useState<DbMatch | null>(null),
    [tableStage, setTableStage] = useState("ALL"),
    [profileOpen, setProfileOpen] = useState(false);
  const [home, setHome] = useState(""),
    [away, setAway] = useState(""),
    [notice, setNotice] = useState<{
      text: string;
      kind: "success" | "error";
    } | null>(null),
    [confirming, setConfirming] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]),
    [published, setPublished] = useState<PublishedResult[]>([]);
  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      const raw = user?.email?.split("@")[0] ?? "player";
      const fallback: PlayerProfile = {
        id: user?.id ?? "",
        display_name: raw.charAt(0).toUpperCase() + raw.slice(1),
        is_organizer: raw.toLowerCase() === "hashil",
        avatar_path: null,
        has_played: false,
      };
      try {
        setProfile((await getMyProfile()) ?? fallback);
      } catch {
        setProfile(fallback);
      }
      const [ms, ps, rs] = await Promise.all([
        getMatches(),
        getMyPredictions(),
        getPublishedPredictionResults(),
      ]);
      setMatches(ms as DbMatch[]);
      setPredictions(ps as Prediction[]);
      setPublished(rs as PublishedResult[]);
      const b = await supabase!
        .from("leaderboard")
        .select("*")
        .order("points", { ascending: false });
      setBoard((b.data ?? []) as BoardRow[]);
      if (b.error)
        setNotice({
          text: `Leaderboard error: ${b.error.message}`,
          kind: "error",
        });
    } catch (e) {
      const x = e as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      setNotice({
        text:
          [x.message, x.details, x.hint, x.code].filter(Boolean).join(" · ") ||
          JSON.stringify(e) ||
          "Could not load league data.",
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const liveMatches = matches
      .filter((m) => {
        const elapsed = now - new Date(m.kickoff_at).getTime();
        return (
          m.status === "scheduled" &&
          elapsed >= 0 &&
          elapsed < 2 * 60 * 60 * 1000
        );
      })
      .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at)),
    upcoming = matches
      .filter(
        (m) =>
          m.status === "scheduled" && new Date(m.kickoff_at).getTime() > now,
      )
      .sort((a, b) => +new Date(a.kickoff_at) - +new Date(b.kickoff_at)),
    featured = liveMatches[0] ?? upcoming[0],
    completed = matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at)),
    displayMatches = [...matches].sort(
      (a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at),
    );
  const predictionFor = (id: string) =>
    predictions.find((p) => p.match_id === id);
  const canEditPrediction = (m: DbMatch, p?: Prediction) =>
    profile?.display_name === "Risvin" &&
    Boolean(p) &&
    m.status === "scheduled";
  const openPredictionRoom = (m: DbMatch) => {
    const existing = predictionFor(m.id);
    setHome(existing?.home_score.toString() ?? "");
    setAway(existing?.away_score.toString() ?? "");
    setActive(m);
  };
  const visibleBoard = board.map((row) =>
      row.id === profile?.id
        ? { ...row, predictions_made: predictions.length }
        : row,
    ),
    completedStageOptions = Array.from(
      new Set(completed.map((m) => m.stage).filter(Boolean)),
    ),
    stageMatchIds = new Set(
      completed
        .filter((m) => tableStage === "ALL" || m.stage === tableStage)
        .map((m) => m.id),
    ),
    stageCompletedCount =
      tableStage === "ALL" ? completed.length : stageMatchIds.size,
    tableResults =
      tableStage === "ALL"
        ? published
        : published.filter((r) => stageMatchIds.has(r.match_id)),
    tableBoard =
      tableStage === "ALL"
        ? visibleBoard
        : visibleBoard
            .map((row) => {
              const rows = tableResults.filter((r) => r.player_id === row.id),
                predictionsMade = rows.filter(
                  (r) => r.predicted_home_score != null,
                ).length,
                points = rows.filter((r) => r.correct === true).length,
                wrong = rows.filter(
                  (r) => r.predicted_home_score != null && !r.correct,
                ).length;
              return {
                ...row,
                predictions_made: predictionsMade,
                points,
                wrong,
                missed: Math.max(stageCompletedCount - predictionsMade, 0),
                elapsed_matches: stageCompletedCount,
              };
            })
            .sort(
              (a, b) =>
                b.points - a.points ||
                a.wrong - b.wrong ||
                b.predictions_made - a.predictions_made ||
                a.display_name.localeCompare(b.display_name),
            );
  const refreshBoard = async () => {
    const b = await supabase!
      .from("leaderboard")
      .select("*")
      .order("points", { ascending: false });
    if (b.error) throw b.error;
    setBoard((b.data ?? []) as BoardRow[]);
  };
  useEffect(() => {
    const refresh = () => {
      refreshBoard().catch(() => {});
    };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  const submit = async () => {
    if (!active) return;
    const editingPrediction = Boolean(predictionFor(active.id));
    setNotice(null);
    try {
      await savePrediction(active.id, +home, +away);
      const saved = `${active.home_team} ${home}–${away} ${active.away_team}`;
      const [ps] = await Promise.all([getMyPredictions(), refreshBoard()]);
      setPredictions(ps as Prediction[]);
      setActive(null);
      setConfirming(false);
      setHome("");
      setAway("");
      setNotice({
        text: editingPrediction
          ? `Prediction updated: ${saved}.`
          : `Prediction saved: ${saved}. It cannot be edited.`,
        kind: "success",
      });
    } catch (e) {
      setConfirming(false);
      setNotice({
        text: e instanceof Error ? e.message : "Prediction failed.",
        kind: "error",
      });
    }
  };
  if (loading) return <HummingLoader label="Loading the league" />;
  return (
    <div className="shell">
      <header>
        <div className="wordmark">
          <i>EK</i>
          <div>
            <b>
              Endiless<span>🚫</span>Kemmyoonity
            </b>
            <small>WORLD CUP 2026 · PRIVATE LEAGUE</small>
          </div>
        </div>
        <div className="head-right">
          <div className="reward">
            <span>THIS WEEK</span>
            <b>🌯 ₹120 Shawarma</b>
          </div>
          <button className="profile" onClick={() => setProfileOpen(true)}>
            <Avatar name={profile?.display_name ?? "Player"} />
            <div>
              <b>{profile?.display_name}</b>
              <small>
                {profile?.is_organizer ? "Organizer + player" : "Player"}
              </small>
            </div>
          </button>
        </div>
      </header>
      {notice && (
        <div className={`app-toast ${notice.kind}`} role="status">
          <div>
            <b>{notice.kind === "success" ? "Done" : "Something went wrong"}</b>
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)}>
            <X />
          </button>
        </div>
      )}
      <main>
        {tab === "home" && (
          <>
            <section className="intro">
              <div>
                <span className="live">
                  <i /> PRIVATE LEAGUE LIVE
                </span>
                <h1>
                  Make the call.
                  <br />
                  <em>Own the group chat.</em>
                </h1>
                <p>Exact score after 90 minutes earns one point.</p>
              </div>
              <div className="deadline">
                <Clock3 />
                <div>
                  <small>WEEK CLOSES</small>
                  <b>Sunday, 3:00 PM</b>
                  <span>India Standard Time</span>
                </div>
              </div>
            </section>
            {featured ? (
              <Hero
                m={featured}
                live={liveMatches.includes(featured)}
                prediction={predictionFor(featured.id)}
                canEditPrediction={canEditPrediction(
                  featured,
                  predictionFor(featured.id),
                )}
                open={() => openPredictionRoom(featured)}
              />
            ) : (
              <EmptyMatches
                organizer={Boolean(profile?.is_organizer)}
                open={() => setOrganizer(true)}
              />
            )}
            <div className="section-title">
              <div>
                <span>LIVE STANDINGS</span>
                <h2>
                  {visibleBoard.length
                    ? "The table never lies"
                    : "The table is waiting"}
                </h2>
              </div>
            </div>
            {visibleBoard.length ? (
              <Board
                rows={tableBoard}
                results={tableResults}
                totalMatches={
                  tableStage === "ALL" ? matches.length : stageCompletedCount
                }
                currentUserId={profile?.id}
                stageOptions={completedStageOptions}
                selectedStage={tableStage}
                onStageChange={setTableStage}
              />
            ) : (
              <EmptyTable />
            )}
          </>
        )}
        {tab === "matches" && (
          <>
            <PageHead
              title="Every match. One call."
              copy="Predictions are final and stay private until kickoff."
            />
            <div className="live-toolbar">
              {profile?.is_organizer && (
                <button onClick={() => setOrganizer(true)}>
                  <Plus /> Add match
                </button>
              )}
              <span>
                {upcoming.length} upcoming · {completed.length} completed
              </span>
            </div>
            {displayMatches.length ? (
              <MatchTimeline
                matches={displayMatches}
                predictionFor={predictionFor}
                canEditPrediction={canEditPrediction}
                organizer={Boolean(profile?.is_organizer)}
                open={openPredictionRoom}
                edit={setEditMatchDetails}
                result={setResultMatch}
                details={setDetailMatch}
              />
            ) : (
              <EmptyMatches
                organizer={Boolean(profile?.is_organizer)}
                open={() => setOrganizer(true)}
              />
            )}{" "}
            {completed[0] && <LatestResult m={completed[0]} />}
          </>
        )}
        {tab === "table" && (
          <>
            <PageHead
              title="Glory has a number."
              copy="Tap any player to see their exact, wrong and missed matches."
            />
            <>
              {visibleBoard.length ? (
                <Board
                  rows={tableBoard}
                  results={tableResults}
                  totalMatches={
                    tableStage === "ALL" ? matches.length : stageCompletedCount
                  }
                  currentUserId={profile?.id}
                  stageOptions={completedStageOptions}
                  selectedStage={tableStage}
                  onStageChange={setTableStage}
                />
              ) : (
                <EmptyTable />
              )}
            </>
          </>
        )}
        {tab === "shame" && (
          <>
            <PageHead
              title="Receipts, served cold."
              copy="Wrong calls, missed picks and cold streaks after published results."
            />
            <ShameWall rows={visibleBoard} results={published} />
          </>
        )}
      </main>
      <nav>
        {[
          ["home", Home, "Home"],
          ["matches", CalendarDays, "Matches"],
          ["table", Trophy, "Table"],
          ["shame", Flame, "Shame"],
        ].map(([id, I, label]: any) => (
          <button
            className={tab === id ? "on" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            <I />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {active &&
        active.status === "scheduled" &&
        ((!predictionFor(active.id) &&
          new Date(active.kickoff_at).getTime() - Date.now() >
            15 * 60 * 1000) ||
          canEditPrediction(active, predictionFor(active.id))) && (
          <div className="overlay">
            <form
              className="predictor"
              onSubmit={(e) => {
                e.preventDefault();
                setConfirming(true);
              }}
            >
              <button
                type="button"
                className="x"
                onClick={() => setActive(null)}
              >
                <X />
              </button>
              <div className="predict-head">
                <span>
                  {predictionFor(active.id)
                    ? "EDIT RISVIN PREDICTION"
                    : "YOUR FINAL PREDICTION"}
                </span>
                <b>{active.stage}</b>
                <small>{formatKickoff(active.kickoff_at)}</small>
              </div>
              <div className="entry">
                <label>
                  <Flag team={active.home_team} />
                  <b>{active.home_team}</b>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    max="20"
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                  />
                </label>
                <div>
                  <small>90 MIN</small>
                  <i>—</i>
                </div>
                <label>
                  <Flag team={active.away_team} />
                  <b>{active.away_team}</b>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={away}
                    onChange={(e) => setAway(e.target.value)}
                  />
                </label>
              </div>
              <div className="secure">
                <LockKeyhole />
                <div>
                  <b>
                    {predictionFor(active.id)
                      ? "Risvin edit mode"
                      : "Final submission"}
                  </b>
                  <small>Hidden from everyone until kickoff</small>
                </div>
                <em>{predictionFor(active.id) ? "Edit" : "No edits"}</em>
              </div>
              <button className="confirm" disabled={home === "" || away === ""}>
                {predictionFor(active.id)
                  ? "Review edited prediction"
                  : "Review prediction"}{" "}
                <ChevronRight />
              </button>
              <p>
                <ShieldCheck />{" "}
                {predictionFor(active.id)
                  ? "Only Risvin can edit this before the lock."
                  : "Once submitted, this prediction cannot be edited"}
              </p>
            </form>
          </div>
        )}
      {confirming && active && (
        <div className="overlay confirm-layer">
          <section className="confirm-sheet">
            <ShieldCheck />
            <h2>
              {predictionFor(active.id)
                ? "Save edited prediction?"
                : "Submit this final prediction?"}
            </h2>
            <p>
              {active.home_team}{" "}
              <b>
                {home}–{away}
              </b>{" "}
              {active.away_team}
            </p>
            <small>
              {predictionFor(active.id)
                ? "This replaces Risvin's previous score."
                : "Once submitted, this prediction cannot be edited."}
            </small>
            <div>
              <button onClick={() => setConfirming(false)}>Go back</button>
              <button onClick={submit}>
                {predictionFor(active.id) ? "Yes, save edit" : "Yes, submit it"}
              </button>
            </div>
          </section>
        </div>
      )}
      {organizer && (
        <Organizer close={() => setOrganizer(false)} saved={load} />
      )}
      {editMatchDetails && (
        <Organizer
          match={editMatchDetails}
          close={() => setEditMatchDetails(null)}
          saved={load}
        />
      )}
      {resultMatch && (
        <ResultForm
          match={resultMatch}
          close={() => setResultMatch(null)}
          saved={load}
        />
      )}
      {detailMatch && (
        <ResultDetails
          match={detailMatch}
          rows={published.filter((r) => r.match_id === detailMatch.id)}
          close={() => setDetailMatch(null)}
        />
      )}
      {profileOpen && (
        <Profile
          profile={profile}
          close={() => setProfileOpen(false)}
          refreshed={load}
        />
      )}
    </div>
  );
}
const formatKickoff = (v: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(v));
function avatarUrl(path?: string | null) {
  return path
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${path}?v=${encodeURIComponent(path)}`
    : "";
}
function Avatar({ name }: { name: string; path?: string | null }) {
  const hue = [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="avatar-ui colorful"
      style={{
        background: `linear-gradient(145deg,hsl(${hue} 80% 68%),hsl(${(hue + 35) % 360} 72% 45%))`,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
function Hero({
  m,
  open,
  prediction,
  canEditPrediction = false,
  live = false,
}: {
  m: DbMatch;
  open: () => void;
  prediction?: Prediction;
  canEditPrediction?: boolean;
  live?: boolean;
}) {
  return (
    <section className={"feature " + (live ? "feature-live" : "")}>
      <div className="feature-copy">
        <div className="stage">
          {live ? "● LIVE NOW" : "NEXT UP"} · {m.stage}
        </div>
        <div className="big-match">
          <div>
            <Flag team={m.home_team} />
            <b>{m.home_team}</b>
          </div>
          <i>{live ? "LIVE" : "VS"}</i>
          <div>
            <Flag team={m.away_team} />
            <b>{m.away_team}</b>
          </div>
        </div>
        <div className="kick">
          <CalendarDays /> {formatKickoff(m.kickoff_at)}
        </div>
        {live ? (
          <div className="saved-prediction live-status">
            <Flame /> Match in progress
            {prediction && (
              <>
                <b>
                  Your pick: {prediction.home_score}–{prediction.away_score}
                </b>
                <small>Predictions are locked</small>
                {canEditPrediction && (
                  <button type="button" onClick={open}>
                    Edit prediction <ChevronRight />
                  </button>
                )}
              </>
            )}
          </div>
        ) : prediction ? (
          <div className="saved-prediction">
            <ShieldCheck /> Your prediction:{" "}
            <b>
              {prediction.home_score}–{prediction.away_score}
            </b>
            <small>Final · cannot be edited</small>
          </div>
        ) : (
          <button onClick={open}>
            Make your prediction <ChevronRight />
          </button>
        )}
      </div>
      <div className="feature-art worldcup-photo">
        <div className="stadium-copy">
          <span>{live ? "MATCH IN PROGRESS" : "THE WORLD STAGE"}</span>
          <b>
            {live ? "The call is locked." : "90 minutes."}
            <br />
            {live ? "Now we wait." : "One perfect call."}
          </b>
        </div>
      </div>
    </section>
  );
}
function EmptyMatches({
  organizer,
  open,
}: {
  organizer: boolean;
  open: () => void;
}) {
  return (
    <section className="empty-state hero-empty">
      <span>⚽</span>
      <small>FIXTURE ROOM</small>
      <h2>
        {organizer ? "Add the first World Cup match" : "Waiting for Hashil"}
      </h2>
      <p>
        {organizer
          ? "Create a fixture and the prediction room will open for everyone."
          : "Hashil hasn’t added any matches yet. You’ll be able to predict as soon as the first fixture is published."}
      </p>
      {organizer && (
        <button onClick={open}>
          <Plus /> Add first match
        </button>
      )}
    </section>
  );
}
function EmptyTable() {
  return (
    <section className="empty-state compact">
      <span>🏆</span>
      <h2>0 players on the board</h2>
      <p>The leaderboard starts when the first prediction is submitted.</p>
    </section>
  );
}
function PageHead({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="page-head fixtures">
      <span>WORLD CUP 2026</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}
function MatchTimeline({
  matches,
  predictionFor,
  canEditPrediction,
  organizer,
  open,
  edit,
  result,
  details,
}: {
  matches: DbMatch[];
  predictionFor: (id: string) => Prediction | undefined;
  canEditPrediction: (m: DbMatch, p?: Prediction) => boolean;
  organizer: boolean;
  open: (m: DbMatch) => void;
  edit: (m: DbMatch) => void;
  result: (m: DbMatch) => void;
  details: (m: DbMatch) => void;
}) {
  let previous = "";
  return (
    <div className="fixture-list match-timeline">
      {matches.map((m) => {
        const date = new Intl.DateTimeFormat("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }).format(new Date(m.kickoff_at)),
          showDate = date !== previous;
        previous = date;
        return (
          <React.Fragment key={m.id}>
            {showDate && (
              <div className="date-divider">
                <span>{date}</span>
              </div>
            )}
            <MatchRow
              m={m}
              prediction={predictionFor(m.id)}
              canEditPrediction={canEditPrediction(m, predictionFor(m.id))}
              organizer={organizer}
              open={() => open(m)}
              edit={() => edit(m)}
              result={() => result(m)}
              details={() => details(m)}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
function MatchRow({
  m,
  open,
  organizer,
  edit,
  result,
  details,
  prediction,
  canEditPrediction,
}: {
  m: DbMatch;
  open: () => void;
  organizer: boolean;
  edit: () => void;
  result: () => void;
  details: () => void;
  prediction?: Prediction;
  canEditPrediction: boolean;
}) {
  const elapsed = Date.now() - new Date(m.kickoff_at).getTime(),
    started = elapsed >= 0,
    isLive = started && elapsed < 2 * 60 * 60 * 1000,
    resultReady = elapsed >= 2 * 60 * 60 * 1000,
    overdue = elapsed >= 5 * 60 * 60 * 1000,
    hours = Math.max(0, Math.ceil(-elapsed / 36e5)),
    state =
      m.status === "completed"
        ? "FINAL"
        : resultReady
          ? "ENDED · RESULT PENDING"
          : isLive
            ? "LIVE"
            : hours < 24
              ? `IN ${hours}H`
              : "UPCOMING",
    canAddResult = organizer && resultReady && m.status !== "completed",
    canEditMatch =
      organizer &&
      (m.status === "completed" || (!started && m.status === "scheduled")),
    centreKind =
      m.status === "completed"
        ? "final"
        : resultReady
          ? "pending"
          : isLive
            ? "live"
            : "versus";
  const label =
    m.status === "completed"
      ? "View result & predictions"
      : canAddResult
        ? overdue
          ? "Result overdue"
          : "Add final result"
        : resultReady
          ? "Match ended · score not updated"
          : prediction
            ? `Your pick ${prediction.home_score}–${prediction.away_score}`
            : isLive
              ? "Match in progress"
              : "Make prediction";
  return (
    <article
      className={
        "fixture match-card-pro " +
        stageClass(m.stage) +
        " " +
        (overdue && m.status !== "completed" ? "overdue" : "")
      }
    >
      <div className="fixture-meta">
        <span>{m.stage}</span>
        <b>{formatKickoff(m.kickoff_at)}</b>
        <small
          className={
            isLive && m.status !== "completed"
              ? "is-live"
              : resultReady && m.status !== "completed"
                ? "is-pending"
                : ""
          }
        >
          {state}
        </small>
      </div>
      <div className="fixture-teams">
        <div>
          <Flag team={m.home_team} />
          <b>{m.home_team}</b>
          <small>HOME</small>
        </div>
        <div className={`match-centre ${centreKind}`}>
          {centreKind === "final" ? (
            <>
              <strong>
                {m.home_score}–{m.away_score}
              </strong>
              <small>FULL TIME</small>
            </>
          ) : centreKind === "live" ? (
            <>
              <span />
              <strong>LIVE</strong>
              <small>IN PLAY</small>
            </>
          ) : centreKind === "pending" ? (
            <>
              <strong>FT</strong>
              <small>SCORE PENDING</small>
            </>
          ) : (
            <>
              <strong>VS</strong>
              <small>90 MIN</small>
            </>
          )}
        </div>
        <div>
          <Flag team={m.away_team} />
          <b>{m.away_team}</b>
          <small>AWAY</small>
        </div>
      </div>
      <div className="fixture-action">
        {prediction && (
          <small>
            <ShieldCheck />{" "}
            {m.status === "completed" ? "Your prediction" : "Prediction locked"}
            : {prediction.home_score}–{prediction.away_score}
          </small>
        )}
        {canEditMatch && (
          <button type="button" onClick={edit}>
            Edit match details
            <ChevronRight />
          </button>
        )}
        {canEditPrediction && (
          <button type="button" onClick={open}>
            Edit prediction
            <ChevronRight />
          </button>
        )}
        {organizer && m.status === "completed" && (
          <button type="button" onClick={result}>
            Edit final score
            <ChevronRight />
          </button>
        )}
        <button
          disabled={
            !canAddResult &&
            m.status !== "completed" &&
            (Boolean(prediction) || started)
          }
          onClick={
            m.status === "completed"
              ? details
              : canAddResult
                ? result
                : open
          }
        >
          {label}
          {(m.status === "completed" || (!started && !prediction)) && (
            <ChevronRight />
          )}
        </button>
      </div>
    </article>
  );
}
function ShameWall({
  rows,
  results,
}: {
  rows: BoardRow[];
  results: PublishedResult[];
}) {
  const completedRows = results.filter((r) => r.result_home_score != null),
    wrongRows = completedRows.filter(
      (r) => r.predicted_home_score != null && !r.correct,
    ),
    missedRows = completedRows.filter((r) => r.predicted_home_score == null),
    mostWrong = [...rows].sort((a, b) => b.wrong - a.wrong).slice(0, 5),
    mostMissed = [...rows].sort((a, b) => b.missed - a.missed).slice(0, 5),
    recentWrong = [...wrongRows]
      .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at))
      .slice(0, 6),
    coldStreaks = rows
      .map((player) => {
        const playerRows = completedRows
          .filter((r) => r.player_id === player.id)
          .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at));
        let streak = 0;
        for (const row of playerRows) {
          if (row.predicted_home_score != null && !row.correct) streak += 1;
          else break;
        }
        return { ...player, streak };
      })
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);

  if (!completedRows.length) {
    return (
      <div className="empty-state compact">
        <span>--</span>
        <h2>Everyone is innocent for now.</h2>
        <p>
          Wrong streaks, missed matches and wooden spoons will appear here
          automatically after Hashil publishes results.
        </p>
      </div>
    );
  }

  return (
    <section className="shame-wall">
      <div className="shame-summary">
        <div>
          <span>Total wrong</span>
          <b>{wrongRows.length}</b>
          <small>Published picks that missed</small>
        </div>
        <div>
          <span>Total missed</span>
          <b>{missedRows.length}</b>
          <small>No pick submitted</small>
        </div>
        <div>
          <span>Current coldest</span>
          <b>{coldStreaks[0]?.display_name ?? "None"}</b>
          <small>{coldStreaks[0]?.streak ?? 0} wrong in a row</small>
        </div>
      </div>
      <div className="shame-grid">
        <ShameList
          title="Most wrong"
          label="wrong"
          rows={mostWrong}
          value={(row) => row.wrong}
        />
        <ShameList
          title="Most missed"
          label="missed"
          rows={mostMissed}
          value={(row) => row.missed}
        />
        <ShameList
          title="Cold streak"
          label="wrong in a row"
          rows={coldStreaks}
          value={(row) => row.streak ?? 0}
        />
      </div>
      <div className="shame-recent">
        <header>
          <span>Latest wrong calls</span>
          <b>Fresh receipts</b>
        </header>
        {recentWrong.length ? (
          recentWrong.map((r) => (
            <article key={`${r.match_id}-${r.player_id}`}>
              <div>
                <Avatar name={r.display_name} />
                <span>
                  <b>{r.display_name}</b>
                  <small>
                    {r.home_team} vs {r.away_team}
                  </small>
                </span>
              </div>
              <strong>
                {r.predicted_home_score}-{r.predicted_away_score}
              </strong>
              <small>
                Final {r.result_home_score}-{r.result_away_score}
              </small>
            </article>
          ))
        ) : (
          <p>No wrong calls yet.</p>
        )}
      </div>
    </section>
  );
}
function ShameList({
  title,
  label,
  rows,
  value,
}: {
  title: string;
  label: string;
  rows: Array<BoardRow & { streak?: number }>;
  value: (row: BoardRow & { streak?: number }) => number;
}) {
  return (
    <div className="shame-list">
      <header>
        <span>Shame board</span>
        <b>{title}</b>
      </header>
      {rows.map((row, index) => (
        <article key={row.id}>
          <i>{index + 1}</i>
          <Avatar name={row.display_name} path={row.avatar_path} />
          <span>
            <b>{row.display_name}</b>
            <small>
              {value(row)} {label}
            </small>
          </span>
        </article>
      ))}
    </div>
  );
}
function Board({
  rows,
  currentUserId,
  results,
  totalMatches,
  stageOptions,
  selectedStage,
  onStageChange,
}: {
  rows: BoardRow[];
  currentUserId?: string;
  results: PublishedResult[];
  totalMatches: number;
  stageOptions: string[];
  selectedStage: string;
  onStageChange: (stage: string) => void;
}) {
  const [selected, setSelected] = useState<BoardRow | null>(null),
    elapsed = Math.max(...rows.map((r) => r.elapsed_matches), 0),
    totalPredictions = rows.reduce((n, r) => n + r.predictions_made, 0),
    leader = rows[0],
    hasPoints = rows.some((r) => r.points > 0),
    scoped = selectedStage !== "ALL";
  useEffect(() => {
    setSelected(null);
  }, [selectedStage]);
  return (
    <>
      <section className="board-shell">
        <div className="board-toolbar">
          <div>
            <span>TABLE FILTER</span>
            <b>{scoped ? selectedStage : "All rounds"}</b>
          </div>
          <label>
            <span>Round</span>
            <select
              value={selectedStage}
              onChange={(e) => onStageChange(e.target.value)}
            >
              <option value="ALL">All rounds</option>
              {stageOptions.map((stage) => (
                <option value={stage} key={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="board-summary">
          <div>
            <span>
              {hasPoints
                ? scoped
                  ? "ROUND LEADER"
                  : "LEAGUE LEADER"
                : scoped
                  ? "ROUND STATUS"
                  : "LEAGUE STATUS"}
            </span>
            <b>{hasPoints ? leader.display_name : "Awaiting results"}</b>
            <small>
              {hasPoints ? `${leader.points} points` : "No points awarded yet"}
            </small>
          </div>
          <div>
            <span>{scoped ? "ROUND MATCHES" : "MATCHES STARTED"}</span>
            <b>{elapsed}</b>
            <small>{scoped ? selectedStage : "Across the league"}</small>
          </div>
          <div>
            <span>PREDICTIONS</span>
            <b>{totalPredictions}</b>
            <small>Total calls made</small>
          </div>
          <div>
            <span>PERFECT CALLS</span>
            <b>{rows.reduce((n, r) => n + r.points, 0)}</b>
            <small>Exact scores</small>
          </div>
        </div>
        <div className="standings">
          <div className="stand-head">
            <span>RANK</span>
            <span>PLAYER</span>
            <span>PARTICIPATION</span>
            <span>EXACT</span>
            <span>WRONG</span>
            <span>MISSED</span>
            <span>POINTS</span>
          </div>
          {rows.map((r, i) => {
            const available = Math.max(totalMatches, r.predictions_made),
              rate = available
                ? Math.round((r.predictions_made / available) * 100)
                : 0,
              isMe = r.id === currentUserId;
            return (
              <button
                type="button"
                className={`stand-row ${hasPoints && i === 0 ? "first" : ""} ${isMe ? "is-me" : ""}`}
                key={r.id}
                onClick={() => setSelected(r)}
              >
                <span className="pos">
                  <b>{i + 1}</b>
                  {hasPoints && i < 3 && (
                    <small>{["1ST", "2ND", "3RD"][i]}</small>
                  )}
                </span>
                <span className="person">
                  <Avatar name={r.display_name} />
                  <div>
                    <b>
                      {r.display_name}
                      {isMe && <em>YOU</em>}
                    </b>
                    <small>
                      {!hasPoints
                        ? "Waiting for first result"
                        : i === 0
                          ? scoped
                            ? "Round leader"
                            : "Current leader"
                          : r.points === leader.points
                            ? "Level on points"
                            : `${leader.points - r.points} pts behind`}
                    </small>
                  </div>
                </span>
                <span className="participation">
                  <b>
                    {r.predictions_made} of {available || r.predictions_made}
                  </b>
                  <i>
                    <span style={{ width: `${Math.min(rate, 100)}%` }} />
                  </i>
                  <small>{rate}% participation</small>
                </span>
                <span className="stat good">{r.points}</span>
                <span className="stat bad">{r.wrong}</span>
                <span className="stat muted">{r.missed}</span>
                <strong className="points">
                  {r.points}
                  <small>PTS</small>
                </strong>
              </button>
            );
          })}
        </div>
        <p className="board-note">
          <ShieldCheck /> Tap a player to inspect their completed-match record.
        </p>
      </section>
      {selected && (
        <PlayerMatchHistory
          player={selected}
          rows={results.filter((r) => r.player_id === selected.id)}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
function PlayerMatchHistory({
  player,
  rows,
  close,
}: {
  player: BoardRow;
  rows: PublishedResult[];
  close: () => void;
}) {
  const [tab, setTab] = useState<"exact" | "wrong" | "missed">("exact"),
    filtered = rows
      .filter((r) =>
        tab === "missed"
          ? r.predicted_home_score == null
          : tab === "exact"
            ? r.correct === true
            : r.predicted_home_score != null && !r.correct,
      )
      .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at)),
    counts = {
      exact: rows.filter((r) => r.correct === true).length,
      wrong: rows.filter((r) => r.predicted_home_score != null && !r.correct)
        .length,
      missed: rows.filter((r) => r.predicted_home_score == null).length,
    };
  let previous = "";
  return (
    <div className="overlay">
      <section className="player-history">
        <button className="x" onClick={close}>
          <X />
        </button>
        <div className="player-history-head">
          <Avatar name={player.display_name} />
          <div>
            <span>PLAYER RECORD</span>
            <h2>{player.display_name}</h2>
            <p>
              {player.points} points · {player.predictions_made} predictions
            </p>
          </div>
        </div>
        <div className="history-tabs">
          {(["exact", "wrong", "missed"] as const).map((id) => (
            <button
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              key={id}
            >
              <span>{id}</span>
              <b>{counts[id]}</b>
            </button>
          ))}
        </div>
        <div className="history-matches">
          {filtered.length ? (
            filtered.map((r) => {
              const date = new Intl.DateTimeFormat("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(r.kickoff_at)),
                showDate = date !== previous;
              previous = date;
              return (
                <React.Fragment key={r.match_id}>
                  {showDate && (
                    <div className="history-date-divider">
                      <span>{date}</span>
                    </div>
                  )}
                  <article>
                    <div>
                      <b>
                        {r.home_team} vs {r.away_team}
                      </b>
                      <small>
                        {new Intl.DateTimeFormat("en-IN", {
                          timeStyle: "short",
                          timeZone: "Asia/Kolkata",
                        }).format(new Date(r.kickoff_at))}
                      </small>
                    </div>
                    <div className="history-scores">
                      <span>
                        Final{" "}
                        <b>
                          {r.result_home_score}–{r.result_away_score}
                        </b>
                      </span>
                      <span>
                        Pick{" "}
                        <b>
                          {r.predicted_home_score == null
                            ? "—"
                            : `${r.predicted_home_score}–${r.predicted_away_score}`}
                        </b>
                      </span>
                    </div>
                  </article>
                </React.Fragment>
              );
            })
          ) : (
            <div className="history-empty">No {tab} matches yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
function LatestResult({ m }: { m: DbMatch }) {
  return (
    <>
      <div className="section-title">
        <div>
          <span>LATEST RESULT</span>
          <h2>Last match published</h2>
        </div>
      </div>
      <section className="latest-result">
        <Flag team={m.home_team} />
        <b>{m.home_team}</b>
        <strong>
          {m.home_score} – {m.away_score}
        </strong>
        <b>{m.away_team}</b>
        <Flag team={m.away_team} />
      </section>
    </>
  );
}
function ResultDetails({
  match,
  rows,
  close,
}: {
  match: DbMatch;
  rows: PublishedResult[];
  close: () => void;
}) {
  return (
    <div className="overlay">
      <section className="result-detail-sheet">
        <button className="x" onClick={close}>
          <X />
        </button>
        <span>FULL-TIME RESULT</span>
        <h2>
          {match.home_team} vs {match.away_team}
        </h2>
        <div className="detail-score">
          <div>
            <Flag team={match.home_team} />
            <b>{match.home_team}</b>
          </div>
          <strong>
            {match.home_score} – {match.away_score}
          </strong>
          <div>
            <Flag team={match.away_team} />
            <b>{match.away_team}</b>
          </div>
        </div>
        <p>{formatKickoff(match.kickoff_at)} · 90 minutes</p>
        <div className="detail-head">
          <b>Player</b>
          <b>Prediction</b>
          <b>Outcome</b>
        </div>
        <div className="detail-predictions">
          {rows.length ? (
            rows.map((r) => (
              <article key={r.player_id}>
                <span>
                  <Avatar name={r.display_name} />
                  <b>{r.display_name}</b>
                </span>
                <strong>
                  {r.predicted_home_score == null
                    ? "—"
                    : `${r.predicted_home_score}–${r.predicted_away_score}`}
                </strong>
                <em
                  className={
                    r.predicted_home_score == null
                      ? "missed"
                      : r.correct
                        ? "correct"
                        : "wrong"
                  }
                >
                  {r.predicted_home_score == null
                    ? "Missed"
                    : r.correct
                      ? "✓ Exact · +1"
                      : "✕ Wrong"}
                </em>
              </article>
            ))
          ) : (
            <div className="detail-empty">
              No player prediction data is available for this match.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function Organizer({
  match,
  close,
  saved,
}: {
  match?: DbMatch;
  close: () => void;
  saved: () => void;
}) {
  const initialKickoff = match ? new Date(match.kickoff_at) : null,
    initialHour24 = initialKickoff?.getHours() ?? 20,
    initialHour12 = initialHour24 % 12 || 12,
    editing = Boolean(match),
    editingCompleted = match?.status === "completed";
  const [home, setHome] = useState(match?.home_team ?? "Brazil"),
    [away, setAway] = useState(match?.away_team ?? "Morocco"),
    [stage, setStage] = useState(match?.stage ?? "ROUND OF 16"),
    [date, setDate] = useState(
      initialKickoff
        ? `${initialKickoff.getFullYear()}-${String(initialKickoff.getMonth() + 1).padStart(2, "0")}-${String(initialKickoff.getDate()).padStart(2, "0")}`
        : "",
    ),
    [hour, setHour] = useState(String(initialHour12).padStart(2, "0")),
    [minute, setMinute] = useState(
      String(initialKickoff?.getMinutes() ?? 0).padStart(2, "0"),
    ),
    [period, setPeriod] = useState(initialHour24 >= 12 ? "PM" : "AM"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (home === away) return setError("Choose two different teams.");
    let h = Number(hour) % 12;
    if (period === "PM") h += 12;
    const kickoff = new Date(
      `${date}T${String(h).padStart(2, "0")}:${minute}:00`,
    );
    if (Number.isNaN(kickoff.getTime()))
      return setError("Choose a valid kickoff date and time.");
    setSaving(true);
    setError("");
    try {
      const input = {
        homeTeam: home,
        awayTeam: away,
        stage,
        kickoffAt: kickoff.toISOString(),
        knockout: stage !== "GROUP STAGE",
      };
      if (match) await editMatch(match.id, input);
      else await addMatch(input);
      await saved();
      close();
    } catch (x) {
      setError(
        x instanceof Error
          ? x.message
          : editing
            ? "Could not update match."
            : "Could not add match.",
      );
      setSaving(false);
    }
  };
  return (
    <div className="overlay organizer-overlay">
      <form className="organizer-sheet professional" onSubmit={submit}>
        <button
          type="button"
          className="plain-close"
          aria-label="Close"
          onClick={close}
        >
          <X />
        </button>
        <div className="organizer-scroll">
          <div className="organizer-head">
            <span>HASHIL · ORGANIZER CONTROL</span>
            <h2>{editing ? "Edit fixture" : "Create fixture"}</h2>
            <p>
              {editingCompleted
                ? "Correct the round or kickoff time after the result is published."
                : editing
                  ? "Update match details before kickoff."
                : "Flags and country styling are selected automatically."}
            </p>
          </div>
          <div className="team-picker">
            <label>
              <span>HOME TEAM</span>
              <div>
                <Flag team={home} />
                <select
                  value={home}
                  onChange={(e) => setHome(e.target.value)}
                  disabled={editingCompleted}
                >
                  {roundOf16Teams.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </label>
            <i>VS</i>
            <label>
              <span>AWAY TEAM</span>
              <div>
                <Flag team={away} />
                <select
                  value={away}
                  onChange={(e) => setAway(e.target.value)}
                  disabled={editingCompleted}
                >
                  {roundOf16Teams.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </label>
          </div>
          <div className="fixture-fields friendly-time">
            <label>
              Competition stage
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option>GROUP STAGE</option>
                <option>ROUND OF 32</option>
                <option>ROUND OF 16</option>
                <option>QUARTER-FINAL</option>
                <option>SEMI-FINAL</option>
                <option>FINAL</option>
              </select>
            </label>
            <label>
              Kickoff date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="time-label">
              Kickoff time
              <div className="time-selects">
                <select value={hour} onChange={(e) => setHour(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) =>
                    String(i + 1).padStart(2, "0"),
                  ).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <b>:</b>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                >
                  {["00", "15", "30", "45"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </label>
          </div>
          {error && <div className="login-error">{error}</div>}
        </div>
        <div className="organizer-footer">
          <button disabled={saving}>
            {saving
              ? editing
                ? "Saving fixture..."
                : "Publishing fixture..."
              : editing
                ? "Save fixture"
                : "Publish fixture"}
            <ChevronRight />
          </button>
        </div>
      </form>
    </div>
  );
}
function ResultForm({
  match,
  close,
  saved,
}: {
  match: DbMatch;
  close: () => void;
  saved: () => void;
}) {
  const editing = match.status === "completed",
    [h, setH] = useState(match.home_score?.toString() ?? ""),
    [a, setA] = useState(match.away_score?.toString() ?? ""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateResult(match.id, +h, +a);
      } else {
        await publishResult(match.id, +h, +a);
      }
      await saved();
      close();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Could not save result.");
      setSaving(false);
    }
  };
  return (
    <div className="overlay">
      <form className="result-entry-sheet" onSubmit={submit}>
        <button type="button" className="x" aria-label="Close" onClick={close}>
          <X />
        </button>
        <div className="result-entry-head">
          <span>HASHIL · RESULT CONTROL</span>
          <h2>{editing ? "Edit final score" : "Publish final score"}</h2>
          <p>
            {editing
              ? "Correct the official score and refresh the table."
              : "Enter the official score after 90 minutes."}
          </p>
        </div>
        <div className="result-score-entry">
          <label>
            <Flag team={match.home_team} />
            <b>{match.home_team}</b>
            <small>HOME</small>
            <input
              autoFocus
              type="number"
              min="0"
              max="20"
              value={h}
              onChange={(e) => setH(e.target.value)}
              required
            />
          </label>
          <div>
            <span>FINAL</span>
            <strong>–</strong>
            <small>90 MIN</small>
          </div>
          <label>
            <Flag team={match.away_team} />
            <b>{match.away_team}</b>
            <small>AWAY</small>
            <input
              type="number"
              min="0"
              max="20"
              value={a}
              onChange={(e) => setA(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="result-warning">
          <ShieldCheck />
          <div>
            <b>This publishes immediately</b>
            <small>
              {editing
                ? "Points and every player's prediction outcome will update automatically."
                : "Points and every player's prediction outcome will be calculated automatically."}
            </small>
          </div>
        </div>
        {error && <div className="result-error">{error}</div>}
        <button
          className="result-publish"
          disabled={saving || h === "" || a === ""}
        >
          <span>
            {saving
              ? editing
                ? "Saving correction..."
                : "Publishing result..."
              : editing
                ? "Save corrected result"
                : "Publish final result"}
          </span>
          <b>{h === "" || a === "" ? "—" : `${h}–${a}`}</b>
          <ChevronRight />
        </button>
      </form>
    </div>
  );
}
function Profile({
  profile,
  close,
  refreshed,
}: {
  profile: PlayerProfile | null;
  close: () => void;
  refreshed: () => void;
}) {
  const [p1, setP1] = useState(""),
    [p2, setP2] = useState(""),
    [msg, setMsg] = useState(""),
    [uploading, setUploading] = useState(false);
  const change = async () => {
    if (p1.length < 8) return setMsg("Use at least 8 characters.");
    if (p1 !== p2) return setMsg("The codes do not match.");
    const { error } = await changePassword(p1);
    setMsg(error ? error.message : "Private code changed.");
  };
  const upload = async (file?: File) => {
    if (!file || !profile) return;
    if (file.size > 2_000_000) return setMsg("Use an image smaller than 2 MB.");
    setUploading(true);
    setMsg("Uploading photo…");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/avatar.${ext}`;
    const { error } = await supabase!.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      return setMsg(error.message);
    }
    const update = await supabase!
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", profile.id);
    if (update.error) {
      setUploading(false);
      return setMsg(update.error.message);
    }
    setMsg("Profile photo updated.");
    await refreshed();
    setUploading(false);
  };
  return (
    <div className="overlay">
      <section className="profile-sheet">
        <button className="x" onClick={close}>
          <X />
        </button>
        <div className="profile-cover">
          <span>PLAYER PROFILE</span>
          <b>{profile?.display_name}</b>
        </div>
        <div className="profile-photo live-photo">
          <Avatar
            name={profile?.display_name ?? "Player"}
            path={profile?.avatar_path}
          />
          <label className={uploading ? "uploading" : ""}>
            {uploading ? "Uploading…" : "Upload profile photo"}
            <input
              disabled={uploading}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        </div>
        <div className="account-security">
          <span>ACCOUNT SECURITY</span>
          <h3>Change private code</h3>
          <input
            type="password"
            placeholder="New code"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm new code"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
          />
          {msg && <small>{msg}</small>}
          <button onClick={change}>Update private code</button>
          <button className="logout" onClick={() => signOut()}>
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}
function Login() {
  const [name, setName] = useState("Risvin"),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error: x } = await signInWithCode(name, code);
    if (x) setError("Name or private code is incorrect.");
  };
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-art">
          <span>ENDILESS🚫KEMMYOONITY</span>
          <h1>
            Your call.
            <br />
            Your receipts.
          </h1>
        </div>
        <form onSubmit={submit}>
          <span className="login-kicker">PLAYER ACCESS</span>
          <h2>Enter the group</h2>
          <label>
            Your name
            <select value={name} onChange={(e) => setName(e.target.value)}>
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Private code
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button>
            Enter prediction room <ChevronRight />
          </button>
        </form>
      </section>
    </main>
  );
}
function HummingMark() {
  return (
    <span className="humming-mark">
      <i />
      <i />
      <i />
    </span>
  );
}
function HummingLoader({ label }: { label: string }) {
  return (
    <div className="humming-loader">
      <img src="/images/ek-logo.png" alt="" />
      <HummingMark />
      <span>{label}</span>
    </div>
  );
}
function Root() {
  const [ready, setReady] = useState(false),
    [session, setSession] = useState(false);
  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
      setReady(true);
    });
    const { data } = supabase!.auth.onAuthStateChange((_e, s) =>
      setSession(!!s),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return ready ? (
    session ? (
      <Game />
    ) : (
      <Login />
    )
  ) : (
    <HummingLoader label="Opening your league" />
  );
}
createRoot(document.getElementById("root")!).render(<Root />);
