"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

type Profile = {
  display_name: string;
  bio: string;
  institution: string;
  country: string;
  learning_level: string;
  email: string;
  preferences: Record<string, unknown>;
};

type ProfileContextType = {
  profile: Profile | null;
  loading: boolean;
  displayName: string;
  preferences: Record<string, unknown>;
  refreshProfile: () => Promise<void>;
};

const defaultProfile: Profile = {
  display_name: "", bio: "", institution: "", country: "",
  learning_level: "beginner", email: "", preferences: {},
};

const ProfileContext = createContext<ProfileContextType>({
  profile: null, loading: true, displayName: "", preferences: {},
  refreshProfile: async () => {},
});

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${BACKEND}/settings/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const p = data.profile || {};
        setProfile({
          display_name: p.display_name || user.email?.split("@")[0] || "",
          bio: p.bio || "",
          institution: p.institution || "",
          country: p.country || "",
          learning_level: p.learning_level || "beginner",
          email: user.email || "",
          preferences: p.preferences || {},
        });
      } else {
        setProfile({ ...defaultProfile, email: user.email || "", display_name: user.email?.split("@")[0] || "" });
      }
    } catch {
      setProfile({ ...defaultProfile, email: user.email || "", display_name: user.email?.split("@")[0] || "" });
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{
      profile, loading,
      displayName: profile?.display_name || user?.email?.split("@")[0] || "Student",
      preferences: profile?.preferences || {},
      refreshProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
