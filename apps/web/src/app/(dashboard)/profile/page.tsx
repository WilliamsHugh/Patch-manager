"use client";

import { useEffect, useState } from "react";
import type { Device, User } from "@patch-management/shared";
import { apiClient } from "@/lib/api";

type Profile = User & { devices?: Device[] };

const roleLabels: Record<User["role"], string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  IT_HELPDESK: "IT Helpdesk",
  SECURITY_ANALYST: "Security Analyst",
  USER: "User",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient<Profile>("/users/me")
      .then(setProfile)
      .catch(error => setError(error instanceof Error ? error.message : "Unable to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const initials = profile?.name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase() ?? "—";
  return <section className="profilePage" aria-busy={loading}>
    {error && <div className="profileNotice" role="alert">Unable to sync the latest data: {error}</div>}
    <div className="profileHero"><span className="profileAvatar">{initials}</span><div><h2>{profile?.name ?? "Account details"}</h2><p>{profile?.email ?? (loading ? "Loading profile..." : "Profile unavailable.")}</p>{profile && <span>{roleLabels[profile.role]}</span>}</div></div>
    <div className="profileGrid">
      <article className="profileCard"><h3>Account information</h3><dl><div><dt>Full name</dt><dd>{profile?.name ?? "—"}</dd></div><div><dt>Email</dt><dd>{profile?.email ?? "—"}</dd></div><div><dt>Role</dt><dd>{profile ? roleLabels[profile.role] : "—"}</dd></div><div><dt>Account ID</dt><dd>{profile?.id ?? "—"}</dd></div></dl></article>
      <article className="profileCard"><h3>Assigned devices</h3>{loading ? <p className="profileEmpty" role="status">Loading devices...</p> : profile?.devices?.length ? <ul className="profileDevices">{profile.devices.map(device => <li key={device.id}><div><b>{device.hostname}</b><small>{device.operatingSystem}</small></div><span className={`deviceState ${device.status.toLowerCase()}`}>{device.status}</span></li>)}</ul> : <p className="profileEmpty">{profile ? "No devices are assigned to this account." : "Device information unavailable."}</p>}</article>
    </div>
  </section>;
}
