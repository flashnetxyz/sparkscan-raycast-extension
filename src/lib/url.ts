export const addRaycastUTM = (baseUrl: string, campaign = "extension"): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "raycast");
  url.searchParams.set("utm_medium", "sparkscan-raycast-extension");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
};
