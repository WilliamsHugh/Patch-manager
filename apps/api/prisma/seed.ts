import "dotenv/config";
import {
  DeviceStatus,
  NotificationStatus,
  PatchSeverity,
  PlanStatus,
  PrismaClient,
  Role,
  TaskStatus,
  TicketStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { resolvePrismaDatabaseUrl } from "../src/prisma/prisma-url";

const url = resolvePrismaDatabaseUrl(process.env.DATABASE_URL);

const prisma = new PrismaClient(
  url
    ? {
        datasources: {
          db: { url },
        },
      }
    : undefined,
);

async function main() {
  const accountData = [
    ["admin@example.com", "System Admin", Role.ADMIN],
    ["manager@example.com", "IT Manager", Role.MANAGER],
    ["helpdesk@example.com", "IT Helpdesk", Role.IT_HELPDESK],
    ["security@example.com", "Security Analyst", Role.SECURITY_ANALYST],
    ["user@example.com", "Sample User", Role.USER],
    ["linh.nguyen@example.com", "Nguyễn Thị Linh", Role.USER],
    ["minh.tran@example.com", "Trần Văn Minh", Role.USER],
  ] as const;

  const users = await Promise.all(
    accountData.map(async ([email, name, role]) => {
      const passwordHash = await bcrypt.hash("password123", 10);
      return prisma.user.upsert({
        where: { email },
        update: { name, role, passwordHash, isActive: true },
        create: { email, name, role, passwordHash, isActive: true },
      });
    }),
  );

  const [admin, manager, helpdesk, security, user, linh, minh] = users;

  // Software catalog
  const softwareSpecs = [
    { name: "Google Chrome", vendor: "Google", currentVersion: "130.0.6723.91" },
    { name: "Microsoft Edge", vendor: "Microsoft", currentVersion: "130.0.2849.56" },
    { name: "Microsoft Office 365", vendor: "Microsoft", currentVersion: "2410" },
    { name: "Windows 11", vendor: "Microsoft", currentVersion: "24H2" },
    { name: "Ubuntu Linux Kernel", vendor: "Canonical", currentVersion: "6.8.0-48" },
    { name: "OpenSSL", vendor: "OpenSSL Project", currentVersion: "3.0.15" },
    { name: "Node.js LTS", vendor: "OpenJS Foundation", currentVersion: "22.11.0" },
    { name: "7-Zip", vendor: "Igor Pavlov", currentVersion: "24.08" },
  ] as const;

  const softwareList = await Promise.all(
    softwareSpecs.map((item) =>
      prisma.software.upsert({
        where: { name_vendor: { name: item.name, vendor: item.vendor } },
        update: { currentVersion: item.currentVersion },
        create: item,
      }),
    ),
  );

  const [chrome, edge, office, windows, ubuntuKernel, openssl, nodejs, sevenZip] =
    softwareList;

  // Patches
  const patchSpecs = [
    {
      code: "CVE-2026-2115",
      title: "Chrome V8 Type Confusion Security Fix",
      description: "Vá lỗ hổng thực thi mã từ xa nghiêm trọng trong engine V8.",
      version: "130.0.6723.91",
      severity: PatchSeverity.CRITICAL,
      releasedAt: new Date("2026-11-18T00:00:00Z"),
      requiresRestart: false,
      softwareId: chrome.id,
    },
    {
      code: "CVE-2026-1980",
      title: "Chrome Blink Memory Corruption Patch",
      description: "Khắc phục lỗi tràn bộ đệm khi xử lý DOM phức tạp.",
      version: "130.0.6723.70",
      severity: PatchSeverity.HIGH,
      releasedAt: new Date("2026-11-05T00:00:00Z"),
      requiresRestart: false,
      softwareId: chrome.id,
    },
    {
      code: "MS26-1102",
      title: "Microsoft Edge Chromium Security Update",
      description: "Cập nhật bảo mật tổng hợp cho trình duyệt Edge.",
      version: "130.0.2849.56",
      severity: PatchSeverity.HIGH,
      releasedAt: new Date("2026-11-14T00:00:00Z"),
      requiresRestart: false,
      softwareId: edge.id,
    },
    {
      code: "MS26-0824",
      title: "Microsoft Office Macro & RCE Security Update",
      description: "Ngăn chặn thực thi macro độc hại qua tài liệu Word/Excel.",
      version: "2410",
      severity: PatchSeverity.HIGH,
      releasedAt: new Date("2026-11-12T00:00:00Z"),
      requiresRestart: false,
      softwareId: office.id,
    },
    {
      code: "MS26-1011",
      title: "Office Outlook Attachment Preview Fix",
      description: "Sửa lỗi hiển thị tệp đính kèm và nâng cao bảo mật Outlook.",
      version: "2409",
      severity: PatchSeverity.MEDIUM,
      releasedAt: new Date("2026-10-20T00:00:00Z"),
      requiresRestart: false,
      softwareId: office.id,
    },
    {
      code: "KB5046617",
      title: "Windows 11 24H2 Cumulative Security Update",
      description: "Bản vá tích lũy tháng 11 cho nhân Windows và dịch vụ mạng.",
      version: "24H2-build-26100.2314",
      severity: PatchSeverity.CRITICAL,
      releasedAt: new Date("2026-11-12T00:00:00Z"),
      requiresRestart: true,
      softwareId: windows.id,
    },
    {
      code: "KB5034441",
      title: "Windows Recovery Environment Update",
      description: "Cập nhật phân vùng khôi phục hệ thống WinRE.",
      version: "24H2-winre",
      severity: PatchSeverity.MEDIUM,
      releasedAt: new Date("2026-10-15T00:00:00Z"),
      requiresRestart: true,
      softwareId: windows.id,
    },
    {
      code: "USN-7088-1",
      title: "Ubuntu Kernel Privilege Escalation Fix",
      description: "Vá lỗi leo thang đặc quyền cục bộ trong Linux kernel.",
      version: "6.8.0-48",
      severity: PatchSeverity.CRITICAL,
      releasedAt: new Date("2026-11-19T00:00:00Z"),
      requiresRestart: true,
      softwareId: ubuntuKernel.id,
    },
    {
      code: "CVE-2026-3310",
      title: "OpenSSL TLS Handshake DoS Patch",
      description: "Khắc phục lỗi từ chối dịch vụ trong quá trình bắt tay TLS 1.3.",
      version: "3.0.15",
      severity: PatchSeverity.HIGH,
      releasedAt: new Date("2026-11-10T00:00:00Z"),
      requiresRestart: true,
      softwareId: openssl.id,
    },
    {
      code: "NODE-2026-11",
      title: "Node.js 22 LTS HTTP/2 Stability & Security",
      description: "Cập nhật bảo mật HTTP/2 và sửa lỗi rò rỉ bộ nhớ stream.",
      version: "22.11.0",
      severity: PatchSeverity.MEDIUM,
      releasedAt: new Date("2026-11-08T00:00:00Z"),
      requiresRestart: false,
      softwareId: nodejs.id,
    },
    {
      code: "CVE-2026-4102",
      title: "7-Zip Archive Parsing Integer Overflow",
      description: "Vá lỗi tràn số nguyên khi giải nén định dạng Zstandard.",
      version: "24.08",
      severity: PatchSeverity.HIGH,
      releasedAt: new Date("2026-11-16T00:00:00Z"),
      requiresRestart: false,
      softwareId: sevenZip.id,
    },
    {
      code: "KB5044284",
      title: "Windows Defender Definition & UI Update",
      description: "Cải thiện hiệu năng quét thời gian thực và giao diện.",
      version: "24H2-def",
      severity: PatchSeverity.LOW,
      releasedAt: new Date("2026-11-01T00:00:00Z"),
      requiresRestart: false,
      softwareId: windows.id,
    },
  ];

  const patches = await Promise.all(
    patchSpecs.map((p) =>
      prisma.patch.upsert({
        where: { code: p.code },
        update: {
          title: p.title,
          description: p.description,
          version: p.version,
          severity: p.severity,
          releasedAt: p.releasedAt,
          requiresRestart: p.requiresRestart,
          softwareId: p.softwareId,
        },
        create: p,
      }),
    ),
  );

  // Devices
  const deviceSpecs = [
    {
      hostname: "ACC-PC-012",
      operatingSystem: "Windows 11 Pro",
      ipAddress: "10.10.20.12",
      department: "Kế toán",
      status: DeviceStatus.NEEDS_ATTENTION,
      ownerId: user.id,
    },
    {
      hostname: "ACC-PC-015",
      operatingSystem: "Windows 11 Pro",
      ipAddress: "10.10.20.15",
      department: "Kế toán",
      status: DeviceStatus.ONLINE,
      ownerId: linh.id,
    },
    {
      hostname: "DEV-WS-028",
      operatingSystem: "Windows 11 Pro",
      ipAddress: "10.10.30.28",
      department: "Kỹ thuật",
      status: DeviceStatus.ONLINE,
      ownerId: helpdesk.id,
    },
    {
      hostname: "DEV-WS-031",
      operatingSystem: "Windows 11 Enterprise",
      ipAddress: "10.10.30.31",
      department: "Kỹ thuật",
      status: DeviceStatus.NEEDS_ATTENTION,
      ownerId: minh.id,
    },
    {
      hostname: "HR-LT-004",
      operatingSystem: "Windows 11 Pro",
      ipAddress: "10.10.40.4",
      department: "Nhân sự",
      status: DeviceStatus.OFFLINE,
      ownerId: linh.id,
    },
    {
      hostname: "SAL-LT-019",
      operatingSystem: "Windows 11 Home",
      ipAddress: "10.10.50.19",
      department: "Kinh doanh",
      status: DeviceStatus.NEEDS_ATTENTION,
      ownerId: user.id,
    },
    {
      hostname: "SRV-APP-01",
      operatingSystem: "Ubuntu 22.04 LTS",
      ipAddress: "10.10.10.11",
      department: "IT",
      status: DeviceStatus.ONLINE,
      ownerId: admin.id,
    },
    {
      hostname: "SRV-DB-02",
      operatingSystem: "Ubuntu 24.04 LTS",
      ipAddress: "10.10.10.12",
      department: "IT",
      status: DeviceStatus.ONLINE,
      ownerId: admin.id,
    },
    {
      hostname: "SRV-SEC-01",
      operatingSystem: "Windows Server 2022",
      ipAddress: "10.10.10.21",
      department: "IT",
      status: DeviceStatus.NEEDS_ATTENTION,
      ownerId: security.id,
    },
    {
      hostname: "OPS-WS-007",
      operatingSystem: "Windows 11 Pro",
      ipAddress: "10.10.60.7",
      department: "Vận hành",
      status: DeviceStatus.ONLINE,
      ownerId: minh.id,
    },
  ];

  const devices = await Promise.all(
    deviceSpecs.map((d) =>
      prisma.device.upsert({
        where: { hostname: d.hostname },
        update: {
          operatingSystem: d.operatingSystem,
          ipAddress: d.ipAddress,
          department: d.department,
          status: d.status,
          ownerId: d.ownerId,
        },
        create: d,
      }),
    ),
  );

  const [
    accPc012,
    accPc015,
    devWs028,
    devWs031,
    hrLt004,
    salLt019,
    srvApp01,
    srvDb02,
    srvSec01,
    opsWs007,
  ] = devices;

  // Installed Software across devices
  const installedSpecs = [
    [accPc012.id, chrome.id, "128.0.6613", "2026-09-01"],
    [accPc012.id, office.id, "2408", "2026-08-15"],
    [accPc012.id, windows.id, "23H2", "2026-07-10"],
    [accPc012.id, sevenZip.id, "23.01", "2026-06-05"],

    [accPc015.id, chrome.id, "130.0.6723.91", "2026-11-20"],
    [accPc015.id, office.id, "2410", "2026-11-15"],
    [accPc015.id, windows.id, "24H2", "2026-11-15"],

    [devWs028.id, chrome.id, "130.0.6723.91", "2026-11-19"],
    [devWs028.id, edge.id, "130.0.2849.56", "2026-11-16"],
    [devWs028.id, windows.id, "24H2", "2026-11-14"],
    [devWs028.id, nodejs.id, "22.11.0", "2026-11-10"],

    [devWs031.id, chrome.id, "129.0.6668.89", "2026-10-12"],
    [devWs031.id, windows.id, "23H2", "2026-09-20"],
    [devWs031.id, nodejs.id, "20.17.0", "2026-09-05"],
    [devWs031.id, sevenZip.id, "24.06", "2026-08-22"],

    [hrLt004.id, chrome.id, "129.0.6668.58", "2026-10-01"],
    [hrLt004.id, office.id, "2409", "2026-10-18"],
    [hrLt004.id, windows.id, "24H2", "2026-10-20"],

    [salLt019.id, edge.id, "129.0.2792.89", "2026-10-11"],
    [salLt019.id, office.id, "2408", "2026-09-12"],
    [salLt019.id, windows.id, "23H2", "2026-08-30"],

    [srvApp01.id, ubuntuKernel.id, "6.8.0-48", "2026-11-21"],
    [srvApp01.id, openssl.id, "3.0.15", "2026-11-12"],
    [srvApp01.id, nodejs.id, "22.11.0", "2026-11-10"],

    [srvDb02.id, ubuntuKernel.id, "6.8.0-45", "2026-10-28"],
    [srvDb02.id, openssl.id, "3.0.13", "2026-09-15"],

    [srvSec01.id, windows.id, "24H2", "2026-11-01"],
    [srvSec01.id, openssl.id, "3.0.14", "2026-10-10"],

    [opsWs007.id, chrome.id, "130.0.6723.91", "2026-11-20"],
    [opsWs007.id, sevenZip.id, "24.08", "2026-11-18"],
  ] as const;

  await Promise.all(
    installedSpecs.map(([deviceId, softwareId, version, dateStr]) =>
      prisma.installedSoftware.upsert({
        where: { deviceId_softwareId: { deviceId, softwareId } },
        update: { version, installedAt: new Date(dateStr) },
        create: { deviceId, softwareId, version, installedAt: new Date(dateStr) },
      }),
    ),
  );

  // Agent Statuses
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);

  const agentStatuses = [
    {
      deviceId: accPc012.id,
      version: "1.4.2",
      isConnected: true,
      lastHeartbeatAt: minsAgo(2),
      lastScanAt: minsAgo(15),
      lastScanResult: {
        scanId: "scan-acc-012-01",
        outcome: "COMPLETED",
        completedAt: minsAgo(15).toISOString(),
        missingPatchesCount: 3,
        installedCount: 4,
      },
    },
    {
      deviceId: accPc015.id,
      version: "1.4.2",
      isConnected: true,
      lastHeartbeatAt: minsAgo(1),
      lastScanAt: hoursAgo(2),
      lastScanResult: {
        scanId: "scan-acc-015-01",
        outcome: "COMPLETED",
        completedAt: hoursAgo(2).toISOString(),
        missingPatchesCount: 0,
        installedCount: 3,
      },
    },
    {
      deviceId: devWs028.id,
      version: "1.4.2",
      isConnected: true,
      lastHeartbeatAt: minsAgo(3),
      lastScanAt: hoursAgo(1),
      lastScanResult: {
        scanId: "scan-dev-028-01",
        outcome: "COMPLETED",
        completedAt: hoursAgo(1).toISOString(),
        missingPatchesCount: 0,
        installedCount: 4,
      },
    },
    {
      deviceId: devWs031.id,
      version: "1.4.0",
      isConnected: true,
      lastHeartbeatAt: minsAgo(5),
      lastScanAt: hoursAgo(4),
      lastScanResult: {
        scanId: "scan-dev-031-01",
        outcome: "COMPLETED",
        completedAt: hoursAgo(4).toISOString(),
        missingPatchesCount: 2,
        installedCount: 4,
      },
    },
    {
      deviceId: hrLt004.id,
      version: "1.3.9",
      isConnected: false,
      lastHeartbeatAt: hoursAgo(36),
      lastScanAt: hoursAgo(48),
      lastScanResult: {
        scanId: "scan-hr-004-01",
        outcome: "COMPLETED",
        completedAt: hoursAgo(48).toISOString(),
        missingPatchesCount: 1,
        installedCount: 3,
      },
    },
    {
      deviceId: srvApp01.id,
      version: "1.4.2",
      isConnected: true,
      lastHeartbeatAt: minsAgo(1),
      lastScanAt: minsAgo(30),
      lastScanResult: {
        scanId: "scan-srv-app-01",
        outcome: "COMPLETED",
        completedAt: minsAgo(30).toISOString(),
        missingPatchesCount: 0,
        installedCount: 3,
      },
    },
  ];

  await Promise.all(
    agentStatuses.map((a) =>
      prisma.agentStatus.upsert({
        where: { deviceId: a.deviceId },
        update: a,
        create: a,
      }),
    ),
  );

  // Deployment Plans & Tasks
  const deploymentPlanSpecs = [
    // 1. PENDING_APPROVAL
    {
      name: "Vá bảo mật Chrome & Windows tháng 11",
      description: "Triển khai bản vá khẩn cấp cho khối Kế toán và Kinh doanh.",
      status: PlanStatus.PENDING_APPROVAL,
      scheduledAt: new Date("2026-11-28T15:00:00Z"),
      createdById: helpdesk.id,
      deviceIds: [accPc012.id, salLt019.id],
      tasks: [
        { deviceId: accPc012.id, patchId: patches[0].id, status: TaskStatus.PENDING },
        { deviceId: accPc012.id, patchId: patches[5].id, status: TaskStatus.PENDING },
        { deviceId: salLt019.id, patchId: patches[2].id, status: TaskStatus.PENDING },
      ],
    },
    // 2. APPROVED (ready to deploy)
    {
      name: "Cập nhật Server Linux & OpenSSL",
      description: "Nâng cấp kernel Ubuntu và OpenSSL trên cụm server nội bộ.",
      status: PlanStatus.APPROVED,
      scheduledAt: new Date("2026-11-26T18:00:00Z"),
      createdById: helpdesk.id,
      reviewedById: manager.id,
      reviewedAt: hoursAgo(6),
      reviewNote: "Đã duyệt lịch bảo trì ngoài giờ hành chính.",
      deviceIds: [srvDb02.id, srvSec01.id],
      tasks: [
        { deviceId: srvDb02.id, patchId: patches[7].id, status: TaskStatus.PENDING },
        { deviceId: srvDb02.id, patchId: patches[8].id, status: TaskStatus.PENDING },
        { deviceId: srvSec01.id, patchId: patches[8].id, status: TaskStatus.PENDING },
      ],
    },
    // 3. DEPLOYING (mixed task statuses including FAILED & WAITING_RESTART)
    {
      name: "Triển khai Office & 7-Zip phòng Kỹ thuật",
      description: "Đang đẩy bản vá cho máy trạm khối kỹ thuật.",
      status: PlanStatus.DEPLOYING,
      scheduledAt: hoursAgo(2),
      createdById: helpdesk.id,
      reviewedById: manager.id,
      reviewedAt: hoursAgo(12),
      reviewNote: "Triển khai theo lô 2 máy.",
      deviceIds: [devWs031.id, opsWs007.id],
      tasks: [
        {
          deviceId: devWs031.id,
          patchId: patches[5].id,
          status: TaskStatus.WAITING_RESTART,
          startedAt: hoursAgo(2),
        },
        {
          deviceId: devWs031.id,
          patchId: patches[10].id,
          status: TaskStatus.FAILED,
          forceFailure: true,
          errorCode: "ERR_FILE_IN_USE",
          errorLog: "7zFM.exe đang chạy nền, không thể ghi đè tệp thực thi.",
          startedAt: hoursAgo(2),
          completedAt: hoursAgo(1),
        },
        {
          deviceId: opsWs007.id,
          patchId: patches[10].id,
          status: TaskStatus.SUCCESS,
          startedAt: hoursAgo(2),
          completedAt: hoursAgo(1),
        },
      ],
    },
    // 4. COMPLETED
    {
      name: "Vá định kỳ Chrome tháng 10",
      description: "Đã hoàn tất cập nhật trình duyệt cho máy trạm chuẩn.",
      status: PlanStatus.COMPLETED,
      scheduledAt: hoursAgo(120),
      createdById: helpdesk.id,
      reviewedById: manager.id,
      reviewedAt: hoursAgo(144),
      reviewNote: "Phê duyệt triển khai tự động.",
      deviceIds: [accPc015.id, devWs028.id],
      tasks: [
        {
          deviceId: accPc015.id,
          patchId: patches[0].id,
          status: TaskStatus.SUCCESS,
          startedAt: hoursAgo(120),
          completedAt: hoursAgo(119),
        },
        {
          deviceId: devWs028.id,
          patchId: patches[0].id,
          status: TaskStatus.SUCCESS,
          startedAt: hoursAgo(120),
          completedAt: hoursAgo(119),
        },
      ],
    },
    // 5. CHANGES_REQUESTED
    {
      name: "Nâng cấp Windows 11 24H2 toàn công ty",
      description: "Kế hoạch nâng cấp diện rộng các máy chưa lên 24H2.",
      status: PlanStatus.CHANGES_REQUESTED,
      scheduledAt: new Date("2026-12-05T13:00:00Z"),
      createdById: helpdesk.id,
      reviewedById: manager.id,
      reviewedAt: hoursAgo(24),
      reviewNote: "Cần chia nhỏ theo từng phòng ban và bổ sung kế hoạch rollback.",
      deviceIds: [accPc012.id, devWs031.id, salLt019.id],
      tasks: [
        { deviceId: accPc012.id, patchId: patches[6].id, status: TaskStatus.PENDING },
        { deviceId: devWs031.id, patchId: patches[6].id, status: TaskStatus.PENDING },
      ],
    },
    // 6. DRAFT
    {
      name: "Bản nháp cập nhật Node.js LTS",
      description: "Chuẩn bị nâng cấp runtime Node.js cho môi trường dev.",
      status: PlanStatus.DRAFT,
      createdById: helpdesk.id,
      deviceIds: [devWs031.id],
      tasks: [{ deviceId: devWs031.id, patchId: patches[9].id, status: TaskStatus.PENDING }],
    },
  ];

  for (const planSpec of deploymentPlanSpecs) {
    const existingPlan = await prisma.deploymentPlan.findFirst({
      where: { name: planSpec.name },
    });

    if (!existingPlan) {
      await prisma.deploymentPlan.create({
        data: {
          name: planSpec.name,
          description: planSpec.description,
          status: planSpec.status,
          scheduledAt: planSpec.scheduledAt,
          createdById: planSpec.createdById,
          reviewedById: planSpec.reviewedById,
          reviewedAt: planSpec.reviewedAt,
          reviewNote: planSpec.reviewNote,
          devices: {
            create: planSpec.deviceIds.map((deviceId) => ({ deviceId })),
          },
          tasks: {
            create: planSpec.tasks,
          },
        },
      });
    } else if (planSpec.name === "Triển khai Office & 7-Zip phòng Kỹ thuật") {
      await prisma.deploymentTask.upsert({
        where: {
          planId_deviceId_patchId: {
            planId: existingPlan.id,
            deviceId: devWs031.id,
            patchId: patches[10].id,
          },
        },
        update: { forceFailure: true },
        create: {
          planId: existingPlan.id,
          deviceId: devWs031.id,
          patchId: patches[10].id,
          status: TaskStatus.FAILED,
          forceFailure: true,
          errorCode: "ERR_FILE_IN_USE",
          errorLog: "7zFM.exe đang chạy nền, không thể ghi đè tệp thực thi.",
          startedAt: hoursAgo(2),
          completedAt: hoursAgo(1),
        },
      });
    }
  }

  // Tickets & Comments
  const ticketSpecs = [
    {
      title: "Không thể cài bản vá Windows KB5046617 trên ACC-PC-012",
      description: "Máy báo lỗi thiếu dung lượng ổ C hoặc yêu cầu khởi động lại nhiều lần.",
      priority: PatchSeverity.HIGH,
      status: TicketStatus.OPEN,
      createdById: user.id,
      assignedToId: helpdesk.id,
      comments: {
        create: [
          {
            content: "Em đã thử restart 2 lần nhưng Windows Update vẫn báo Pending.",
            authorId: user.id,
          },
          {
            content: "IT Helpdesk đã tiếp nhận, sẽ kiểm tra từ xa vào 14:00.",
            authorId: helpdesk.id,
          },
        ],
      },
    },
    {
      title: "Cài đặt 7-Zip 24.08 thất bại do tiến trình đang chạy",
      description: "Agent báo mã lỗi ERR_FILE_IN_USE trên máy DEV-WS-031.",
      priority: PatchSeverity.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      createdById: minh.id,
      assignedToId: helpdesk.id,
      comments: {
        create: [
          {
            content: "Đã yêu cầu người dùng đóng cửa sổ 7-Zip trước khi chạy lại task.",
            authorId: helpdesk.id,
          },
        ],
      },
    },
    {
      title: "Máy HR-LT-004 mất kết nối Agent hơn 1 ngày",
      description: "Nhân viên đi công tác, thiết bị không gửi heartbeat về hệ thống.",
      priority: PatchSeverity.LOW,
      status: TicketStatus.WAITING_USER,
      createdById: security.id,
      assignedToId: helpdesk.id,
      comments: {
        create: [
          {
            content: "Chị Linh vui lòng kết nối VPN công ty để agent đồng bộ trạng thái.",
            authorId: helpdesk.id,
          },
          {
            content: "Ok chiều nay mình về văn phòng sẽ mở máy kết nối mạng nhé.",
            authorId: linh.id,
          },
        ],
      },
    },
    {
      title: "Xác nhận hoàn tất vá lỗ hổng Chrome CVE-2026-2115",
      description: "Kiểm tra lại phiên bản Chrome trên máy ACC-PC-015 sau khi triển khai.",
      priority: PatchSeverity.CRITICAL,
      status: TicketStatus.RESOLVED,
      createdById: linh.id,
      assignedToId: helpdesk.id,
      comments: {
        create: [
          {
            content: "Chrome đã lên 130.0.6723.91, hoạt động bình thường.",
            authorId: linh.id,
          },
        ],
      },
    },
    {
      title: "Yêu cầu bảo trì định kỳ cụm SRV-DB-02",
      description: "Xin lịch downtime 15 phút cuối tuần để cập nhật kernel Ubuntu.",
      priority: PatchSeverity.HIGH,
      status: TicketStatus.CLOSED,
      createdById: admin.id,
      assignedToId: manager.id,
    },
  ];

  for (const ticketSpec of ticketSpecs) {
    const existingTicket = await prisma.ticket.findFirst({
      where: { title: ticketSpec.title },
    });
    if (!existingTicket) {
      await prisma.ticket.create({ data: ticketSpec });
    }
  }

  // Policies
  const policySpecs = [
    {
      name: "Chính sách cập nhật mặc định",
      description: "Áp dụng cho toàn bộ máy trạm văn phòng, cho phép trì hoãn tối đa 24 giờ.",
      autoApproveSeverity: PatchSeverity.LOW,
      maxDeferralHours: 24,
      forceRestart: false,
      isActive: true,
      configuredById: admin.id,
    },
    {
      name: "Chính sách vá khẩn cấp Zero-Day",
      description: "Tự động ưu tiên triển khai các bản vá mức CRITICAL trong vòng 4 giờ.",
      autoApproveSeverity: PatchSeverity.CRITICAL,
      maxDeferralHours: 4,
      forceRestart: true,
      isActive: true,
      configuredById: admin.id,
    },
    {
      name: "Chính sách bảo trì máy chủ",
      description: "Không tự động khởi động lại máy chủ sản xuất nếu chưa có phê duyệt.",
      autoApproveSeverity: null,
      maxDeferralHours: 72,
      forceRestart: false,
      isActive: true,
      configuredById: admin.id,
    },
  ];

  await Promise.all(
    policySpecs.map((p) =>
      prisma.policy.upsert({
        where: { name: p.name },
        update: p,
        create: p,
      }),
    ),
  );

  // Notifications
  const notificationSpecs = [
    {
      title: "Kế hoạch mới chờ duyệt",
      message: "Kế hoạch 'Vá bảo mật Chrome & Windows tháng 11' đang chờ Manager phê duyệt.",
      status: NotificationStatus.UNREAD,
      userId: manager.id,
    },
    {
      title: "Cảnh báo bản vá CRITICAL",
      message: "Phát hiện lỗ hổng CVE-2026-2115 ảnh hưởng tới thiết bị ACC-PC-012.",
      status: NotificationStatus.UNREAD,
      userId: security.id,
    },
    {
      title: "Thiết bị cần khởi động lại",
      message: "Thiết bị DEV-WS-031 đang chờ khởi động lại để hoàn tất cài đặt KB5046617.",
      status: NotificationStatus.UNREAD,
      userId: minh.id,
    },
    {
      title: "Task triển khai thất bại",
      message: "Cài đặt 7-Zip 24.08 trên DEV-WS-031 thất bại (ERR_FILE_IN_USE).",
      status: NotificationStatus.UNREAD,
      userId: helpdesk.id,
    },
    {
      title: "Kế hoạch cần chỉnh sửa",
      message: "Manager đã yêu cầu chỉnh sửa kế hoạch 'Nâng cấp Windows 11 24H2 toàn công ty'.",
      status: NotificationStatus.READ,
      userId: helpdesk.id,
    },
    {
      title: "Thiết bị của bạn cần cập nhật",
      message: "ACC-PC-012 đang thiếu 3 bản vá bảo mật quan trọng.",
      status: NotificationStatus.UNREAD,
      userId: user.id,
    },
  ];

  for (const notificationSpec of notificationSpecs) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: notificationSpec.userId,
        title: notificationSpec.title,
        message: notificationSpec.message,
      },
    });
    if (!existingNotification) {
      await prisma.notification.create({ data: notificationSpec });
    }
  }

  // Audit Logs
  const auditLogSpecs = [
    {
      action: "POLICY_CREATED",
      entityType: "Policy",
      metadata: { route: "/api/policies", name: "Chính sách vá khẩn cấp Zero-Day" },
      userId: admin.id,
      createdAt: hoursAgo(72),
    },
    {
      action: "PLAN_CREATED",
      entityType: "DeploymentPlan",
      metadata: { route: "/api/deployment-plans", name: "Cập nhật Server Linux & OpenSSL" },
      userId: helpdesk.id,
      createdAt: hoursAgo(24),
    },
    {
      action: "PLAN_REVIEWED",
      entityType: "DeploymentPlan",
      metadata: { route: "/api/deployment-plans/review", decision: "APPROVED" },
      userId: manager.id,
      createdAt: hoursAgo(6),
    },
    {
      action: "PLAN_DEPLOY_STARTED",
      entityType: "DeploymentPlan",
      metadata: { route: "/api/deployment-plans/deploy", name: "Triển khai Office & 7-Zip phòng Kỹ thuật" },
      userId: helpdesk.id,
      createdAt: hoursAgo(2),
    },
    {
      action: "TICKET_CREATED",
      entityType: "Ticket",
      metadata: { route: "/api/tickets", priority: "HIGH" },
      userId: user.id,
      createdAt: hoursAgo(1),
    },
  ];

  for (const auditSpec of auditLogSpecs) {
    const existingAudit = await prisma.auditLog.findFirst({
      where: {
        action: auditSpec.action,
        entityType: auditSpec.entityType,
        userId: auditSpec.userId,
      },
    });
    if (!existingAudit) {
      await prisma.auditLog.create({ data: auditSpec });
    }
  }

  console.log(
    "Seed hoàn tất: 7 users, 8 software, 12 patches, 10 devices, 30 installed software records, 6 agent statuses, 6 deployment plans, 5 tickets, 3 policies, 6 notifications, 5 audit logs.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
