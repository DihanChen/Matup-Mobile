/**
 * Generate a display name for a court.
 *
 * If the court has a proper name, return it as-is.
 * If the name is "Public Court" (generic OSM fallback), derive a better name
 * from the address and sport types.
 */
export function getCourtDisplayName(
  name: string,
  address: string,
  sportTypes: string[]
): string {
  if (name !== "Public Court") return name;

  const sportLabel = formatSportLabel(sportTypes);

  // Try to extract a street name from the address
  // Address formats: "Street, City, State" or "Public Court, OpenStreetMap"
  const parts = address.split(",").map((p) => p.trim());
  const street = parts[0];

  if (street && street !== "Public Court" && street !== "OpenStreetMap") {
    return `${sportLabel} Courts on ${street}`;
  }

  return `${sportLabel} Court`;
}

function formatSportLabel(sportTypes: string[]): string {
  if (sportTypes.length === 0) return "Public";
  const primary = sportTypes[0];
  return primary.charAt(0).toUpperCase() + primary.slice(1);
}
