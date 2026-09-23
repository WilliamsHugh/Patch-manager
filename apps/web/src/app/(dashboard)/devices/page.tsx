"use client";
import styles from "./devices.module.css";
import { FormEvent, useEffect, useState } from "react";
import { Role } from "@patch-management/shared";
import { ApiError, apiClient } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

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
};

type DeviceForm = {
  hostname: string;
  operatingSystem: string;
  ipAddress: string;
  department: string;
  status: Device["status"];
  ownerId: string;
};

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

      const filtered = data.filter((device) =>
        `${device.hostname} ${device.operatingSystem} ${
          device.department ?? ""
        } ${device.ipAddress ?? ""}`
          .toLowerCase()
          .includes(keyword),
      );

      setDevices(filtered);
    } else {
      setDevices(data);
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
        err instanceof ApiError
          ? err.message
          : "Không thể lưu thiết bị.",
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
      }

      await loadDevices();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể xóa thiết bị.",
      );
    }
  }

  function statusLabel(status: Device["status"]) {
    if (status === "ONLINE") return "Online";
    if (status === "NEEDS_ATTENTION") return "Needs attention";
    return "Offline";
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
                  {isAdmin && <th>THAO TÁC</th>}
                </tr>
              </thead>

              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => setSelected(device)}
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

                    {isAdmin && (
                      <td onClick={(event) => event.stopPropagation()}>
                        <button onClick={() => startEdit(device)}>
                          Sửa
                        </button>

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
        </section>
      )}
    </main>
  );
}