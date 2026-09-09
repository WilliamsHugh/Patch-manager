import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSoftwareDto } from "./dto/create-software.dto";
import { UpdateSoftwareDto } from "./dto/update-software.dto";

@Injectable()
export class SoftwareService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.software.findMany({
      include: { _count: { select: { patches: true, installations: true } } },
      orderBy: [{ vendor: "asc" }, { name: "asc" }],
    });
  }

  async findOne(id: string) {
    const software = await this.prisma.software.findUnique({
      where: { id },
      include: { _count: { select: { patches: true, installations: true } }, patches: { orderBy: { releasedAt: "desc" } } },
    });
    if (!software) throw new NotFoundException("Software not found");
    return software;
  }

  async create(dto: CreateSoftwareDto) {
    const data = this.normalizeCreate(dto);
    try {
      return await this.prisma.software.create({ data });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateSoftwareDto) {
    const data = this.normalizeUpdate(dto);
    if (Object.keys(data).length === 0) throw new BadRequestException("No software fields provided");

    try {
      return await this.prisma.software.update({ where: { id }, data });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.software.delete({ where: { id } });
      return { id, deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private normalizeCreate(dto: CreateSoftwareDto): Prisma.SoftwareCreateInput {
    const name = dto.name.trim();
    const vendor = dto.vendor.trim();
    const currentVersion = this.normalizeOptional(dto.currentVersion);
    if (!name || !vendor) throw new BadRequestException("Software name and vendor are required");
    return { name, vendor, currentVersion };
  }

  private normalizeUpdate(dto: UpdateSoftwareDto): Prisma.SoftwareUpdateInput {
    const data: Prisma.SoftwareUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("Software name is required");
      data.name = name;
    }
    if (dto.vendor !== undefined) {
      const vendor = dto.vendor.trim();
      if (!vendor) throw new BadRequestException("Software vendor is required");
      data.vendor = vendor;
    }
    if (dto.currentVersion !== undefined) data.currentVersion = this.normalizeOptional(dto.currentVersion);
    return data;
  }

  private normalizeOptional(value?: string) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new ConflictException("Software with this vendor and name already exists");
      if (error.code === "P2025") throw new NotFoundException("Software not found");
    }
    throw error;
  }
}
