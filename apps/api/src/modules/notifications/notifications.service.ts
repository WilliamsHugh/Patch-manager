import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { status: NotificationStatus.READ },
    });
    if (result.count === 0) throw new NotFoundException("Notification not found");
    return this.prisma.notification.findUniqueOrThrow({ where: { id } });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ },
    });
    return { updated: result.count };
  }
}
