# Catalog — исследование (фаза 1)

**Дата:** 2026-09-17
**Охват:** только реализация глобального каталога (публичной библиотеки) печатных книг по
`chor-app-docs/decisions/0010-public-book-library.md`: серии, книги, песни, основные темы,
загрузка файлов CSV / Excel / JSON, эндпоинты `/admin/library/...` с guard-заглушкой, чтение
каталога любым аутентифицированным пользователем, read-порт для других модулей и запрос
использования для предупреждения superadmin.
**Вне охвата:** Repertoire внутри Community (`Folder`, `BookAttachment`, кастомные темы,
`SongLookup` — ADR 0009), capability Superadmin, Legacy Import, клиентский UI (в разделе 11 —
только факты о текущем состоянии клиента).
**Правила документа:** только факты и ссылки, состояние «как есть». Без рекомендаций и без
дизайна. Процесс: `../chor-app-docs/development-process.md`.

Пути указаны относительно `chor-app-server/`, если не начинаются с `chor-app-docs/` или
`chor-app-client/`. Старое приложение — `chor-app-docs/chor-app_v3.html` (далее «legacy»).

**Имя.** В ADR 0010 capability называется Library (`LibraryModule`, `LibraryBook`, …) —
это рабочее имя, окончательные названия не выбраны (ADR 0010, Q1). В этом документе
«каталог» и «Library» означают одно и то же.

---

## 1. Состояние репозиториев

| Факт | Ссылка |
|---|---|
| Последний коммит сервера: `3ee8b2d fix(notifications): enforce module boundary between identity and notifications`; рабочее дерево чистое | `git log`, `git status` |
| Предыдущие коммиты: `a5ec4f6 feat(identity): return effective permissions in login and me`, `6fc78e8 feat(identity): add community member guard and permission decorators`, `c9fea1c feat(identity): add community permissions to memberships`, `b397ab1 test: add database-backed e2e setup and run it in CI`, `7ea623a chore: add complexity, layering and audit quality gates` | `git log` |
| Модули в `src/`: `identity`, `notifications`, общий `shared/prisma`; модулей `library`, `catalog`, `repertoire`, `people` нет | `src/` |
| В `src/`, `prisma/`, `test/` нет кода и моделей для книг, серий, песен, тем, загрузки файлов | дерево файлов `src/`, `prisma/schema.prisma` |
| Папка `data/` в репозитории отсутствует; файла `legacy-v3.json` и скрипта `scripts/extract-legacy-catalog.ts` (упомянуты в черновике Repertoire) нет | корень репозитория |
| Изменения в `chor-app-docs` (ADR 0008–0010, правки README/config/capability-breakdown/domain-model/brainstorm) не закоммичены | `git -C ../chor-app-docs status` |
| Имя пакета — scaffold-овое `temp-nest` | `package.json:2` |

## 2. Runtime и HTTP

| Факт | Ссылка |
|---|---|
| NestJS 11 (`@nestjs/common`, `core`, `platform-express` `^11.0.1`), Node 20 | `package.json`, `Dockerfile:1`, `.github/workflows/docker-image.yml:32` |
| Глобальный `ValidationPipe({ whitelist: true, transform: true })` | `src/main.ts:11` |
| Глобального префикса маршрутов и версионирования API нет | `src/main.ts` |
| Лимиты размера тела запроса в `main.ts` явно не заданы (body parser Nest/Express по умолчанию) | `src/main.ts:7-46` |
| CORS: `https://chorapp.wald.pro`, `http://localhost:*`, `chrome-extension://*`, запросы без `Origin`; `credentials: true` | `src/main.ts:13-41` |
| Глобального exception filter нет; доменные ошибки маппятся в HTTP-исключения в контроллере через `try/catch` + `instanceof` | `src/identity/interface/controllers/auth.controller.ts:46-69` |
| Формат ошибок guard'а Community: `{ statusCode, error, message, code }` (`NOT_COMMUNITY_MEMBER`, `PERMISSION_DENIED` + `required`) | `src/identity/interface/guards/community-member.guard.ts:74-79,95-101,116-122` |
| `AppModule` импортирует `ConfigModule.forRoot({ isGlobal: true })`, `PrismaModule`, `IdentityModule`, `NotificationsModule`; остались scaffold-овые `AppController`/`AppService` | `src/app.module.ts:9-18` |
| Swagger (`@nestjs/swagger`) не установлен, хотя `AGENTS.md` его описывает | `package.json`, `AGENTS.md` (Stack & architecture) |

### 2.1 Загрузка файлов и разбор форматов

| Факт | Ссылка |
|---|---|
| `multer` 2.4.0 присутствует в `node_modules` как зависимость `@nestjs/platform-express`, версия зафиксирована через `overrides` | `package.json` (`overrides.multer`), `node_modules/multer/package.json:4` |
| `@types/multer` не установлен | `node_modules/@types` |
| `FileInterceptor`, `UploadedFile`, `multer` в коде и тестах не используются | `grep` по `src/`, `test/` |
| Библиотек для Excel (`xlsx`, `exceljs`) и CSV (`papaparse`, `csv-parse`, `fast-csv`) нет ни в зависимостях, ни в `node_modules` | `package.json`, `node_modules` |
| CI падает при уязвимостях уровня high в prod-зависимостях: `npm audit --audit-level=high --omit=dev` | `.github/workflows/docker-image.yml:37-38` |

## 3. Хранение данных (Prisma / PostgreSQL)

| Факт | Ссылка |
|---|---|
| Prisma 7.10 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`); строка подключения — из `prisma.config.ts` / `DATABASE_URL`, не из `schema.prisma` | `package.json`, `prisma.config.ts:1-12`, `src/shared/prisma/prisma.service.ts:20-26` |
| `PrismaModule` помечен `@Global()` и экспортирует `PrismaService` | `src/shared/prisma/prisma.module.ts:1-9` |
| Модели: `Community`, `User`, `PasswordResetToken`, `CommunityMembership`; enum `CommunityRole`, `CommunityPermission` (`PEOPLE_MANAGE`) | `prisma/schema.prisma:9-71` |
| Модели без `communityId` (не принадлежащие Community): `User`, `PasswordResetToken`, сам `Community`. Других глобальных доменных данных нет | `prisma/schema.prisma` |
| У `User` нет поля роли/платформенного признака (superadmin и т.п.) | `prisma/schema.prisma:29-42` |
| Все id — `String @id @default(uuid())`; таблицы именуются `@@map("snake_case_plural")`; `createdAt`/`updatedAt` у сущностей | `prisma/schema.prisma` |
| Миграции: `20260915143358_init`, `20260915150205_password_reset`, `20260915151034_token_version`, `20260916204809_community_permissions` — только DDL, данных не вставляют | `prisma/migrations/*/migration.sql` |
| Seed-скрипта нет (`prisma.seed` отсутствует в `package.json` и `prisma.config.ts`) | `package.json`, `prisma.config.ts` |
| Индексов для полнотекстового поиска и расширений (`pg_trgm`, `unaccent`) нет | `prisma/schema.prisma`, миграции |
| Интерактивная транзакция используется в одном месте: `prisma.$transaction(async (tx) => …)` при регистрации | `src/identity/infrastructure/prisma/prisma-registration.repository.ts:21-43` |
| Массовые вставки (`createMany`) и upsert в коде не используются | `grep` по `src/` |

## 4. Устройство модуля (эталон: `src/identity/`)

| Факт | Ссылка |
|---|---|
| Подпапки: `domain/` (`entities`, `errors`, `ports`, `value-objects`), `application/use-cases`, `infrastructure/` (`prisma`, `security`), `interface/` (`controllers`, `decorators`, `dto`, `guards`) | `src/identity/` |
| Порты — TS-интерфейсы + DI-токен `Symbol(...)` в том же файле | `src/identity/domain/ports/membership-repository.port.ts:12-20` |
| Провайдеры порт → реализация: `{ provide: TOKEN, useClass: Prisma…Repository }`; use case получает порт через `@Inject(TOKEN)` | `src/identity/identity.module.ts:64-76`, `src/identity/application/use-cases/resolve-membership.use-case.ts:9-12` |
| Доменные сущности — классы с `props` и геттерами; доменные ошибки — наследники `Error` с `name` | `src/identity/domain/entities/community-membership.entity.ts:17-59`, `src/identity/domain/errors/identity.errors.ts` |
| Репозиторий маппит строку Prisma в доменную сущность; enum Prisma приводится через `as unknown as` | `src/identity/infrastructure/prisma/prisma-membership.repository.ts:21-37` |
| `IdentityModule` экспортирует `JwtAuthGuard`, `CommunityMemberGuard`, `ResolveMembershipUseCase`, `PassportModule`, `JwtModule` | `src/identity/identity.module.ts:81-87` |
| У `notifications` есть barrel `src/notifications/index.ts` (модуль + порт `EMAIL_SENDER`); у `identity` barrel-файла (`index.ts`) нет | `src/notifications/index.ts`, `src/identity/` |
| Тестовая утилита импортирует `identity` по глубоким путям (`src/identity/interface/decorators/...`, `.../guards/...`) | `test/utils/test-community.controller.ts:2-8` |

## 5. Аутентификация и авторизация

| Факт | Ссылка |
|---|---|
| `JwtAuthGuard` = `AuthGuard('jwt')`; токен из `Authorization: Bearer` | `src/identity/interface/guards/jwt-auth.guard.ts`, `src/identity/infrastructure/security/jwt.strategy.ts:22` |
| Стратегия проверяет существование пользователя и `tokenVersion`; в `request.user` кладёт `{ id, email, name }` (`AuthenticatedUser`) | `src/identity/infrastructure/security/jwt.strategy.ts:9-39` |
| Декоратор `@CurrentUser()` возвращает `request.user` | `src/identity/interface/decorators/current-user.decorator.ts` |
| `CommunityMemberGuard` требует параметр `:communityId`, иначе 500; без `request.user` — 401; не участник — 403 | `src/identity/interface/guards/community-member.guard.ts:40-50,66-83` |
| `@RequirePermission` / `@RequireRole` — метаданные через `SetMetadata`; проверяет только `CommunityMemberGuard` | `src/identity/interface/decorators/require-permission.decorator.ts`, `community-member.guard.ts:85-124` |
| Разрешения и роли существуют только на уровне `CommunityMembership`; платформенных ролей, guard'ов или декораторов (superadmin, admin) в коде нет | `src/identity/domain/value-objects/`, `prisma/schema.prisma`, `grep -i admin src` (только `ADMINISTRATOR` Community) |
| Без guard'ов работают только `POST auth/register`, `auth/login`, `auth/forgot-password`, `auth/reset-password` и scaffold `GET /`; `GET auth/me` и `POST auth/change-password` — под `JwtAuthGuard` | `src/identity/interface/controllers/auth.controller.ts:46,58,71-72,81-82,102,112`, `src/app.controller.ts:8` |

## 6. Инструменты качества и тесты

| Факт | Ссылка |
|---|---|
| ESLint: `complexity` 10, `max-depth` 3, `max-lines-per-function` 60, `max-params` 5 (выключен для `*.use-case.ts`, `*.repository.ts`), prettier как ошибка | `eslint.config.mjs:64-95` |
| Границы модулей заданы списком `moduleBoundaries` только для `identity` и `notifications`; новый модуль нужно добавлять в список, чтобы на него действовал `no-restricted-imports` | `eslint.config.mjs:7-34,96-119` |
| `domain/` не может импортировать `@nestjs*`, `@prisma*`; `interface/` не может импортировать `@prisma*` | `eslint.config.mjs:120-159` |
| Unit-тесты: jest, `rootDir: src`, `*.spec.ts` рядом с кодом | `package.json` (`jest`), `src/identity/**/*.spec.ts` |
| E2E: `test/jest-e2e.json` (`maxWorkers: 1`, `globalSetup` применяет `prisma migrate deploy` к тестовой БД), Postgres 16 на порту 5433 (`docker-compose.test.yml`) | `test/jest-e2e.json`, `test/utils/global-setup.ts`, `docker-compose.test.yml` |
| `createTestApp()` поднимает весь `AppModule`, подменяет `EMAIL_SENDER`, повторяет `ValidationPipe` и `cookieParser` из `main.ts` | `test/utils/create-test-app.ts` |
| `resetDb()` делает `TRUNCATE … CASCADE` всех таблиц схемы `public`, кроме `_prisma_migrations` | `test/utils/reset-db.ts` |
| Фабрики `createAdmin`, `createMember` создают пользователей через HTTP-регистрацию | `test/utils/factories.ts` |
| E2E-тестов с загрузкой файлов (`multipart/form-data`) нет | `test/` |
| CI: job `checks` (audit, prisma generate, lint, unit, build) и `e2e` (Postgres service) на каждый push/PR; `build` и `deploy-to-server` — только push в `main` после обоих | `.github/workflows/docker-image.yml:16-100,142-145` |

## 7. Сборка и деплой

| Факт | Ссылка |
|---|---|
| Docker-образ копирует весь репозиторий (кроме `.dockerignore`: `node_modules`, `dist`, `.git`, `.github`, `.env*`, `coverage`) и запускает `node dist/main` | `Dockerfile:9-29`, `.dockerignore` |
| `nest build` переносит в `dist/` только скомпилированный `src/` (`rootDir: ./src`); ассеты в `nest-cli.json` не настроены | `tsconfig.build.json`, `nest-cli.json` |
| `docker-compose.yml` не монтирует тома; файлы, записанные контейнером, не переживают пересоздание контейнера | `docker-compose.yml` |
| Деплой создаёт на хосте каталоги `data`, `backups_history` (chmod 777), но compose их не использует | `.github/workflows/docker-image.yml:171-172`, `docker-compose.yml` |
| `prisma migrate deploy` выполняется новым образом до замены контейнера | `.github/workflows/docker-image.yml:176-179` |
| Reverse proxy (TLS, домен → порт) настроен вручную на хосте, его конфигурация (в т.ч. лимиты размера запроса) не версионируется | `chor-app-docs/decisions/0006-deployment-as-implemented.md:34-36,176-177` |
| Сервер публично доступен как `https://chorappserver.wald.pro` | `chor-app-docs/decisions/0006-deployment-as-implemented.md:31` |

## 8. Конфигурация

| Факт | Ссылка |
|---|---|
| Переменные: `PORT`, `POSTGRES_*`, `DATABASE_URL`, `MAIL_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PASSWORD_RESET_TOKEN_TTL_MINUTES`; флагов функций нет | `.env.example`, `.env.test.example` |
| Конфигурация читается через глобальный `ConfigService` (`getOrThrow` для обязательных) | `src/identity/identity.module.ts:41-53`, `src/shared/prisma/prisma.service.ts:23` |

## 9. Решения и документы, касающиеся каталога

| Факт | Ссылка |
|---|---|
| Один глобальный каталог печатных книг, не принадлежащий Community; отдельный модуль | ADR 0010 (TL;DR, §1) |
| Модули: `LibraryModule` (серии, книги, песни, темы каталога, read-порт), `RepertoireModule` (использует read-порт, экспортирует `LibraryUsageQuery`), `LibraryAdminModule` (`/admin/library`, загрузка, предупреждения); без циклов | ADR 0010 §1 |
| Модель MVP: `LibrarySeries`, `LibraryBook` (`seriesId?`, `volume?`), `LibrarySong` (`numberScopeId = seriesId ?? libraryBookId`, уникальность `(numberScopeId, numberKey)`), `LibraryTheme`, `LibrarySongTheme`; без статуса публикации, `publishedAt`, изданий | ADR 0010 §2 |
| Гибридная нумерация: у книги своя нумерация или сквозная в серии; без диапазонов томов | ADR 0010 §3 |
| Загрузка: CSV / Excel / JSON → единая структура; валидация один раз; одна транзакция; повторная загрузка обновляет по номеру, отсутствующие номера архивирует; сначала предпросмотр (dry run) | ADR 0010 §4 |
| Предупреждение superadmin: 409 `LIBRARY_ITEM_IN_USE` с числом использований, повтор с `confirm=true` | ADR 0010 §5 |
| Чтение `GET /library/...` — любой аутентифицированный пользователь; запись `/admin/library/...` — guard-заглушка `SuperAdminGuard`, пропускающая все запросы | ADR 0010 §6 |
| Прототип: Buch 1–4 → серия «Bücher» из 4 томов, 30 тем → `LibraryTheme`; FR-11 и FR-13 черновика Repertoire отменены | ADR 0010 §7 |
| Открытые вопросы ADR 0010: имена и немецкие термины; первые форматы и схема файла; нужен ли JWT на `/admin/library` и выкатывать ли в прод; уведомления Community; смена номера песни | ADR 0010, Open questions |
| Песни каталога никогда не удаляются физически; Community ссылаются на `LibrarySong.id` без FK в БД | ADR 0009 (Consequences), ADR 0010 §4 |
| Кастомная тема Community может совпадать по имени с темой каталога; фильтр показывает их одной строкой по `nameKey`; темы каталога можно назначать песням папок | ADR 0009 (Theme decisions) |
| Модульный монолит: модуль регистрируется в `AppModule`, доступ к другому модулю — только через его `exports` | ADR 0008, `AGENTS.md` (Modular monolith boundaries) |
| Черновик Repertoire описывает однократный импорт встроенного каталога (`CatalogImportsController`, `JsonFileCatalogSource`, `data/catalogs/legacy-v3.json`) — этот механизм отменён ADR 0010 §7 | `docs/feature/repertoire/REPERTOIRE_DESIGN.md` §6, §9 |
| В `glossary.md` нет терминов Library / Catalog / Series; Books и Folder описаны как типы коллекций | `chor-app-docs/glossary.md:30-31` |
| Capability #10 Library и #11 Superadmin (будущая) внесены в разбиение | `chor-app-docs/capability-breakdown.md` |
| Документация в `docs/` сервера — на русском, код и идентификаторы — на английском | `AGENTS.md` (Documentation language) |

## 10. Исходные данные: встроенный каталог legacy (проверено 2026-09-17)

| Факт | Источник |
|---|---|
| JSON в `<script id="song-data" type="application/json">`, строка 684, 131 763 байт; ключи `songs`, `mappe`, `themen_kanonisch`, `meta` | legacy:684, разбор JSON |
| `songs`: 727 записей; `buch`: Buch 1 — 163, Buch 2 — 194, Buch 3 — 206, Buch 4 — 164; номера 1–727 сквозные | разбор JSON; `REPERTOIRE_RESEARCH.md` §4.2 |
| `mappe`: 115 записей, номера 1–115, темы пустые | разбор JSON; `REPERTOIRE_RESEARCH.md` §4.3 |
| Поля записи: `buch`, `nummer` (всегда целое число), `titel`, `thema`, `themen` (массив), `thema_buch_original`; полей автора и аранжировщика нет | разбор JSON |
| Связей песня–тема в `songs`: 728; у одной песни две темы (Nr. 613) | разбор JSON |
| `themen_kanonisch`: 30 тем; все темы песен есть в списке, неиспользуемых тем нет; у темы до 4 источников `quellen` | разбор JSON |
| Одна тема содержит запятую: «Evangelisation, Zuruf»; максимальная длина названия темы — 31 | разбор JSON |
| Названия песен: максимум 42 символа; 238 названий содержат запятую; точек с запятой и двойных кавычек нет; апостроф встречается; 244 названия содержат не-ASCII символы (умлауты, ß) | разбор JSON |
| `meta.buch4_unvollstaendig = false`; `hinweis`: все 4 книги и Mappe полные, без пропусков и дубликатов | разбор JSON |
| Файлов CSV / Excel с каталогом в репозиториях нет; `Chor-App.xlsx` упоминается в описании legacy, но в `chor-app-docs` отсутствует | `chor-app-docs/README.md`, `chor-app-docs/legacy-app-feature-gap.md`, содержимое `chor-app-docs/` |

## 11. Клиент (`chor-app-client`) — только текущее состояние

| Факт | Ссылка |
|---|---|
| Последний коммит: `51b2a19 Merge branch 'feature/dashboard-shell'` | `git log` |
| Фичи: только `src/features/auth`; админских страниц, ролей кроме `ADMINISTRATOR`/`MEMBER`, загрузки файлов (`FormData`) нет | `src/features/`, `grep` по `src/` |
| URL API определяется в рантайме по hostname | `src/utils/apiConfig.ts`, ADR 0006 |

## 12. Сводка пробелов, относящихся к каталогу (факты, без оценки)

- Нет модуля, моделей, миграций и эндпоинтов каталога.
- Нет глобальных (не принадлежащих Community) доменных данных — каталог станет первыми.
- Нет платформенной роли и guard'ов уровня платформы; есть только JWT и guard'ы Community.
- Нет обработки `multipart/form-data`, `@types/multer`, библиотек разбора Excel и CSV.
- Нет глобального exception filter; формат ошибок с `code` реализован только в `CommunityMemberGuard`.
- Нет примеров `createMany`/upsert и массовых операций в одной транзакции.
- Нет barrel-файла `identity`; ESLint-границы нужно расширять для каждого нового модуля.
- Нет механизма флагов функций в конфигурации.
- Лимиты размера запроса на reverse proxy неизвестны (конфигурация не версионируется).
- Исходный каталог существует только как JSON внутри legacy HTML; в нём целые номера, нет авторов и аранжировщиков, есть запятые в названиях песен и темы.
- Нет терминов каталога в `glossary.md`; окончательные имена не выбраны.
