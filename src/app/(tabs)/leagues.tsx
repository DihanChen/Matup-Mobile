import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { getLeagueListData, type LeagueWithCount } from "@/lib/queries/leagues";
import { FORMAT_LABELS } from "@/lib/league-types";
import { SPORT_ICON_MAP } from "@/constants/events";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState, ErrorState } from "@/components/ui";

type ViewFilter = "all" | "owned" | "joined";

export default function LeaguesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [ownedLeagues, setOwnedLeagues] = useState<LeagueWithCount[]>([]);
  const [joinedLeagues, setJoinedLeagues] = useState<LeagueWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(false);
    try {
      const data = await getLeagueListData(supabase, user.id);
      setOwnedLeagues(data.ownedLeagues);
      setJoinedLeagues(data.joinedLeagues);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const allLeagues = useMemo(() => {
    return [...ownedLeagues, ...joinedLeagues].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [ownedLeagues, joinedLeagues]);

  const filteredLeagues = useMemo(() => {
    let leagues =
      viewFilter === "owned"
        ? ownedLeagues
        : viewFilter === "joined"
          ? joinedLeagues
          : allLeagues;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      leagues = leagues.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.sport_type.toLowerCase().includes(q) ||
          (l.scoring_format && l.scoring_format.toLowerCase().includes(q))
      );
    }

    return leagues;
  }, [allLeagues, ownedLeagues, joinedLeagues, viewFilter, searchQuery]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, padding: 16 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            width="100%"
            height={120}
            borderRadius={16}
            style={{ marginBottom: 12 }}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Action buttons */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/leagues/join" as never)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="enter-outline" size={16} color={Colors.text} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>
            Join by Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/leagues/create" as never)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: Colors.accent,
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text
            style={{ fontSize: 13, fontWeight: "700", color: Colors.white }}
          >
            Create League
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.border,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search leagues..."
            placeholderTextColor={Colors.textTertiary}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              fontSize: 14,
              color: Colors.text,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        {(
          [
            { key: "all", label: `All (${allLeagues.length})` },
            { key: "owned", label: `Owned (${ownedLeagues.length})` },
            { key: "joined", label: `Joined (${joinedLeagues.length})` },
          ] as const
        ).map((chip) => {
          const isActive = viewFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setViewFilter(chip.key)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: isActive ? Colors.primary : Colors.surface,
                borderWidth: 1,
                borderColor: isActive ? Colors.primary : Colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: isActive ? Colors.white : Colors.text,
                }}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* League list */}
      <FlatList
        data={filteredLeagues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
        ListEmptyComponent={
          error ? (
            <ErrorState
              title="Couldn't load leagues"
              description="We hit a snag pulling your leagues. Pull down to retry."
              onRetry={onRefresh}
            />
          ) : (
            <EmptyState
              title={searchQuery ? "No matches" : "No leagues yet"}
              description={
                searchQuery
                  ? "Try a different search or clear the filter."
                  : "Create a league or join one to get started."
              }
              icon={
                <Ionicons
                  name="trophy-outline"
                  size={28}
                  color={Colors.textTertiary}
                />
              }
            />
          )
        }
        renderItem={({ item }) => (
          <LeagueCard
            league={item}
            isOwned={item.creator_id === user?.id}
            onPress={() => router.push(`/leagues/${item.id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

function LeagueCard({
  league,
  isOwned,
  onPress,
}: {
  league: LeagueWithCount;
  isOwned: boolean;
  onPress: () => void;
}) {
  const formatLabel =
    FORMAT_LABELS[league.scoring_format] || league.scoring_format;

  const seasonInfo =
    league.season_weeks && league.start_date
      ? `${league.season_weeks} week season`
      : "Open";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1, marginRight: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: Colors.accent + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={SPORT_ICON_MAP[league.sport_type] ?? "fitness-outline"}
              size={16}
              color={Colors.accent}
            />
          </View>
          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: "700", color: Colors.text, flex: 1 }}
          >
            {league.name}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: isOwned ? "#fef3c7" : Colors.surface,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: isOwned ? "#92400e" : Colors.textSecondary,
            }}
          >
            {isOwned ? "Owner" : "Member"}
          </Text>
        </View>
      </View>

      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        <Badge
          label={league.sport_type}
          color={Colors.accent}
          textColor={Colors.white}
        />
        <Badge label={formatLabel} color="#3b82f6" textColor={Colors.white} />
        {league.status !== "active" && (
          <Badge
            label={league.status}
            color={Colors.surface}
            textColor={Colors.textSecondary}
          />
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons
            name="people-outline"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            {league.member_count}/{league.max_members}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            {seasonInfo}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Badge({
  label,
  color,
  textColor,
}: {
  label: string;
  color: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: color,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: textColor,
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
