import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import * as basicAuth from "cookie-parser";

async function bootstrap() {
  const PORT = process.env.PORT || 3000;
  const app = await NestFactory.create(AppModule);

  // Добавляем Basic Auth для Swagger
  app.use(
    ["/api/docs", "/api/docs-json"], // Ограничиваем доступ к Swagger UI и JSON
    basicAuth({
      users: { shk_admin: "Abc!1234" }, // Укажите логин и пароль
      challenge: true, // Включаем окно аутентификации в браузере
    })
  );

  //app.enableCors();
  app.enableCors({
    origin: "http://localhost:3000", // 👈 Разрешаем frontend-у обращаться к API
    credentials: true, // 👈 Разрешаем передавать куки
  });
  app.use(cookieParser());

  await app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

bootstrap();
