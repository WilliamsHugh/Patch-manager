import { Injectable } from "@nestjs/common"; import { Role } from "@prisma/client";
@Injectable() export class RolesService { findAll() { return Object.values(Role); } }
