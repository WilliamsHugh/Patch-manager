import { DeviceStatus, PatchSeverity, PlanStatus, PrismaClient, Role, TicketStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const accountData = [
    ["admin@example.com", "System Admin", Role.ADMIN], ["manager@example.com", "IT Manager", Role.MANAGER],
    ["helpdesk@example.com", "IT Helpdesk", Role.IT_HELPDESK], ["user@example.com", "Sample User", Role.USER],
  ] as const;
  const users = await Promise.all(accountData.map(([email, name, role]) => prisma.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash } })));
  const [admin, manager, helpdesk, user] = users;

  const chrome = await prisma.software.upsert({ where: { name_vendor: { name: "Google Chrome", vendor: "Google" } }, update: {}, create: { name: "Google Chrome", vendor: "Google", currentVersion: "128.0.6613" } });
  const office = await prisma.software.upsert({ where: { name_vendor: { name: "Microsoft Office", vendor: "Microsoft" } }, update: {}, create: { name: "Microsoft Office", vendor: "Microsoft", currentVersion: "2024" } });
  const windows = await prisma.software.upsert({ where: { name_vendor: { name: "Windows OS", vendor: "Microsoft" } }, update: {}, create: { name: "Windows OS", vendor: "Microsoft", currentVersion: "11 24H2" } });
  const patches = await Promise.all([
    prisma.patch.upsert({ where: { code: "CVE-2026-2115" }, update: {}, create: { code: "CVE-2026-2115", title: "Chrome security update", severity: PatchSeverity.CRITICAL, releasedAt: new Date("2026-08-20"), softwareId: chrome.id } }),
    prisma.patch.upsert({ where: { code: "MS26-0824" }, update: {}, create: { code: "MS26-0824", title: "Office security update", severity: PatchSeverity.HIGH, releasedAt: new Date("2026-08-18"), softwareId: office.id } }),
    prisma.patch.upsert({ where: { code: "KB5034441" }, update: {}, create: { code: "KB5034441", title: "Windows recovery update", severity: PatchSeverity.MEDIUM, releasedAt: new Date("2026-08-12"), requiresRestart: true, softwareId: windows.id } }),
  ]);
  const devices = await Promise.all([
    prisma.device.upsert({ where: { hostname: "ACC-PC-012" }, update: {}, create: { hostname: "ACC-PC-012", operatingSystem: "Windows 11 Pro", department: "Kế toán", status: DeviceStatus.NEEDS_ATTENTION, ownerId: user.id } }),
    prisma.device.upsert({ where: { hostname: "DEV-WS-028" }, update: {}, create: { hostname: "DEV-WS-028", operatingSystem: "Windows 11 Pro", department: "Kỹ thuật", status: DeviceStatus.ONLINE, ownerId: helpdesk.id } }),
    prisma.device.upsert({ where: { hostname: "SRV-APP-01" }, update: {}, create: { hostname: "SRV-APP-01", operatingSystem: "Ubuntu 22.04 LTS", department: "IT", status: DeviceStatus.ONLINE, ownerId: admin.id } }),
  ]);
  const existingPlan = await prisma.deploymentPlan.findFirst({ where: { name: "Cập nhật Windows tháng 8" } });
  if (!existingPlan) await prisma.deploymentPlan.create({ data: { name: "Cập nhật Windows tháng 8", description: "Triển khai bản vá cho phòng Kế toán", status: PlanStatus.PENDING_APPROVAL, scheduledAt: new Date("2026-09-10T14:00:00Z"), createdById: helpdesk.id, devices: { create: devices.slice(0, 2).map(device => ({ deviceId: device.id })) }, tasks: { create: devices.slice(0, 2).map(device => ({ deviceId: device.id, patchId: patches[2].id })) } } });
  const existingTicket = await prisma.ticket.findFirst({ where: { title: "Không thể cài bản vá Windows" } });
  if (!existingTicket) await prisma.ticket.create({ data: { title: "Không thể cài bản vá Windows", description: "Thiết bị báo lỗi khi khởi động lại.", status: TicketStatus.OPEN, priority: PatchSeverity.HIGH, createdById: user.id, assignedToId: helpdesk.id } });
  await prisma.policy.upsert({ where: { name: "Chính sách cập nhật mặc định" }, update: {}, create: { name: "Chính sách cập nhật mặc định", maxDeferralHours: 24, configuredById: admin.id } });
  console.log("Seed hoàn tất: 4 users, 3 software, 3 patches, 3 devices, 1 plan, 1 ticket.");
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
