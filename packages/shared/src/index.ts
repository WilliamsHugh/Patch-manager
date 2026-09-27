export enum Role { ADMIN = "ADMIN", MANAGER = "MANAGER", IT_HELPDESK = "IT_HELPDESK", SECURITY_ANALYST = "SECURITY_ANALYST", USER = "USER" }
export enum PatchSeverity { LOW = "LOW", MEDIUM = "MEDIUM", HIGH = "HIGH", CRITICAL = "CRITICAL" }
export enum PlanStatus { DRAFT = "DRAFT", PENDING_APPROVAL = "PENDING_APPROVAL", APPROVED = "APPROVED", REJECTED = "REJECTED", CHANGES_REQUESTED = "CHANGES_REQUESTED", DEPLOYING = "DEPLOYING", COMPLETED = "COMPLETED", FAILED = "FAILED", ROLLED_BACK = "ROLLED_BACK" }
export enum TaskStatus { PENDING = "PENDING", DOWNLOADING = "DOWNLOADING", INSTALLING = "INSTALLING", WAITING_RESTART = "WAITING_RESTART", SUCCESS = "SUCCESS", FAILED = "FAILED", ROLLBACKED = "ROLLBACKED" }
export enum TicketStatus { OPEN = "OPEN", IN_PROGRESS = "IN_PROGRESS", WAITING_USER = "WAITING_USER", RESOLVED = "RESOLVED", CLOSED = "CLOSED" }
// Keys are TicketStatus names, values are the allowed next states (workflow from the delivery plan).
export const TICKET_TRANSITIONS: Record<string, string[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING_USER, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.WAITING_USER]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};
export enum DeviceStatus { ONLINE = "ONLINE", OFFLINE = "OFFLINE", NEEDS_ATTENTION = "NEEDS_ATTENTION" }

export interface User { id: string; email: string; name: string; role: Role }
export interface Device { id: string; hostname: string; operatingSystem: string; status: DeviceStatus; owner?: User }
export interface Patch { id: string; code: string; title: string; severity: PatchSeverity; releasedAt: string }
export interface DeploymentPlan { id: string; name: string; status: PlanStatus; scheduledAt?: string; createdBy: User }
export interface Ticket { id: string; title: string; description: string; status: TicketStatus; createdBy: User }
