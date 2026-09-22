import { DeviceStatus, PatchSeverity, PlanStatus, PrismaClient, Role, TicketStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { resolvePrismaDatabaseUrl } from "../src/prisma/prisma-url";

const url = resolvePrismaDatabaseUrl(process.env.DATABASE_URL);
const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const accountData = [
    ["admin@example.com", "System Admin", Role.ADMIN], ["manager@example.com", "IT Manager", Role.MANAGER],
    ["helpdesk@example.com", "IT Helpdesk", Role.IT_HELPDESK], ["security@example.com", "Security Analyst", Role.SECURITY_ANALYST],
    ["user@example.com", "Sample User", Role.USER],
  ] as const;
  const users = await Promise.all(accountData.map(([email, name, role]) => prisma.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash } })));
  const [admin, manager, helpdesk, , user] = users;

  const chrome = await prisma.software.upsert({ where: { name_vendor: { name: "Google Chrome", vendor: "Google" } }, update: {}, create: { name: "Google Chrome", vendor: "Google", currentVersion: "128.0.6613" } });
  const office = await prisma.software.upsert({ where: { name_vendor: { name: "Microsoft Office", vendor: "Microsoft" } }, update: {}, create: { name: "Microsoft Office", vendor: "Microsoft", currentVersion: "2024" } });
  const windows = await prisma.software.upsert({ where: { name_vendor: { name: "Windows OS", vendor: "Microsoft" } }, update: {}, create: { name: "Windows OS", vendor: "Microsoft", currentVersion: "11 24H2" } });
  const patches = await Promise.all([
    prisma.patch.upsert({ where: { code: "CVE-2026-2115" }, update: {}, create: { code: "CVE-2026-2115", title: "Chrome security update", severity: PatchSeverity.CRITICAL, releasedAt: new Date("2026-08-20"), softwareId: chrome.id } }),
    prisma.patch.upsert({ where: { code: "MS26-0824" }, update: {}, create: { code: "MS26-0824", title: "Office security update", severity: PatchSeverity.HIGH, releasedAt: new Date("2026-08-18"), softwareId: office.id } }),
    prisma.patch.upsert({ where: { code: "KB5034441" }, update: {}, create: { code: "KB5034441", title: "Windows recovery update", severity: PatchSeverity.MEDIUM, releasedAt: new Date("2026-08-12"), requiresRestart: true, softwareId: windows.id } }),
  ]);
  const devices = await Promise.all([
    prisma.device.upsert({ where: { hostname: "ACC-PC-012" }, update: { department: "Accounting" }, create: { hostname: "ACC-PC-012", operatingSystem: "Windows 11 Pro", department: "Accounting", status: DeviceStatus.NEEDS_ATTENTION, ownerId: user.id } }),
    prisma.device.upsert({ where: { hostname: "DEV-WS-028" }, update: { department: "Engineering" }, create: { hostname: "DEV-WS-028", operatingSystem: "Windows 11 Pro", department: "Engineering", status: DeviceStatus.ONLINE, ownerId: helpdesk.id } }),
    prisma.device.upsert({ where: { hostname: "SRV-APP-01" }, update: {}, create: { hostname: "SRV-APP-01", operatingSystem: "Ubuntu 22.04 LTS", department: "IT", status: DeviceStatus.ONLINE, ownerId: admin.id } }),
  ]);
  const scheduledAt = new Date("2026-09-10T14:00:00Z");
  const existingPlan = await prisma.deploymentPlan.findFirst({ where: { createdById: helpdesk.id, scheduledAt } });
  if (existingPlan) {
    await prisma.deploymentPlan.update({ where: { id: existingPlan.id }, data: { name: "August Windows Update", description: "Deploy patches to the Accounting department" } });
  } else {
    await prisma.deploymentPlan.create({ data: { name: "August Windows Update", description: "Deploy patches to the Accounting department", status: PlanStatus.PENDING_APPROVAL, scheduledAt, createdById: helpdesk.id, devices: { create: devices.slice(0, 2).map(device => ({ deviceId: device.id })) }, tasks: { create: devices.slice(0, 2).map(device => ({ deviceId: device.id, patchId: patches[2].id })) } } });
  }
  const existingTicket = await prisma.ticket.findFirst({ where: { createdById: user.id, assignedToId: helpdesk.id, priority: PatchSeverity.HIGH } });
  if (existingTicket) {
    await prisma.ticket.update({ where: { id: existingTicket.id }, data: { title: "Unable to install Windows patch", description: "The device reports an error after restarting." } });
  } else {
    await prisma.ticket.create({ data: { title: "Unable to install Windows patch", description: "The device reports an error after restarting.", status: TicketStatus.OPEN, priority: PatchSeverity.HIGH, createdById: user.id, assignedToId: helpdesk.id } });
  }
  const existingPolicy = await prisma.policy.findFirst({ where: { configuredById: admin.id, maxDeferralHours: 24 } });
  if (existingPolicy) {
    await prisma.policy.update({ where: { id: existingPolicy.id }, data: { name: "Default update policy" } });
  } else {
    await prisma.policy.create({ data: { name: "Default update policy", maxDeferralHours: 24, configuredById: admin.id } });
  }
  console.log("Seed complete: 5 users, 3 software entries, 3 patches, 3 devices, 1 plan, and 1 ticket.");
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
