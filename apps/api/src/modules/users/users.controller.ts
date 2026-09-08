import { Controller, Get } from "@nestjs/common"; import { CurrentUser } from "../../common/decorators/current-user.decorator"; import { UsersService } from "./users.service";
@Controller("users") export class UsersController { constructor(private service: UsersService) {} @Get("me") me(@CurrentUser() user: { id: string }) { return this.service.findMe(user.id); } }
