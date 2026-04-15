import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_GALLERY_IMAGES = 9;

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  gallery_urls: string[];
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, bio, gallery_urls")
        .eq("id", user.id)
        .single();

      if (data) {
        setName(data.name || user.user_metadata?.name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || null);
        setGalleryUrls(data.gallery_urls || []);
      } else {
        setName(user.user_metadata?.name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  async function handleAvatarUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE) {
      Alert.alert("Error", "Image must be under 2MB.");
      return;
    }

    setUploadingAvatar(true);

    const ext = asset.uri.split(".").pop() || "jpg";
    const fileName = `${user!.id}.${ext}`;
    const formData = new FormData();
    formData.append("file", {
      uri: asset.uri,
      name: fileName,
      type: asset.mimeType || "image/jpeg",
    } as unknown as Blob);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, formData, { upsert: true });

    if (uploadError) {
      Alert.alert("Error", uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(newUrl);
    setUploadingAvatar(false);
  }

  async function handleGalleryUpload() {
    const remaining = MAX_GALLERY_IMAGES - galleryUrls.length;
    if (remaining <= 0) {
      Alert.alert("Limit Reached", `Maximum ${MAX_GALLERY_IMAGES} gallery images.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: Math.min(4, remaining),
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploadingGallery(true);

    const newUrls: string[] = [];
    for (let i = 0; i < result.assets.length; i++) {
      const asset = result.assets[i];
      const ext = asset.uri.split(".").pop() || "jpg";
      const fileName = `${user!.id}/gallery/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: fileName.split("/").pop(),
        type: asset.mimeType || "image/jpeg",
      } as unknown as Blob);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, formData);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        newUrls.push(urlData.publicUrl);
      }
    }

    setGalleryUrls((prev) => [...prev, ...newUrls]);
    setUploadingGallery(false);
  }

  function handleRemoveGalleryImage(index: number) {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    setSaving(true);

    // Update auth metadata
    await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        gallery_urls: galleryUrls,
      },
    });

    // Update profiles table
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        name: name.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim() || null,
        gallery_urls: galleryUrls,
      },
      { onConflict: "id" }
    );

    setSaving(false);
    Alert.alert("Saved", "Profile updated successfully.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <PageHeader title="Edit Profile" onBack={() => router.back()} />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.white }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHeader
        title="Edit Profile"
        onBack={() => router.back()}
        rightSlot={
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: saving ? Colors.textMuted : Colors.accent,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
            activeOpacity={0.7}
            style={{ position: "relative" }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: Colors.surface,
                }}
              />
            ) : (
              <Avatar name={name} avatarUrl={null} size={96} />
            )}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Colors.accent,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: Colors.white,
              }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={16} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 12,
              color: Colors.textSecondary,
              marginTop: 8,
            }}
          >
            Tap to change photo
          </Text>
        </View>

        {/* Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Display Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={Colors.textTertiary}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: Colors.text,
            backgroundColor: Colors.surface,
            marginBottom: 16,
          }}
        />

        {/* Bio */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Bio
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell others about yourself..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: Colors.text,
            backgroundColor: Colors.surface,
            minHeight: 90,
            marginBottom: 24,
          }}
        />

        {/* Gallery */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}
          >
            Gallery ({galleryUrls.length}/{MAX_GALLERY_IMAGES})
          </Text>
          {galleryUrls.length < MAX_GALLERY_IMAGES && (
            <TouchableOpacity
              onPress={handleGalleryUpload}
              disabled={uploadingGallery}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              activeOpacity={0.7}
            >
              {uploadingGallery ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Ionicons name="add" size={16} color={Colors.text} />
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: Colors.text,
                }}
              >
                Add Photos
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {galleryUrls.map((url, index) => (
            <View key={index} style={{ position: "relative" }}>
              <Image
                source={{ uri: url }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  backgroundColor: Colors.surface,
                }}
              />
              <TouchableOpacity
                onPress={() => handleRemoveGalleryImage(index)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: Colors.error,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
