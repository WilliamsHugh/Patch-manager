import { Module } from "@nestjs/common";
import { SecurityInventoryController } from "./security-inventory.controller";
import { SecurityInventoryService } from "./security-inventory.service";

@Module({
  controllers: [SecurityInventoryController],
  providers: [SecurityInventoryService],
})
export class SecurityInventoryModule {}
