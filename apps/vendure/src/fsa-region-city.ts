/**
 * Canadian FSA (Forward Sortation Area) first-letter to province and display label.
 * First letter of a Canadian postal code identifies the province/region (Canada Post).
 * Used to fill city/region when seeding postal_code_zone.
 */
const FSA_FIRST_LETTER_REGION: Record<string, string> = {
  A: "Newfoundland and Labrador",
  B: "Nova Scotia",
  C: "Prince Edward Island",
  E: "New Brunswick",
  G: "Quebec",
  H: "Quebec",
  J: "Quebec",
  K: "Ontario",
  L: "Ontario",
  M: "Ontario",
  N: "Ontario",
  P: "Ontario",
  R: "Manitoba",
  S: "Saskatchewan",
  T: "Alberta",
  V: "British Columbia",
  X: "Northwest Territories and Nunavut",
  Y: "Yukon",
};

/** Subregion or area label for display as "city" when no specific city is stored. */
const FSA_FIRST_LETTER_CITY_LABEL: Record<string, string> = {
  A: "Newfoundland and Labrador",
  B: "Nova Scotia",
  C: "Prince Edward Island",
  E: "New Brunswick",
  G: "Eastern Quebec",
  H: "Metropolitan Montréal",
  J: "Western Quebec",
  K: "Eastern Ontario",
  L: "Central Ontario",
  M: "Metropolitan Toronto",
  N: "Southwestern Ontario",
  P: "Northern Ontario",
  R: "Manitoba",
  S: "Saskatchewan",
  T: "Alberta",
  V: "British Columbia",
  X: "Northern Canada",
  Y: "Yukon",
};

export function getRegionForFsa(prefix: string): string {
  if (!prefix || prefix.length < 1) return "";
  const letter = prefix[0].toUpperCase();
  return FSA_FIRST_LETTER_REGION[letter] ?? "";
}

export function getCityLabelForFsa(prefix: string): string {
  if (!prefix || prefix.length < 1) return "";
  const letter = prefix[0].toUpperCase();
  return FSA_FIRST_LETTER_CITY_LABEL[letter] ?? FSA_FIRST_LETTER_REGION[letter] ?? "";
}
