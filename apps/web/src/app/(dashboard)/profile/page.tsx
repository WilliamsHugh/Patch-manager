"use client";

import { useEffect, useState } from "react";
import type { Device, User } from "@patch-management/shared";
import { apiClient } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type Profile = User & { devices?: Device[] };

const roleLabels: Record<User["role"], string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  IT_HELPDESK: "IT Helpdesk",
  SECURITY_ANALYST: "Chuyên viên phân tích bảo mật",
  USER: "Người dùng",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient<Profile>("/users/me")
      .then(setProfile)
      .catch(error => setError(error instanceof Error ? error.message : "Không thể tải hồ sơ."))
      .finally(() => setLoading(false));
  }, []);

  if (!profile) return <section className="profilePanel"><p>{loading ? "Đang tải hồ sơ..." : error}</p></section>;

  const initials = profile.name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase();
  return <section className="profilePage">
    {error && <div className="profileNotice">Không thể đồng bộ dữ liệu mới nhất: {error}</div>}
    <div className="profileHero"><span className="profileAvatar">{initials}</span><div><h2>{profile.name}</h2><p>{profile.email}</p><span>{roleLabels[profile.role]}</span></div></div>
    <div className="profileGrid">
      <article className="profileCard"><h3>Thông tin tài khoản</h3><dl><div><dt>Họ và tên</dt><dd>{profile.name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Vai trò</dt><dd>{roleLabels[profile.role]}</dd></div><div><dt>Mã tài khoản</dt><dd>{profile.id}</dd></div></dl></article>
      <article className="profileCard"><h3>Thiết bị được giao</h3>{loading ? <p>Đang tải thiết bị...</p> : profile.devices?.length ? <ul className="profileDevices">{profile.devices.map(device => <li key={device.id}><div><b>{device.hostname}</b><small>{device.operatingSystem}</small></div><span className={`deviceState ${device.status.toLowerCase()}`}>{device.status}</span></li>)}</ul> : <p className="profileEmpty">Tài khoản chưa được gán thiết bị.</p>}</article>
    </div>
  </section>;
}
