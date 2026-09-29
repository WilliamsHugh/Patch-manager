<<<<<<< HEAD
import { ModulePlaceholder } from "@/components/ui/module-placeholder"; export default function Page(){return <ModulePlaceholder title="Devices" description="Find devices, owners, and agent status." fields={["HOSTNAME","OWNER","OPERATING SYSTEM","STATUS"]}/>}
=======
"use client";

import styles from "./devices.module.css";
import { FormEvent, useEffect, useState } from "react";
import { Role } from "@patch-management/shared";
import { ApiError, apiClient } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type InstalledSoftware = {
  id: string;
  version: string;
  installedAt?: string | null;
  software: {
    id: string;
    name: string;
    vendor: string;
    currentVersion?: string | null;
  };
};

type MissingPatch = {
  patchId: string;
  patchCode: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  releasedAt: string;
  requiresRestart: boolean;
  softwareId: string;
  softwareName: string;
  vendor: string;
  installedVersion: string;
  currentVersion: string;
};

type ComplianceResult = {
  deviceId: string;
  hostname: string;
  totalMissing: number;
  missingPatches: MissingPatch[];
};

type AgentStatus = {
  id: string;
  version: string;
  isConnected: boolean;
  lastHeartbeatAt: string | null;
  lastScanAt: string | null;
};

type Device = {
  id: string;
  hostname: string;
  operatingSystem: string;
  ipAddress?: string | null;
  department?: string | null;
  status: "ONLINE" | "OFFLINE" | "NEEDS_ATTENTION";

  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;

  installedSoftware?: InstalledSoftware[];

  agentStatus?: AgentStatus | null;
};

type DeviceForm = {
  hostname: string;
  operatingSystem: string;
  ipAddress: string;
  department: string;
  status: Device["status"];
  ownerId: string;
};

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;

const emptyForm: DeviceForm = {
  hostname: "",
  operatingSystem: "",
  ipAddress: "",
  department: "",
  status: "OFFLINE",
  ownerId: "",
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  const [compliance, setCompliance] =
    useState<ComplianceResult | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState("");

  const [form, setForm] = useState<DeviceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getStoredUser()?.role === Role.ADMIN);
    void loadDevices();

    const timer = window.setInterval(() => {
      void loadDevices();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);
  async function loadDevices(search = query) {
    setLoading(true);
    setError("");

    try {
      const currentUser = getStoredUser();
      const isNormalUser = currentUser?.role === Role.USER;

      const path = isNormalUser
        ? "/devices/me"
        : search.trim()
          ? `/devices?q=${encodeURIComponent(search.trim())}`
          : "/devices";

      const data = await apiClient<Device[]>(path);

      if (isNormalUser && search.trim()) {
        const keyword = search.trim().toLowerCase();

        setDevices(
          data.filter((device) =>
            `${device.hostname} ${device.operatingSystem} ${
              device.department ?? ""
            } ${device.ipAddress ?? ""}`
              .toLowerCase()
              .includes(keyword),
          ),
        );
      } else {
        setDevices(data);
        if (
          selected &&
          !data.some(
            (device) => device.id == selected.id
          )
        ){
          setSelected(null);
          setCompliance(null);
          setComplianceError("");

        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể tải danh sách thiết bị.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectDevice(device: Device) {
    setSelected(device);
    setCompliance(null);
    setComplianceError("");

    const currentUser = getStoredUser();

    if (currentUser?.role === Role.USER) {
      return;
    }

    setComplianceLoading(true);

    try {
      const result = await apiClient<ComplianceResult>(
        `/devices/${device.id}/compliance`,
      );

      setCompliance(result);
    } catch (err) {
      setComplianceError(
        err instanceof ApiError
          ? err.message
          : "Không thể tải thông tin bản vá còn thiếu.",
      );
    } finally {
      setComplianceLoading(false);
    }
  }

  function startCreate() {
    if (!isAdmin) return;

    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function startEdit(device: Device) {
    if (!isAdmin) return;

    setEditingId(device.id);
    setForm({
      hostname: device.hostname,
      operatingSystem: device.operatingSystem,
      ipAddress: device.ipAddress ?? "",
      department: device.department ?? "",
      status: device.status,
      ownerId: device.owner?.id ?? "",
    });
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) return;

    setSaving(true);
    setFormError("");

    try {
      const body = JSON.stringify({
        hostname: form.hostname,
        operatingSystem: form.operatingSystem,
        ipAddress: form.ipAddress || undefined,
        department: form.department || undefined,
        status: form.status,
        ownerId: form.ownerId || undefined,
      });

      if (editingId) {
        await apiClient(`/devices/${editingId}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiClient("/devices", {
          method: "POST",
          body,
        });
      }

      setEditingId(null);
      setForm(emptyForm);
      await loadDevices();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Không thể lưu thiết bị.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeDevice(device: Device) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa thiết bị "${device.hostname}" không?`,
    );

    if (!confirmed) return;

    try {
      await apiClient(`/devices/${device.id}`, {
        method: "DELETE",
      });

      if (selected?.id === device.id) {
        setSelected(null);
        setCompliance(null);
      }

      await loadDevices();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không thể xóa thiết bị.",
      );
    }
  }

  function statusLabel(status: Device["status"]) {
    if (status === "ONLINE") return "Online";
    if (status === "NEEDS_ATTENTION") return "Needs attention";
    return "Offline";
  }

  function softwareIsUpToDate(item: InstalledSoftware) {
    return (
      Boolean(item.software.currentVersion) &&
      item.version === item.software.currentVersion
    );
  }

  return (
    <main className={`${styles.devicesPage} page`}>
      <div className="pageHeader">
        <div>
          <p className="eyebrow">INVENTORY</p>
          <h1>Devices</h1>
          <p>Tra cứu thiết bị, người sở hữu và trạng thái agent.</p>
        </div>

        {isAdmin && (
          <button className="primary" onClick={startCreate}>
            + Tạo mới
          </button>
        )}
      </div>

      <section className="panel">
        <form
          className="tableTools"
          onSubmit={(event) => {
            event.preventDefault();
            void loadDevices();
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm hostname, người dùng, phòng ban hoặc IP..."
          />

          <button className="primary" type="submit">
            Tìm kiếm
          </button>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelected(null);
              setCompliance(null);
              setComplianceError("");
              void loadDevices("");

            }}
          >
            Đặt lại
          </button>
        </form>

        {error && (
          <div className="infoBox">
            <b>Lỗi</b>
            <p>{error}</p>
          </div>
        )}

        {loading && <div className="empty">Đang tải dữ liệu...</div>}

        {!loading && !error && devices.length === 0 && (
          <div className="empty">Không tìm thấy thiết bị.</div>
        )}

        {!loading && !error && devices.length > 0 && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>HOSTNAME</th>
                  <th>NGƯỜI DÙNG</th>
                  <th>PHÒNG BAN</th>
                  <th>HỆ ĐIỀU HÀNH</th>
                  <th>IP</th>
                  <th>TRẠNG THÁI</th>
                  <th>AGENT</th>
                  <th>HEARTBEAT</th>
                  {isAdmin && <th>THAO TÁC</th>}
                </tr>
              </thead>

              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => void selectDevice(device)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <b>{device.hostname}</b>
                    </td>
                    <td>{device.owner?.name ?? "Chưa gán"}</td>
                    <td>{device.department ?? "—"}</td>
                    <td>{device.operatingSystem}</td>
                    <td>{device.ipAddress ?? "—"}</td>
                    <td>
                      <span
                        className={`deviceState ${device.status.toLowerCase()}`}
                      >
                        {statusLabel(device.status)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`deviceState ${
                          getAgentState(device.agentStatus) === "CONNECTED"
                            ? "online"
                            : "offline"
                        }`}
                      >
                        {formatAgentState(
                          getAgentState(device.agentStatus),
                        )}
                      </span>
                    </td>

                    <td>
                      {device.agentStatus?.lastHeartbeatAt
                        ? new Date(
                            device.agentStatus.lastHeartbeatAt,
                          ).toLocaleString("vi-VN")
                        : "—"}
                    </td>

                    {isAdmin && (
                      <td onClick={(event) => event.stopPropagation()}>
                        <button onClick={() => startEdit(device)}>Sửa</button>
                        <button onClick={() => void removeDevice(device)}>
                          Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(isAdmin || selected) && (
        <section className="panel">
          {isAdmin && (
            <form onSubmit={submit}>
              <h2>{editingId ? "Sửa thiết bị" : "Thêm thiết bị"}</h2>

              {formError && <div className="infoBox">{formError}</div>}

              <label>
                Hostname
                <input
                  value={form.hostname}
                  onChange={(event) =>
                    setForm({ ...form, hostname: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Hệ điều hành
                <input
                  value={form.operatingSystem}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      operatingSystem: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Địa chỉ IP
                <input
                  value={form.ipAddress}
                  onChange={(event) =>
                    setForm({ ...form, ipAddress: event.target.value })
                  }
                />
              </label>

              <label>
                Phòng ban
                <input
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                />
              </label>

              <label>
                Trạng thái
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as Device["status"],
                    })
                  }
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="NEEDS_ATTENTION">
                    Needs attention
                  </option>
                </select>
              </label>

              <label>
                Owner ID
                <input
                  value={form.ownerId}
                  onChange={(event) =>
                    setForm({ ...form, ownerId: event.target.value })
                  }
                  placeholder="UUID người sở hữu, có thể bỏ trống"
                />
              </label>

              <button className="primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thiết bị"}
              </button>
            </form>
          )}
        </section>
      )}

      {selected && (
        <section className="panel">
          <h2>Chi tiết thiết bị</h2>

          <p>
            <b>Hostname:</b> {selected.hostname}
          </p>
          <p>
            <b>Người dùng:</b> {selected.owner?.name ?? "Chưa gán"}
          </p>
          <p>
            <b>Hệ điều hành:</b> {selected.operatingSystem}
          </p>
          <p>
            <b>Phòng ban:</b> {selected.department ?? "—"}
          </p>
          <p>
            <b>Địa chỉ IP:</b> {selected.ipAddress ?? "—"}
          </p>
          <p>
            <b>Trạng thái:</b> {statusLabel(selected.status)}
          </p>

          <p>
            <b>Agent:</b>{" "}
            {formatAgentState(
              getAgentState(selected.agentStatus),
            )}
          </p>

          <p>
            <b>Agent version:</b>{" "}
            {selected.agentStatus?.version ?? "—"}
          </p>

          <p>
            <b>Last heartbeat:</b>{" "}
            {selected.agentStatus?.lastHeartbeatAt
              ? new Date(
                  selected.agentStatus.lastHeartbeatAt,
                ).toLocaleString("vi-VN")
              : "—"}
          </p>

          <p>
            <b>Last scan:</b>{" "}
            {selected.agentStatus?.lastScanAt
              ? new Date(
                  selected.agentStatus.lastScanAt,
                ).toLocaleString("vi-VN")
              : "—"}
          </p>

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <h3>Phần mềm đã cài đặt</h3>

            {!selected.installedSoftware?.length ? (
              <p>Thiết bị chưa có dữ liệu phần mềm.</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>PHẦN MỀM</th>
                      <th>VENDOR</th>
                      <th>PHIÊN BẢN ĐANG CÀI</th>
                      <th>PHIÊN BẢN HIỆN TẠI</th>
                      <th>ĐỐI CHIẾU</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selected.installedSoftware.map((item) => {
                      const upToDate = softwareIsUpToDate(item);

                      return (
                        <tr key={item.id}>
                          <td>{item.software.name}</td>
                          <td>{item.software.vendor}</td>
                          <td>{item.version}</td>
                          <td>{item.software.currentVersion ?? "—"}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: upToDate
                                  ? "#dcfce7"
                                  : "#fee2e2",
                                color: upToDate ? "#166534" : "#b91c1c",
                                fontSize: 12,
                              }}
                            >
                              {upToDate ? "Up to date" : "Needs update"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <h3>Bản vá còn thiếu</h3>

            {complianceLoading && <p>Đang kiểm tra bản vá...</p>}

            {complianceError && (
              <div className="infoBox">
                <b>Lỗi</b>
                <p>{complianceError}</p>
              </div>
            )}

            {!complianceLoading &&
              !complianceError &&
              compliance &&
              compliance.missingPatches.length === 0 && (
                <p style={{ color: "#166534" }}>
                  Thiết bị đã đầy đủ bản vá.
                </p>
              )}

            {!complianceLoading &&
              !complianceError &&
              compliance &&
              compliance.missingPatches.length > 0 && (
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PHẦN MỀM</th>
                        <th>PHIÊN BẢN ĐANG CÀI</th>
                        <th>PHIÊN BẢN HIỆN TẠI</th>
                        <th>MÃ BẢN VÁ</th>
                        <th>MỨC ĐỘ</th>
                        <th>KHỞI ĐỘNG LẠI</th>
                      </tr>
                    </thead>

                    <tbody>
                      {compliance.missingPatches.map((patch) => (
                        <tr key={patch.patchId}>
                          <td>
                            <b>{patch.softwareName}</b>
                            <br />
                            <small>{patch.vendor}</small>
                          </td>

                          <td>{patch.installedVersion}</td>
                          <td>{patch.currentVersion}</td>

                          <td>
                            <b>{patch.patchCode}</b>
                            <br />
                            <small>{patch.title}</small>
                          </td>

                          <td>
                            <span
                              style={{
                                color:
                                  patch.severity === "CRITICAL"
                                    ? "#b91c1c"
                                    : patch.severity === "HIGH"
                                      ? "#c2410c"
                                      : "#92400e",
                                fontWeight: 600,
                              }}
                            >
                              {patch.severity}
                            </span>
                          </td>

                          <td>
                            {patch.requiresRestart ? "Có" : "Không"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </section>
      )}
    </main>
  );
  }

function getAgentState(
  agentStatus: AgentStatus | null | undefined,
) {
  if (!agentStatus) {
    return "NOT_INSTALLED" as const;
  }

  if (!agentStatus.isConnected || !agentStatus.lastHeartbeatAt) {
    return "OFFLINE" as const;
  }

  const heartbeatTime = new Date(
    agentStatus.lastHeartbeatAt,
  ).getTime();

  if (Number.isNaN(heartbeatTime)) {
    return "OFFLINE" as const;
  }

  return Date.now() - heartbeatTime <= HEARTBEAT_TIMEOUT_MS
    ? ("CONNECTED" as const)
    : ("OFFLINE" as const);
}

function formatAgentState(
  state: ReturnType<typeof getAgentState>,
) {
  if (state === "CONNECTED") return "Connected";
  if (state === "NOT_INSTALLED") return "Chưa cài";
  return "Offline";
}
>>>>>>> feature/security-risk-inventory
