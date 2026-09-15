import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditAction } from "../../common/decorators/audit-action.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Body() dto: LoginDto) { return this.service.login(dto); }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) { return this.service.refresh(dto.refreshToken); }

  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditAction("USER_LOGGED_OUT", "User")
  @Post("logout")
  logout(@CurrentUser() user: { id: string }) { return this.service.logout(user.id); }
}
