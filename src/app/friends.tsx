import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui";

type FriendUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};

type FriendEntry = {
  friendship: Friendship;
  user: FriendUser;
};

type SearchUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type RelationshipStatus = "none" | "friends" | "sent" | "received";

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendEntry[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendEntry[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(false);

    try {
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!friendships || friendships.length === 0) {
      setLoading(false);
      return;
    }

    const otherUserIds = friendships.map((f: Friendship) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", otherUserIds);

    const profileMap: Record<string, FriendUser> = {};
    profiles?.forEach((p: FriendUser) => {
      profileMap[p.id] = p;
    });

    const accepted: FriendEntry[] = [];
    const received: FriendEntry[] = [];
    const sent: FriendEntry[] = [];

    friendships.forEach((f: Friendship) => {
      const otherId =
        f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const entry: FriendEntry = {
        friendship: f,
        user: profileMap[otherId] || {
          id: otherId,
          name: null,
          avatar_url: null,
        },
      };

      if (f.status === "accepted") {
        accepted.push(entry);
      } else if (f.status === "pending") {
        if (f.addressee_id === user.id) {
          received.push(entry);
        } else {
          sent.push(entry);
        }
      }
    });

    setFriends(accepted);
    setReceivedRequests(received);
    setSentRequests(sent);
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

  function getRelationshipStatus(userId: string): RelationshipStatus {
    if (friends.some((f) => f.user.id === userId)) return "friends";
    if (sentRequests.some((f) => f.user.id === userId)) return "sent";
    if (receivedRequests.some((f) => f.user.id === userId)) return "received";
    return "none";
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .ilike("name", `%${text.trim()}%`)
        .neq("id", user?.id || "")
        .limit(12);
      setSearchResults((data as SearchUser[]) || []);
      setSearching(false);
    }, 300);
  }

  async function handleSendRequest(targetUser: SearchUser) {
    if (!user) return;
    setActionLoading(targetUser.id);
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetUser.id,
      status: "pending",
    });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSentRequests((prev) => [
        {
          friendship: {
            id: "",
            requester_id: user.id,
            addressee_id: targetUser.id,
            status: "pending",
            created_at: new Date().toISOString(),
          },
          user: targetUser,
        },
        ...prev,
      ]);
    }
    setActionLoading(null);
  }

  async function handleAccept(friendshipId: string) {
    setActionLoading(friendshipId);
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    const entry = receivedRequests.find(
      (r) => r.friendship.id === friendshipId
    );
    if (entry) {
      setReceivedRequests((prev) =>
        prev.filter((r) => r.friendship.id !== friendshipId)
      );
      setFriends((prev) => [entry, ...prev]);
    }
    setActionLoading(null);
  }

  async function handleDecline(friendshipId: string) {
    setActionLoading(friendshipId);
    await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", friendshipId);
    setReceivedRequests((prev) =>
      prev.filter((r) => r.friendship.id !== friendshipId)
    );
    setActionLoading(null);
  }

  async function handleRemove(friendshipId: string) {
    Alert.alert("Remove Friend", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setActionLoading(friendshipId);
          await supabase
            .from("friendships")
            .delete()
            .eq("id", friendshipId);
          setFriends((prev) =>
            prev.filter((f) => f.friendship.id !== friendshipId)
          );
          setActionLoading(null);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <PageHeader title="Friends" onBack={() => router.back()} />
        <View style={{ padding: 16, paddingTop: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={60}
              borderRadius={12}
              style={{ marginBottom: 10 }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <PageHeader title="Friends" onBack={() => router.back()} />

      <FlatList
        data={[]}
        renderItem={null}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
        ListHeaderComponent={
          <>
            {/* Error state */}
            {error && (
              <View
                style={{
                  backgroundColor: Colors.errorBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.errorBorder,
                  padding: 16,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={24}
                  color={Colors.error}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={{
                    color: Colors.textSecondary,
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  Could not load friends. Pull down to retry.
                </Text>
              </View>
            )}

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: Colors.border,
                paddingHorizontal: 12,
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="search"
                size={16}
                color={Colors.textTertiary}
              />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search people..."
                placeholderTextColor={Colors.textTertiary}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  fontSize: 14,
                  color: Colors.text,
                }}
              />
              {searching && (
                <ActivityIndicator size="small" color={Colors.accent} />
              )}
            </View>

            {/* Search results */}
            {searchResults.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: Colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Search Results
                </Text>
                {searchResults.map((person) => {
                  const status = getRelationshipStatus(person.id);
                  return (
                    <View
                      key={person.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.borderLight,
                        gap: 10,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          router.push(`/users/${person.id}` as never)
                        }
                        activeOpacity={0.7}
                      >
                        <Avatar
                          name={person.name}
                          avatarUrl={person.avatar_url}
                          size={40}
                        />
                      </TouchableOpacity>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: "600",
                          color: Colors.text,
                        }}
                      >
                        {person.name || "Anonymous"}
                      </Text>
                      {status === "none" ? (
                        <TouchableOpacity
                          onPress={() => handleSendRequest(person)}
                          disabled={actionLoading === person.id}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: Colors.accent,
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={{
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            Add
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={{
                            fontSize: 12,
                            color: Colors.textSecondary,
                            textTransform: "capitalize",
                          }}
                        >
                          {status}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Received requests */}
            {receivedRequests.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: Colors.text,
                    }}
                  >
                    Friend Requests
                  </Text>
                  <View
                    style={{
                      backgroundColor: Colors.accent,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {receivedRequests.length}
                    </Text>
                  </View>
                </View>
                {receivedRequests.map((entry) => (
                  <View
                    key={entry.friendship.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.borderLight,
                      gap: 10,
                    }}
                  >
                    <Avatar
                      name={entry.user.name}
                      avatarUrl={entry.user.avatar_url}
                      size={40}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: "600",
                        color: Colors.text,
                      }}
                    >
                      {entry.user.name || "Anonymous"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleAccept(entry.friendship.id)}
                      disabled={actionLoading === entry.friendship.id}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: Colors.success,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Accept
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDecline(entry.friendship.id)}
                      disabled={actionLoading === entry.friendship.id}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: Colors.surface,
                        borderWidth: 1,
                        borderColor: Colors.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          color: Colors.textSecondary,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Friends list */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: Colors.text,
                marginBottom: 8,
              }}
            >
              Friends ({friends.length})
            </Text>
            {friends.length === 0 && (
              <EmptyState
                compact
                title="No friends yet"
                description="Use search above to find people and send a friend request."
                icon={
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                }
              />
            )}
            {friends.map((entry) => (
              <TouchableOpacity
                key={entry.friendship.id}
                onPress={() =>
                  router.push(`/users/${entry.user.id}` as never)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.borderLight,
                  gap: 10,
                }}
                activeOpacity={0.7}
              >
                <Avatar
                  name={entry.user.name}
                  avatarUrl={entry.user.avatar_url}
                  size={40}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: "600",
                    color: Colors.text,
                  }}
                >
                  {entry.user.name || "Anonymous"}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(entry.friendship.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* Sent requests */}
            {sentRequests.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: Colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Sent Requests ({sentRequests.length})
                </Text>
                {sentRequests.map((entry) => (
                  <View
                    key={entry.friendship.id || entry.user.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.borderLight,
                      gap: 10,
                    }}
                  >
                    <Avatar
                      name={entry.user.name}
                      avatarUrl={entry.user.avatar_url}
                      size={36}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: Colors.text,
                      }}
                    >
                      {entry.user.name || "Anonymous"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: Colors.textTertiary,
                      }}
                    >
                      Pending
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        }
      />
    </View>
  );
}
