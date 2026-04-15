export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
}

/**
 * Short display form of a person's name for compact UI rows
 * ("Alexandra Johnson" → "Alexandr… J.", "Beyoncé" → "Beyoncé").
 *
 * - null / empty → "Player"
 * - single word → that word (no trailing period)
 * - multi-word → firstName + " " + lastInitial + "."
 * - firstName longer than 10 chars → truncated with a single-char ellipsis
 */
export function formatDisplayName(name: string | null): string {
  if (!name) return "Player";
  const trimmed = name.trim();
  if (!trimmed) return "Player";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  let firstName = parts[0] ?? "";

  if (firstName.length > 10) {
    firstName = `${firstName.slice(0, 10)}…`;
  }

  if (parts.length <= 1) {
    return firstName;
  }

  const lastWord = parts[parts.length - 1];
  const lastInitial = lastWord.charAt(0);
  return `${firstName} ${lastInitial}.`;
}
