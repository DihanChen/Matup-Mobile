import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/LoadingSkeleton";

type PublicProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, bio, created_at")
        .eq("id", id)
        .single();
      setProfile(data as PublicProfile | null);
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, padding: 16 }}>
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
          <Skeleton width={140} height={20} style={{ marginBottom: 8 }} />
          <Skeleton width={200} height={14} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Header */}
      <View style={{ paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24 }}>
        <Avatar name={profile.name} avatarUrl={profile.avatar_url} size={80} />
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.text, marginTop: 12 }}>
          {profile.name || "Anonymous"}
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
          Joined {joinDate}
        </Text>
        {profile.bio && (
          <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 12, textAlign: "center", lineHeight: 20 }}>
            {profile.bio}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
