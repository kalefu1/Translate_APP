import type { ModelProfile, StoredModelProfile } from "../types";
import { isTauri } from "./platform";

const PROFILE_KEY = "yijie.model-profiles.v1";
const DEFAULT_KEY = "yijie.default-model.v1";
const WEB_SECRET_PREFIX = "yijie.api-key.";

function safeParseProfiles(raw: string | null): StoredModelProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function invokeTauri<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

async function readSecret(profile: StoredModelProfile): Promise<string> {
  if (isTauri()) {
    try {
      return (await invokeTauri<string | null>("get_api_key", { profileId: profile.id })) ?? "";
    } catch {
      return "";
    }
  }
  return (
    (profile.rememberKey ? localStorage.getItem(WEB_SECRET_PREFIX + profile.id) : null) ??
    sessionStorage.getItem(WEB_SECRET_PREFIX + profile.id) ??
    ""
  );
}

export async function loadProfiles(): Promise<ModelProfile[]> {
  const stored = safeParseProfiles(localStorage.getItem(PROFILE_KEY));
  return Promise.all(stored.map(async (profile) => ({ ...profile, apiKey: await readSecret(profile) })));
}

export async function saveProfiles(profiles: ModelProfile[]): Promise<void> {
  const metadata: StoredModelProfile[] = profiles.map(({ apiKey: _apiKey, ...profile }) => profile);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(metadata));

  await Promise.all(profiles.map(async (profile) => {
    if (isTauri()) {
      if (profile.apiKey) await invokeTauri("store_api_key", { profileId: profile.id, apiKey: profile.apiKey });
      return;
    }
    const key = WEB_SECRET_PREFIX + profile.id;
    if (profile.rememberKey) {
      localStorage.setItem(key, profile.apiKey);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, profile.apiKey);
      localStorage.removeItem(key);
    }
  }));
}

export async function removeProfileSecret(id: string): Promise<void> {
  if (isTauri()) {
    await invokeTauri("delete_api_key", { profileId: id }).catch(() => undefined);
  } else {
    localStorage.removeItem(WEB_SECRET_PREFIX + id);
    sessionStorage.removeItem(WEB_SECRET_PREFIX + id);
  }
}

export function loadDefaultProfileId(): string {
  return localStorage.getItem(DEFAULT_KEY) ?? "";
}

export function saveDefaultProfileId(id: string): void {
  localStorage.setItem(DEFAULT_KEY, id);
}
