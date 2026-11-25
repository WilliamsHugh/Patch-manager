import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject, type OperationObject } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix("api");
  app.enableCors({ origin: config.get("FRONTEND_URL", "http://localhost:3000"), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Patch Management System API")
    .setDescription("API reference for the Windows agent scan and patch-proposal demonstration flow.")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
    .addApiKey({ type: "apiKey", in: "header", name: "x-agent-token" }, "agent-token")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  applyOperationSecurity(document);
  SwaggerModule.setup("docs", app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: "docs-json",
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.get<number>("PORT", 4000));
}
bootstrap();

function applyOperationSecurity(document: OpenAPIObject) {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    const route = path.replace(/^\/api(?=\/|$)/, "");
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation || route === "/health" || route === "/auth/login" || route === "/auth/refresh") continue;
      operation.security = route.startsWith("/agent/{deviceId}/")
        ? [{ "agent-token": [] }]
        : [{ "access-token": [] }];
    }
  }
}
