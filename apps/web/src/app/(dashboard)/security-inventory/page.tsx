"use client";

import { FormEvent, useEffect, useState } from "react";
import { PatchSeverity } from "@patch-management/shared";
import { apiClient, ApiError } from "@/lib/api";
import styles from "./security-inventory.module.css";

type RiskDevice = {
  id: string;
  hostname: string;
  department: string | null;
  status: string;
};

type RiskItem = {
  id: string;
  code: string;
  title: string;
  severity: PatchSeverity;
  releasedAt: string;
  requiresRestart: boolean;
  targetVersion: string | null;
  affectedDeviceCount: number;
  affectedDevices: RiskDevice[];
  software: {
    id: string;
    name: string;
    vendor: string;
    currentVersion: string | null;
  };
};

type RiskResponse = {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    affectedDevices: number;
  };
  items: RiskItem[];
};

const severityOptions = ["", ...Object.values(PatchSeverity)] as const;

export default function SecurityInventoryPage() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [data, setData] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRisks(nextQuery = query, nextSeverity = severity) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextSeverity) params.set("severity", nextSeverity);

    try {
      const result = await apiClient<RiskResponse>(
        `/security-inventory${params.toString() ? `?${params}` : ""}`,
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể tải dữ liệu rủi ro.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRisks();
  }, []);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRisks();
  }

  function resetFilters() {
    setQuery("");
    setSeverity("");
    void loadRisks("", "");
  }

  return (
    <main className={`${styles.page} page`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SECURITY INVENTORY</p>
          <h1>Security Inventory</h1>
          <p>Phân tích rủi ro bản vá theo severity và CVE-lite.</p>
        </div>
        <button className={styles.refresh} onClick={() => void loadRisks()}>
          Làm mới
        </button>
      </header>

      <section className={styles.panel}>
        <h2>Bộ lọc rủi ro</h2>
        <form className={styles.filters} onSubmit={submitFilters}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã CVE, tiêu đề hoặc phần mềm..."
          />
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {severityOptions.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "Tất cả mức độ"}
              </option>
            ))}
          </select>
          <button className={styles.primary} type="submit">
            Áp dụng
          </button>
          <button type="button" onClick={resetFilters}>
            Đặt lại
          </button>
        </form>
      </section>

      {loading && <div className={styles.state}>Đang tải dữ liệu...</div>}

      {!loading && error && (
        <div className={styles.error}>
          <b>Tải dữ liệu thất bại</b>
          <p>{error}</p>
          <button onClick={() => void loadRisks()}>Thử lại</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <section className={styles.summary} aria-label="Tổng quan rủi ro">
            <article><span>Tổng bản vá</span><strong>{data.summary.total}</strong></article>
            <article className={styles.summaryCritical}><span>Critical</span><strong>{data.summary.critical}</strong></article>
            <article className={styles.summaryHigh}><span>High</span><strong>{data.summary.high}</strong></article>
            <article className={styles.summaryMedium}><span>Medium</span><strong>{data.summary.medium}</strong></article>
            <article className={styles.summaryDevices}><span>Thiết bị ảnh hưởng</span><strong>{data.summary.affectedDevices}</strong></article>
          </section>

          {data.items.length === 0 ? (
            <div className={styles.state}>Không có dữ liệu rủi ro phù hợp.</div>
          ) : (
            <section className={styles.panel}>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>MÃ CVE / BẢN VÁ</th>
                      <th>TIÊU ĐỀ</th>
                      <th>PHẦN MỀM</th>
                      <th>MỨC ĐỘ</th>
                      <th>PHIÊN BẢN ĐÍCH</th>
                      <th>THIẾT BỊ ẢNH HƯỞNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td><b>{item.code}</b></td>
                        <td>{item.title}</td>
                        <td>{item.software.name}<small>{item.software.vendor}</small></td>
                        <td><span className={`${styles.severity} ${styles[item.severity.toLowerCase()]}`}>{item.severity}</span></td>
                        <td>{item.targetVersion ?? "Chưa xác định"}</td>
                        <td>
                          <b>{item.affectedDeviceCount}</b>
                          {item.affectedDevices.length > 0 && (
                            <small>{item.affectedDevices.map((device) => device.hostname).join(", ")}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
