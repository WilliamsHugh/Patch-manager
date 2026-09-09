import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) this.rejectCredentials();
    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET") });
    } catch {
      this.rejectCredentials();
    }
    if (payload.type !== "refresh") this.rejectCredentials();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    const expiredInStore = !user?.refreshTokenExpiresAt || user.refreshTokenExpiresAt <= new Date();
    if (!user || !user.isActive || !user.refreshTokenHash || expiredInStore || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) this.rejectCredentials();
    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null, refreshTokenExpiresAt: null } });
  }

  private async issueTokenPair(user: { id: string; email: string; role: Role }) {
    const accessExpiresIn = this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
    const refreshExpiresIn = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";
    const basePayload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...basePayload, type: "access", jti: randomUUID() }, { secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"), expiresIn: accessExpiresIn as never }),
      this.jwt.signAsync({ ...basePayload, type: "refresh", jti: randomUUID() }, { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"), expiresIn: refreshExpiresIn as never }),
    ]);
    const decoded = this.jwt.decode(refreshToken) as { exp?: number };
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10), refreshTokenExpiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null } });
    return { accessToken, refreshToken };
  }

  private toSafeUser(user: { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: Date; updatedAt: Date }) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt };
  }

  private rejectCredentials(): never {
    throw new UnauthorizedException("Thông tin đăng nhập hoặc phiên làm việc không hợp lệ");
  }
}

type TokenPayload = { sub: string; email: string; role: Role; type: "access" | "refresh"; jti: string };
