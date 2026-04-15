export function formatShortAddress(fullAddress: string): string {
  if (!fullAddress) return "";

  const parts = fullAddress.split(",").map((part) => part.trim());

  if (parts.length <= 3) {
    return fullAddress;
  }

  const firstPart = parts[0];

  const skipTerms = ["county", "city of", "region", "district"];

  const meaningfulParts = parts.slice(1, -1).filter((part) => {
    const lower = part.toLowerCase();
    if (/\d/.test(part)) return false;
    if (skipTerms.some((term) => lower.includes(term))) return false;
    if (part.length < 3) return false;
    return true;
  });

  const locationContext = meaningfulParts.slice(-2);

  if (locationContext.length >= 2) {
    return `${firstPart}, ${locationContext.join(", ")}`;
  } else if (locationContext.length === 1) {
    return `${firstPart}, ${locationContext[0]}`;
  } else {
    return `${firstPart}, ${parts[parts.length - 2]}`;
  }
}
