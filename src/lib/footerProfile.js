export const FOOTER_PROFILE_STORAGE_PREFIX = "thiago_footer_profile";

export const DEFAULT_FOOTER_PROFILE = {
  name: "THIAGO IAZZETTI",
  cref: "",
  description:
    "Personal trainer especializado em musculação e transformação corporal.",
  story: "",
};

export function getFooterProfileStorageKey(tenantId = "default") {
  return `${FOOTER_PROFILE_STORAGE_PREFIX}_${tenantId || "default"}`;
}

export function loadFooterProfile(tenantId) {
  try {
    const saved = localStorage.getItem(getFooterProfileStorageKey(tenantId));
    if (!saved) return DEFAULT_FOOTER_PROFILE;
    return {
      ...DEFAULT_FOOTER_PROFILE,
      ...JSON.parse(saved),
    };
  } catch {
    return DEFAULT_FOOTER_PROFILE;
  }
}

export function saveFooterProfile(tenantId, profile) {
  const nextProfile = {
    ...DEFAULT_FOOTER_PROFILE,
    ...profile,
  };
  localStorage.setItem(
    getFooterProfileStorageKey(tenantId),
    JSON.stringify(nextProfile),
  );
  return nextProfile;
}
