export const sportEmojis: Record<string, string> = {
  running: "\u{1F3C3}",
  tennis: "\u{1F3BE}",
  pickleball: "\u{1F3D3}",
  cycling: "\u{1F6B4}",
  gym: "\u{1F4AA}",
  yoga: "\u{1F9D8}",
  basketball: "\u{1F3C0}",
  soccer: "\u26BD",
  swimming: "\u{1F3CA}",
  hiking: "\u{1F97E}",
  golf: "\u26F3",
  volleyball: "\u{1F3D0}",
  baseball: "\u26BE",
  football: "\u{1F3C8}",
  hockey: "\u{1F3D2}",
  skiing: "\u26F7\uFE0F",
  snowboarding: "\u{1F3C2}",
  surfing: "\u{1F3C4}",
  boxing: "\u{1F94A}",
  martial_arts: "\u{1F94B}",
  climbing: "\u{1F9D7}",
  rowing: "\u{1F6A3}",
  badminton: "\u{1F3F8}",
  table_tennis: "\u{1F3D3}",
  skateboarding: "\u{1F6F9}",
  dance: "\u{1F483}",
  pilates: "\u{1F938}",
  crossfit: "\u{1F3CB}\uFE0F",
  other: "\u{1F3AF}",
};

export function getSportEmoji(sportType: string): string {
  const normalized = sportType.toLowerCase().replace(/\s+/g, "_");
  return sportEmojis[normalized] || "\u{1F3AF}";
}
