# People — исследование (фаза 1)

**Дата:** 2026-09-16
**Охват:** всё в `chor-app-server` (и в источниках, от которых он зависит),
что затронет фича People (`Person` с ролями Pianist/Conductor) или чему она
должна следовать.
**Правила документа:** только факты и ссылки на код, состояние «как есть».
Без рекомендаций и без дизайна. Процесс: `../chor-app-docs/development-process.md`.

Пути указаны относительно `chor-app-server/`, если не начинаются с
`chor-app-docs/`.

---

## 1. Состояние репозитория

| Факт | Ссылка |
|---|---|
| Последний коммит: `b28e023 Gate deploys on checks and apply migrations during deploy` | `git log` |
| Имя пакета до сих пор scaffold-овое: `temp-nest` | `package.json:2` |
| Модули bounded context: `identity`, `notifications`; общий: `shared/prisma` | `src/` |
| Нет модуля `people`, модели `Person` и кода, упоминающего Person/Pianist/Conductor | `grep` по `src/`, `prisma/` |
| Папка `docs/feature/people/` существует (этот документ — первый файл в ней) | `docs/` |

## 2. Runtime и запуск приложения

| Факт | Ссылка |
|---|---|
| NestJS 11, Node 20 (Dockerfile + CI) | `package.json:22-38`, `Dockerfile:1`, `.github/workflows/docker-image.yml` (`node-version: '20'`) |
| Первым загружается `dotenv/config`; порт из `PORT` (по умолчанию 3000, в проде 5050) | `src/main.ts:1,8`, `docker-compose.yml` |
| Глобальный `ValidationPipe({ whitelist: true, transform: true })` | `src/main.ts:11` |
| Нет глобального префикса маршрутов и версионирования API | `src/main.ts` |
| CORS: `https://chorapp.wald.pro`, любой `http://localhost:*`, `chrome-extension://*`; `credentials: true` | `src/main.ts:13-41` |
| `cookie-parser` подключён (аутентификацией не используется) | `src/main.ts:43`, `chor-app-docs/decisions/0004-auth-mechanism.md` |
| Swagger **не установлен** (`@nestjs/swagger` нет в `package.json`, настройки в `main.ts` нет), хотя ADR 0002 и `AGENTS.md` его упоминают | `package.json`, `src/main.ts`, `AGENTS.md` (раздел Stack & architecture, API docs) |
| Глобального exception filter нет; доменные ошибки маппятся в HTTP-исключения внутри контроллеров через `try/catch` + `instanceof` | `src/identity/interface/controllers/auth.controller.ts:45-55,57-68,80-99,111-121` |
| `AppModule` импортирует `ConfigModule.forRoot({ isGlobal: true })`, `PrismaModule`, `IdentityModule`; оставлены scaffold-овые `AppController`/`AppService` (`GET /` → "Hello World!") | `src/app.module.ts:8-17`, `src/app.service.ts` |
| `NotificationsModule` импортируется не в `AppModule`, а только в `IdentityModule` | `src/app.module.ts`, `src/identity/identity.module.ts:36` |

## 3. Хранение данных (Prisma / PostgreSQL)

| Факт | Ссылка |
|---|---|
| Prisma 7.10 с driver adapter `@prisma/adapter-pg`; строка подключения в `prisma.config.ts` (`env("DATABASE_URL")`), **не** в datasource `schema.prisma` | `prisma.config.ts:1-12`, `prisma/schema.prisma:5-7`, `src/shared/prisma/prisma.service.ts:11-17` |
| `PrismaService extends PrismaClient`, подключается при инициализации; `PrismaModule` — `@Global()` и экспортирует его | `src/shared/prisma/prisma.service.ts`, `src/shared/prisma/prisma.module.ts:4-9` |
| Одна общая схема на все контексты | `prisma/schema.prisma`, `AGENTS.md` (Stack & architecture) |
| Модели: `Community`, `User`, `PasswordResetToken`, `CommunityMembership`; enum `CommunityRole { ADMINISTRATOR, MEMBER }` | `prisma/schema.prisma` |
| Соглашения схемы: `id String @id @default(uuid())`; `createdAt @default(now())`; `updatedAt @updatedAt` (есть у `Community`, `User`; **нет** у `CommunityMembership`, `PasswordResetToken`); имена таблиц snake_case во множественном числе через `@@map`; имена колонок camelCase | `prisma/schema.prisma` |
| Внешние ключи с `onDelete: Cascade` (membership → user/community, reset token → user) | `prisma/schema.prisma`, `prisma/migrations/20260915143358_init/migration.sql` |
| Postgres enum уже используется (`CommunityRole`); в доменный enum приводится через `as unknown as CommunityRole` | `src/identity/infrastructure/prisma/prisma-membership.repository.ts:22`, `prisma-registration.repository.ts:62` |
| Единственный составной unique-constraint: `@@unique([userId, communityId])` у memberships | `prisma/schema.prisma`, init-миграция |
| В схеме нет колонок-массивов и колонок для soft delete / архивации | `prisma/schema.prisma` |
| У `Community` есть только relation-поле `memberships` | `prisma/schema.prisma` |
| Миграции (3): `20260915143358_init`, `20260915150205_password_reset`, `20260915151034_token_version` (последняя удаляет `passwordChangedAt`, добавляет `tokenVersion`) | `prisma/migrations/` |
| Миграции применяются при каждом деплое, **пока старый контейнер ещё обслуживает запросы** (`prisma migrate deploy` до `docker compose down/up`) | `AGENTS.md` (Deployment & CI/CD), `chor-app-docs/decisions/0006-deployment-as-implemented.md` |
| Транзакции: интерактивные `prisma.$transaction(async (tx) => …)`, внутри `infrastructure/` | `src/identity/infrastructure/prisma/prisma-registration.repository.ts:20-42` |

## 4. Устройство модуля (эталонная реализация: `src/identity/`)

Правило слоёв (задокументировано): `domain/` без фреймворка; `application/` →
domain; `infrastructure/` → domain + Prisma; `interface/` → application.
`AGENTS.md` (Stack & architecture), `chor-app-docs/decisions/0002-server-stack.md`.

### 4.1 Структура папок в реализации

```
src/identity/
  identity.module.ts
  domain/        entities/  errors/  ports/  value-objects/
  application/   use-cases/
  infrastructure/prisma/  infrastructure/security/
  interface/     controllers/  decorators/  dto/  guards/
```
Именование файлов: `<name>.entity.ts`, `<name>.port.ts`, `<name>.use-case.ts`,
`prisma-<name>.repository.ts`, `<name>.dto.ts`, `<name>.guard.ts`,
`<name>.decorator.ts`, ошибки собраны в `identity.errors.ts`.

### 4.2 Domain

| Факт | Ссылка |
|---|---|
| Сущности — классы-обёртки над интерфейсом `Props`, только getters, без методов поведения и без валидации | `src/identity/domain/entities/user.entity.ts`, `community.entity.ts`, `community-membership.entity.ts` |
| `id`/`createdAt` сущности получают из хранилища (id генерирует БД через `uuid()`) | `prisma-registration.repository.ts:44-64` |
| Value object — строковый TS enum | `src/identity/domain/value-objects/community-role.ts` |
| Ошибки — подклассы `Error`, выставляющие `this.name` | `src/identity/domain/errors/identity.errors.ts` |
| Порты: TS-интерфейс + DI-токен `export const X = Symbol('X')` в том же файле | `src/identity/domain/ports/*.port.ts` (напр. `membership-repository.port.ts:13`) |
| Порты репозиториев возвращают доменные сущности **или** read-model view (`CommunityMembershipView`) | `user-repository.port.ts`, `membership-repository.port.ts:3-11` |
| У `MembershipRepository` один метод: `findByUserId(userId)` → `{ communityId, communityName, role }[]`; поиска по `(userId, communityId)` нет | `src/identity/domain/ports/membership-repository.port.ts` |

### 4.3 Application

| Факт | Ссылка |
|---|---|
| Один `@Injectable()`-класс на use case с методом `execute(input)`; интерфейсы входа/результата в том же файле | `src/identity/application/use-cases/register.use-case.ts:11-58` |
| Порты внедряются через `@Inject(TOKEN)` + `import type` интерфейса | `register.use-case.ts:3-8,27-32` |
| Нормализация (trim / lowercase) — в use case, не в DTO и не в сущностях | `register.use-case.ts:35,46-48`, `login.use-case.ts:37` |
| Уникальность проверяется в use case до вставки (`findByEmail`), unique-constraint в БД тоже есть | `register.use-case.ts:37-40`, `prisma/schema.prisma` (`email @unique`) |
| Use cases импортируют `@nestjs/common` (`Injectable`, `Inject`) | все файлы в `use-cases/` |
| Использование порта другого модуля: use case Identity внедряет `EMAIL_SENDER` из `notifications/domain/ports` | `forgot-password.use-case.ts:2-3,23` |

### 4.4 Infrastructure

| Факт | Ссылка |
|---|---|
| Prisma-репозитории: `@Injectable()`, внедряют `PrismaService`, приватный маппер `toDomain(record)` | `src/identity/infrastructure/prisma/prisma-user.repository.ts:6-47` |
| Обработки кодов ошибок Prisma (например, `P2002`) нигде нет | `grep P2002 src/` → пусто |

### 4.5 Interface (HTTP)

| Факт | Ссылка |
|---|---|
| Один контроллер `@Controller('auth')`: `POST register`, `POST login`, `GET me`, `POST change-password`, `POST forgot-password`, `POST reset-password` | `src/identity/interface/controllers/auth.controller.ts` |
| Контроллеры возвращают результат use case напрямую (классов response DTO нет) | `auth.controller.ts:45-55` |
| Используемый маппинг: конфликт → `ConflictException` (409), неверные учётные данные → `UnauthorizedException` (401), доменная валидация → `BadRequestException` (400); у `POST`, которые не должны отдавать 201, стоит `@HttpCode(HttpStatus.OK)` | `auth.controller.ts` |
| DTO: только декораторы `class-validator` (`IsString`, `MinLength`, `IsEmail`), Swagger-декораторов нет | `src/identity/interface/dto/register.dto.ts`, `change-password.dto.ts` |
| Guard аутентификации: `JwtAuthGuard extends AuthGuard('jwt')` | `src/identity/interface/guards/jwt-auth.guard.ts` |
| Декоратор параметра `@CurrentUser()` возвращает `request.user` типа `AuthenticatedUser { id, email, name }` | `src/identity/interface/decorators/current-user.decorator.ts`, `infrastructure/security/jwt.strategy.ts:9-13` |
| `JwtStrategy.validate` на каждом запросе загружает User по `sub` и сравнивает `tokenVersion`; в пользователе запроса **нет** данных о Community / membership / роли | `src/identity/infrastructure/security/jwt.strategy.ts:28-39` |
| Payload JWT: `{ sub, email, tokenVersion }` | `src/identity/domain/ports/token-issuer.port.ts:1-5` |
| Нет параметра маршрута `:communityId` и нет guard/декоратора, определяющего Community или membership | `grep -r communityId src/identity/interface` → пусто |
| Login и `GET /auth/me` возвращают `memberships: { communityId, communityName, role }[]` | `login.use-case.ts:20-24,51`, `get-current-user.use-case.ts:10-13` |

### 4.6 Сборка модуля

| Факт | Ссылка |
|---|---|
| Providers: use cases как классы; порты привязаны через `{ provide: TOKEN, useClass: Impl }` | `src/identity/identity.module.ts:53-74` |
| У `IdentityModule` **нет `exports`**: `JwtAuthGuard`/`JwtStrategy`/`@CurrentUser` используются только внутри него | `src/identity/identity.module.ts:34-76` |
| `JwtModule.registerAsync` с `JWT_SECRET` (обязателен), `JWT_EXPIRES_IN` (по умолчанию `1d`) | `identity.module.ts:38-50` |
| Пример модуля, экспортирующего токен порта: `NotificationsModule` экспортирует `EMAIL_SENDER` | `src/notifications/notifications.module.ts:5-9` |

## 5. Инструменты качества и CI

| Факт | Ссылка |
|---|---|
| ESLint 9 flat config: `recommendedTypeChecked` + плагин prettier; `no-explicit-any` выключен; `no-floating-promises`, `no-unsafe-argument` = warn | `eslint.config.mjs` |
| Prettier: одинарные кавычки, trailing commas | `.prettierrc` |
| TS: `strictNullChecks: true`, `noImplicitAny: false`, `module/moduleResolution: nodenext`, декораторы включены | `tsconfig.json` |
| Метрики сложности не настроены (нет правила eslint `complexity`, sonar и т. п.) | `eslint.config.mjs`, `package.json` |
| Шага проверки безопасности в CI нет (нет `npm audit`, CodeQL и т. п.) | `.github/workflows/docker-image.yml` |
| Unit-тесты: Jest (`rootDir: src`, `*.spec.ts`); единственный spec — scaffold-овый `src/app.controller.spec.ts`, **тестов для Identity нет** | `package.json` (блок jest), `find src -name "*.spec.ts"` |
| E2E: `test/jest-e2e.json`, только scaffold-овый `test/app.e2e-spec.ts` (`GET /`); e2e поднимает весь `AppModule` (нужна БД) и **в CI не запускается** | `test/`, `AGENTS.md` (Deployment & CI/CD) |
| CI job `checks` (push + PR): `npm ci` → `prisma generate` (placeholder `DATABASE_URL`) → `lint:check` → `npm test` → `build`; деплой только при push в `main` | `.github/workflows/docker-image.yml`, `AGENTS.md` (Deployment & CI/CD) |
| Изменение Identity проверялось вручную на реальной БД (задача 6.3) | `chor-app-docs/openspec/changes/archive/2026-09-15-add-identity-community-auth/tasks.md` |

## 6. Конфигурация

| Факт | Ссылка |
|---|---|
| Ключи окружения: `PORT`, `POSTGRES_*`, `DATABASE_URL`, `MAIL_USERNAME/PWD/HOST/PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PASSWORD_RESET_TOKEN_TTL_MINUTES` | `.env.example` |
| Новые ключи нужно вручную добавить в `.env` на хосте и в `.env.example` | `AGENTS.md` (Deployment & CI/CD) |

## 7. Зафиксированные решения и спецификации, касающиеся People

| Факт | Ссылка |
|---|---|
| Мультиарендность: каждый агрегат вне Identity несёт `communityId`; `Person` отдельно от `User`, связь необязательная, между Community не разделяется | `chor-app-docs/decisions/0003-multi-tenancy-identity.md`, `AGENTS.md` (Stack & architecture) |
| Аутентификация: bearer JWT, обязательна для всех защищённых эндпоинтов | `chor-app-docs/decisions/0004-auth-mechanism.md` |
| Доменная модель: `Person` — одна сущность для обеих ролей, может иметь одну или обе роли `CONDUCTOR`/`PIANIST`, хранится как данные; на неё ссылаются `SungSongEntry` (pianist, conductor) и ведущий WarmUp в Rehearsal | `chor-app-docs/domain-model.md` (разделы Rehearsal & performance log, Relationships) |
| Глоссарий: Klavierspieler → Pianist, Dirigent → Conductor, Person → Person; код на английском, UI на немецком | `chor-app-docs/glossary.md` |
| Действующие спецификации есть только для `identity/registration-and-login`, `identity/password-management` | `chor-app-docs/openspec/specs/` |
| Планировочные артефакты в работе (не реализованы), созданы 2026-09-16: `add-community-access-control` (маршрутизация по Community + разрешения, `PEOPLE_MANAGE`), `add-people`; ADR `0007-community-scoped-requests-and-permissions.md` | `chor-app-docs/openspec/changes/`, `chor-app-docs/decisions/0007-…` |
| `AGENTS.md` сервера всё ещё называет открытыми «role granularity» и «active Community guard» и ссылается на `openspec/changes/add-identity-community-auth/` (это изменение теперь лежит в `changes/archive/`) | `AGENTS.md` (Implemented so far, Open questions) |
| Решения владельца продукта (2026-09-16): роли Pianist/Conductor совмещаются у одного человека; роли захардкожены на этапе MVP; удаление = архивация; разрешения участникам выдаёт Administrator; Community в пути URL; связь Person↔User отложена | обсуждение / `chor-app-docs/openspec/changes/add-people/proposal.md` |

## 8. Поведение старого приложения (функциональный источник истины)

Файл: `chor-app-docs/chor-app_v3.html` (однофайловое приложение, localStorage +
опциональная синхронизация через файл).

| Факт | Ссылка |
|---|---|
| Люди хранятся как два независимых массива строк `personen = { pianisten: string[], dirigenten: string[] }` под ключом localStorage `chorlieder_personen_v1` | `chor-app_v3.html:698-720` |
| Значения по умолчанию: пианисты `Lorina, Shanell, Natascha, Juliane, Springer`; дирижёры `Paul, Alex, Daniel` | `chor-app_v3.html:699-702` |
| Добавление: trim, пустое имя отклоняется, дубликат без учёта регистра отклоняется **только в пределах одного списка**; одно и то же имя может быть в обоих списках | `chor-app_v3.html:722-730, 1520-1545` |
| Удаление: имя вырезается из списка после подтверждения; в сообщении сказано, что существующие записи Vortrag/Probe не затрагиваются | `chor-app_v3.html:731-737, 1511-1519` |
| Функции переименования/редактирования нет | `chor-app_v3.html:697-737, 1493-1545` |
| UI: вкладка `Verwaltung` с двумя карточками «Klavierspieler verwalten» / «Dirigenten verwalten» (поле имени + таблица с кнопкой «Entfernen») | `chor-app_v3.html:466-497, 1493-1510` |
| Запись журнала хранит `pianist` и `dirigent` как **строки с именами** (необязательные, могут быть пустыми) | `chor-app_v3.html:1438-1456` |
| Репетиция (`probe`) хранит `einsingen` (ведущий WarmUp) как строку с именем, выбранным из списка дирижёров | `chor-app_v3.html:789, 1640-1647` |
| Выпадающие списки: выбор пианиста — из `pianisten`, дирижёра и Einsingen — из `dirigenten`; обновляются после добавления/удаления | `chor-app_v3.html:784-790` |
| Отсутствия: `{ id, rolle: 'Pianist'|'Dirigent', name, von, bis, grund }`, ключ `chorlieder_abwesenheiten_v1`; человек выбирается из обоих списков как `Rolle::Name` | `chor-app_v3.html:745-780` |
| Статистика по пианистам / дирижёрам считает записи журнала по строке имени; имена, которые есть в журнале, но уже удалены из списка, всё равно показываются | `chor-app_v3.html:1999-2029` |
| Поиск по истории ищет имена пианиста/дирижёра/Einsingen как текст | `chor-app_v3.html:1756-1757, 1794` |
| Экспорт/импорт бэкапа и синхронизация через файл включают `personen`; импорт объединяет списки аддитивно (удаления не переносятся) | `chor-app_v3.html:961-965, 1010, 2094, 2170-2175` |

## 9. Сводка текущих пробелов, относящихся к People (факты, без оценки)

- Нет ни одного эндпоинта внутри Community, параметра маршрута, guard'а или поиска membership по `(userId, communityId)`.
- Понятия разрешений нет, есть только `CommunityRole`.
- `IdentityModule` ничего не экспортирует.
- Пока нет колонок-массивов Prisma, колонок архивации / soft delete и маппинга кодов ошибок Prisma.
- Нет Swagger, response DTO и глобального exception filter.
- Нет unit- и e2e-тестов ни для одной реализованной фичи; e2e не запускается в CI.
- В старых данных люди идентифицируются только строкой имени, а пианисты и дирижёры лежат в отдельных списках.
