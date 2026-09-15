import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...safeUserSelect, devices: true },
    });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản");
    return user;
  }

  findAll() {
    return this.prisma.user.findMany({
      select: { ...safeUserSelect, _count: { select: { devices: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...safeUserSelect, _count: { select: { devices: true } } },
    });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản");
    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Tên tài khoản không được để trống");
    try {
      return await this.prisma.user.create({
        data: { email, name, role: dto.role, passwordHash: await bcrypt.hash(dto.password, 10) },
        select: safeUserSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    if (id === actorId && (dto.role !== undefined || dto.isActive === false)) {
      throw new BadRequestException("Không thể tự đổi role hoặc khóa tài khoản của mình");
    }
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) throw new BadRequestException("Tên tài khoản không được để trống");
    if (Object.keys(dto).length === 0) throw new BadRequestException("Không có trường nào để cập nhật");
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name,
          role: dto.role,
          isActive: dto.isActive,
          ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
          ...(dto.password || dto.role !== undefined || dto.isActive === false
            ? { refreshTokenHash: null, refreshTokenExpiresAt: null }
            : {}),
        },
        select: safeUserSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deactivate(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException("Không thể tự khóa tài khoản của mình");
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: false, refreshTokenHash: null, refreshTokenExpiresAt: null },
        select: safeUserSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new ConflictException("Email đã được sử dụng");
      if (error.code === "P2025") throw new NotFoundException("Không tìm thấy tài khoản");
    }
    throw error;
  }
}
