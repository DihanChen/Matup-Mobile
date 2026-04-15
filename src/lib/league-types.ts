import type {
  ScoringFormat,
  Standing,
  TeamStanding,
} from "./rankings";

export type { ScoringFormat, Standing, TeamStanding };

export type League = {
  id: string;
  name: string;
  description: string | null;
  sport_type: string;
  scoring_format: ScoringFormat;
  league_type: string;
  creator_id: string;
  max_members: number;
  start_date: string | null;
  season_weeks: number | null;
  rotation_type: string | null;
  status: string;
  created_at: string;
  rules_jsonb?: unknown;
  visibility?: "public" | "private" | "invite_only";
  cover_image_url?: string | null;
};

export type LeagueMember = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  name: string | null;
  avatar_url: string | null;
};

export type LeagueMatch = {
  id: string;
  week_number: number | null;
  match_date: string | null;
  status: string;
  workflow_status?: string;
  latest_submission?: {
    id: string;
    submitted_by: string;
    source: "organizer" | "participant";
    status: "pending" | "accepted" | "rejected" | "superseded";
    payload?: {
      winner?: "A" | "B";
      sets?: number[][];
    };
  } | null;
  winner: string | null;
  notes: string | null;
  created_at: string;
  court?: ApiFixtureCourt | null;
  participants: {
    user_id: string;
    team: string | null;
    score: number | null;
    time_seconds: number | null;
    points: number | null;
    set_scores: { sets: number[][] } | null;
    name: string | null;
  }[];
};

export type ApiFixtureParticipant = {
  user_id: string;
  side: "A" | "B" | null;
  name: string | null;
};

export type ApiFixtureCourt = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type ApiFixture = {
  id: string;
  week_number: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  created_at: string;
  court_id: string | null;
  court: ApiFixtureCourt | null;
  participants: ApiFixtureParticipant[];
  latest_submission: {
    id?: string;
    submitted_by?: string;
    source?: "organizer" | "participant";
    status?: "pending" | "accepted" | "rejected" | "superseded";
    payload?: {
      winner?: "A" | "B";
      sets?: number[][];
    };
  } | null;
};

export type ApiStandingsResponse = {
  standings?: Standing[];
  teamStandings?: TeamStanding[];
  runningMode?: RunningMode | null;
};

export type RunningMode = "absolute_performance" | "personal_progress";

export type LeagueInvite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  invited_at: string;
  claimed_at: string | null;
  expires_at: string | null;
};

export type ApiInvitesResponse = {
  inviteCode: string;
  invites: LeagueInvite[];
  sent?: number;
  failed?: Array<{ email: string; error: string }>;
  emailError?: string | null;
};

export type RunningSessionRun = {
  id: string;
  session_id: string;
  user_id: string;
  elapsed_seconds: number;
  distance_meters: number;
  proof_url: string | null;
  status: "submitted" | "approved" | "rejected" | "finalized";
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  name: string | null;
  avatar_url: string | null;
};

export type RunningSession = {
  id: string;
  week_number: number | null;
  session_type: "time_trial" | "group_run" | "interval";
  distance_meters: number | null;
  route_name: string | null;
  starts_at: string | null;
  submission_deadline: string | null;
  comparison_mode: "absolute_performance" | "personal_progress";
  status: "scheduled" | "open" | "closed" | "finalized";
  runs: RunningSessionRun[];
  my_run: RunningSessionRun | null;
};

export type ApiRunningSessionsResponse = {
  sessions: RunningSession[];
};

export type AssignedTeamPair = {
  playerAId: string;
  playerAName: string | null;
  playerBId: string;
  playerBName: string | null;
};

export type ApiAssignedTeamsResponse = {
  pairs: AssignedTeamPair[];
  unpairedMemberIds: string[];
};

export type SubmitResultPayload = {
  winner: "A" | "B";
  sets?: number[][];
  notes?: string;
  outcome_type?: "played" | "forfeit";
  forfeit_reason?:
    | "opponent_no_show"
    | "opponent_injury"
    | "self_injury"
    | "weather"
    | "facility_issue"
    | "other";
};

export const FORMAT_LABELS: Record<string, string> = {
  team_vs_team: "Team vs Team",
  individual_time: "Time Trial",
  individual_points: "Points",
  singles: "Singles",
  doubles: "Doubles",
};

export const ROTATION_LABELS: Record<string, string> = {
  random: "Random",
  assigned: "Assigned Partner",
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapFixtureStatusToMatchStatus(status: string): string {
  if (status === "finalized") return "completed";
  if (status === "cancelled") return "cancelled";
  return "scheduled";
}

export function mapFixturesToMatches(fixtures: ApiFixture[]): LeagueMatch[] {
  return fixtures.map((fixture) => {
    const payload = fixture.latest_submission?.payload;
    const parsedSets = Array.isArray(payload?.sets)
      ? payload.sets.filter(
          (set): set is number[] =>
            Array.isArray(set) &&
            set.length === 2 &&
            set.every((value) => typeof value === "number")
        )
      : [];
    const setScores = parsedSets.length > 0 ? { sets: parsedSets } : null;

    return {
      id: fixture.id,
      week_number: fixture.week_number,
      match_date: fixture.starts_at ? fixture.starts_at.split("T")[0] : null,
      status: mapFixtureStatusToMatchStatus(fixture.status),
      workflow_status: fixture.status,
      latest_submission:
        fixture.latest_submission?.id &&
        fixture.latest_submission?.submitted_by &&
        fixture.latest_submission?.source &&
        fixture.latest_submission?.status
          ? {
              id: fixture.latest_submission.id,
              submitted_by: fixture.latest_submission.submitted_by,
              source: fixture.latest_submission.source,
              status: fixture.latest_submission.status,
              payload:
                fixture.latest_submission.status === "pending"
                  ? fixture.latest_submission.payload
                  : undefined,
            }
          : null,
      winner: payload?.winner || null,
      notes: null,
      created_at: fixture.created_at,
      court: fixture.court || null,
      participants: (fixture.participants || []).map((participant) => ({
        user_id: participant.user_id,
        team: participant.side,
        score: null,
        time_seconds: null,
        points: null,
        set_scores: setScores,
        name: participant.name,
      })),
    };
  });
}

/** @deprecated Use mapFixturesToMatches instead */
export const mapFixturesToLegacyMatches = mapFixturesToMatches;

export function getRunningModeFromRules(rules: unknown): RunningMode {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    return "personal_progress";
  }
  const rulesObj = rules as Record<string, unknown>;

  const sessions = rulesObj.sessions;
  if (
    sessions &&
    typeof sessions === "object" &&
    !Array.isArray(sessions) &&
    (sessions as Record<string, unknown>).comparison_mode === "absolute_performance"
  ) {
    return "absolute_performance";
  }

  return "personal_progress";
}
