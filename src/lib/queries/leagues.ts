import { SupabaseClient } from "@supabase/supabase-js";

type ProfileRow = {
  is_premium: boolean | null;
};

type MembershipRow = {
  league_id: string;
  role: string;
};

type LeagueRow = {
  id: string;
  name: string;
  sport_type: string;
  scoring_format: string;
  league_type: string;
  status: string;
  max_members: number;
  created_at: string;
  creator_id: string;
  season_weeks?: number | null;
  start_date?: string | null;
};

type LeagueMemberRow = {
  league_id: string;
};

export type LeagueWithCount = LeagueRow & {
  member_count: number;
};

export async function getLeagueListData(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  isPremium: boolean;
  ownedLeagues: LeagueWithCount[];
  joinedLeagues: LeagueWithCount[];
}> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", userId)
    .single<ProfileRow>();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, role")
    .eq("user_id", userId)
    .returns<MembershipRow[]>();

  if (!memberships || memberships.length === 0) {
    return {
      isPremium: profile?.is_premium ?? false,
      ownedLeagues: [],
      joinedLeagues: [],
    };
  }

  const leagueIds = memberships.map((membership) => membership.league_id);
  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .in("id", leagueIds)
    .order("created_at", { ascending: false })
    .returns<LeagueRow[]>();

  if (!leagues || leagues.length === 0) {
    return {
      isPremium: profile?.is_premium ?? false,
      ownedLeagues: [],
      joinedLeagues: [],
    };
  }

  const { data: allMembers } = await supabase
    .from("league_members")
    .select("league_id")
    .in("league_id", leagueIds)
    .returns<LeagueMemberRow[]>();

  const countMap: Record<string, number> = {};
  allMembers?.forEach((member) => {
    countMap[member.league_id] = (countMap[member.league_id] || 0) + 1;
  });

  const leaguesWithCount: LeagueWithCount[] = leagues.map((league) => ({
    ...league,
    member_count: countMap[league.id] || 0,
  }));

  return {
    isPremium: profile?.is_premium ?? false,
    ownedLeagues: leaguesWithCount.filter((league) => league.creator_id === userId),
    joinedLeagues: leaguesWithCount.filter((league) => league.creator_id !== userId),
  };
}
