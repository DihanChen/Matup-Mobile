export type ScoringFormat =
  | "team_vs_team"
  | "individual_time"
  | "individual_points"
  | "singles"
  | "doubles";

export type Standing = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalDifference: number;
  totalTime: number;
  totalPoints: number;
  streak?: number;
  form?: Array<"W" | "L" | "D">;
  previousRank?: number | null;
};

export type TeamStanding = {
  team_key: string;
  player_ids: string[];
  player_names: string[];
  rank: number;
  played: number;
  wins: number;
  losses: number;
  winPct: number;
};
