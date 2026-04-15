export type LeagueSport = "tennis" | "pickleball" | "running";
export type LeagueMatchType = "singles" | "doubles" | "";
export type LeagueRotationType = "random" | "assigned" | "";

type CheckinRules = {
  checkin_required: boolean;
  checkin_window_minutes_before_start: number;
  allow_self_checkin: boolean;
  late_checkin_policy: "allow" | "block_result_submission" | "mark_late";
};

type TennisRules = {
  sport: "tennis";
  schedule: {
    cadence: "weekly";
    starts_on: string | null;
    starts_at_local: string | null;
    season_weeks: number;
  };
  match: {
    mode: "singles" | "doubles";
    doubles_partner_mode: "random_weekly" | "fixed_pairs" | null;
    fixed_pairs: Array<[string, string]> | null;
    scoring_input: "winner_only" | "set_by_set";
    best_of_sets: 3 | 5;
    tiebreak_at_games: number;
  };
  standings: {
    points: {
      win: number;
      loss: number;
    };
    tie_breakers: Array<"points" | "head_to_head" | "set_diff" | "game_diff">;
  };
  submissions: {
    allow_participant_submission: boolean;
    require_opponent_confirmation: boolean;
  };
  attendance: CheckinRules;
};

type RunningRules = {
  sport: "running";
  schedule: {
    cadence: "weekly";
    starts_on: string | null;
    starts_at_local: string | null;
    season_weeks: number;
  };
  sessions: {
    default_session_type: "time_trial";
    comparison_mode: "personal_progress" | "absolute_performance";
    distance_tolerance_percent: number;
  };
  submissions: {
    allow_runner_submission: boolean;
    require_organizer_approval: boolean;
    proof_required: boolean;
  };
  standings: {
    mode: "personal_progress" | "absolute_performance";
    best_n_weeks: number;
    drop_worst_k_weeks: number;
    min_sessions_for_ranking: number;
  };
  attendance: CheckinRules;
};

type PickleballRules = {
  sport: "pickleball";
  schedule: {
    cadence: "weekly";
    starts_on: string | null;
    starts_at_local: string | null;
    season_weeks: number;
  };
  match: {
    mode: "singles" | "doubles";
    doubles_partner_mode: "random_weekly" | "fixed_pairs" | null;
    fixed_pairs: Array<[string, string]> | null;
    scoring_input: "winner_only" | "game_by_game";
    best_of_games: 3 | 5;
    game_points_to: 11 | 15 | 21;
    win_by: 2;
    serving_model: "side_out";
  };
  standings: {
    points: {
      win: number;
      loss: number;
    };
    tie_breakers: Array<"points" | "head_to_head" | "game_diff" | "point_diff">;
  };
  submissions: {
    allow_participant_submission: boolean;
    require_opponent_confirmation: boolean;
  };
  attendance: CheckinRules;
};

export type LeagueRules = TennisRules | PickleballRules | RunningRules;

type BuildLeagueRulesParams = {
  sportType: LeagueSport;
  matchType: LeagueMatchType;
  rotationType: LeagueRotationType;
  runningComparisonMode: "personal_progress" | "absolute_performance";
  startDate: string;
  startTime: string;
  seasonWeeks: number;
};

const DEFAULT_CHECKIN_RULES: CheckinRules = {
  checkin_required: false,
  checkin_window_minutes_before_start: 30,
  allow_self_checkin: true,
  late_checkin_policy: "allow",
};

export function buildLeagueRules({
  sportType,
  matchType,
  rotationType,
  runningComparisonMode,
  startDate,
  startTime,
  seasonWeeks,
}: BuildLeagueRulesParams): LeagueRules {
  if (sportType === "running") {
    return {
      sport: "running",
      schedule: {
        cadence: "weekly",
        starts_on: startDate || null,
        starts_at_local: startTime || null,
        season_weeks: seasonWeeks,
      },
      sessions: {
        default_session_type: "time_trial",
        comparison_mode: runningComparisonMode,
        distance_tolerance_percent: 5,
      },
      submissions: {
        allow_runner_submission: true,
        require_organizer_approval: false,
        proof_required: false,
      },
      standings: {
        mode: runningComparisonMode,
        best_n_weeks: Math.max(1, seasonWeeks - 1),
        drop_worst_k_weeks: 1,
        min_sessions_for_ranking: Math.min(3, seasonWeeks),
      },
      attendance: DEFAULT_CHECKIN_RULES,
    };
  }

  const mode = matchType === "doubles" ? "doubles" : "singles";
  const doublesPartnerMode =
    mode === "doubles"
      ? rotationType === "assigned"
        ? "fixed_pairs"
        : "random_weekly"
      : null;

  if (sportType === "pickleball") {
    return {
      sport: "pickleball",
      schedule: {
        cadence: "weekly",
        starts_on: startDate || null,
        starts_at_local: startTime || null,
        season_weeks: seasonWeeks,
      },
      match: {
        mode,
        doubles_partner_mode: doublesPartnerMode,
        fixed_pairs: doublesPartnerMode === "fixed_pairs" ? [] : null,
        scoring_input: "game_by_game",
        best_of_games: 3,
        game_points_to: 11,
        win_by: 2,
        serving_model: "side_out",
      },
      standings: {
        points: {
          win: 3,
          loss: 0,
        },
        tie_breakers: ["points", "head_to_head", "game_diff", "point_diff"],
      },
      submissions: {
        allow_participant_submission: true,
        require_opponent_confirmation: true,
      },
      attendance: DEFAULT_CHECKIN_RULES,
    };
  }

  return {
    sport: "tennis",
    schedule: {
      cadence: "weekly",
      starts_on: startDate || null,
      starts_at_local: startTime || null,
      season_weeks: seasonWeeks,
    },
    match: {
      mode,
      doubles_partner_mode: doublesPartnerMode,
      fixed_pairs: doublesPartnerMode === "fixed_pairs" ? [] : null,
      scoring_input: "set_by_set",
      best_of_sets: 3,
      tiebreak_at_games: 6,
    },
    standings: {
      points: {
        win: 3,
        loss: 0,
      },
      tie_breakers: ["points", "head_to_head", "set_diff", "game_diff"],
    },
    submissions: {
      allow_participant_submission: true,
      require_opponent_confirmation: true,
    },
    attendance: DEFAULT_CHECKIN_RULES,
  };
}
