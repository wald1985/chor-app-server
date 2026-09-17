# Superadmin — исследование (фаза 1)

**Дата:** 2026-09-17
**Охват:** всё в `chor-app-server` и `chor-app-client`, что затронет capability Superadmin:
отдельная сущность и таблица superadmin, вход и сессия superadmin, CRUD superadmin'ов, назначение
первого superadmin скриптом-посевом, модель разрешений superadmin, замена guard-заглушки
`SuperAdminGuard` каталога, отдельные маршруты admin panel в том же React-клиенте.
**Вне охвата:** реализация полномочий над пользователями и Community (просмотр, поддержка, блокировка,
сброс пароля, бан) — в MVP это только разрешения (раздел 2); сам каталог (`../catalog/`).
**Правила документа:** только факты и ссылки, состояние «как есть». Без рекомендаций и без дизайна.
Процесс: `../chor-app-docs/development-process.md`.

Пути указаны относительно `chor-app-server/`, если не начинаются с `chor-app-client/` или `chor-app-docs/`.
Общие факты о сервере (runtime, Prisma, устройство модуля, линтер, тесты, CI, деплой) собраны в
`../catalog/CATALOG_RESEARCH.md` (далее «CR§») и здесь повторяются только там, где важны для Superadmin.

---

## 1. Состояние репозиториев

| Факт | Ссылка |
|---|---|
| Сервер: последний коммит `3ee8b2d fix(notifications): enforce module boundary between identity and notifications`, ветка `main` | `git log`, `git branch` |
| Клиент: последний коммит `51b2a19 Merge branch 'feature/dashboard-shell'` | `chor-app-client`, `git log` |
| В сервере нет кода, моделей и маршрутов superadmin / admin; `grep -i admin src` находит только роль Community `ADMINISTRATOR` | `src/`, `prisma/schema.prisma` |
| В клиенте нет admin-маршрутов и страниц; роли — только `ADMINISTRATOR` / `MEMBER` Community | `chor-app-client/src/App.tsx`, `chor-app-client/src/features/auth/types.ts:1` |
| Каталог (потребитель Superadmin) спроектирован и спланирован, но не реализован | `../catalog/CATALOG_DESIGN.md`, `../catalog/CATALOG_PLANNING.md` |
| В `chor-app-docs` нет ADR и спецификаций о платформенных ролях; ADR 0010 называет Superadmin будущей capability | `chor-app-docs/decisions/0010-public-book-library.md` §6, `chor-app-docs/capability-breakdown.md` (#11) |
| В legacy-приложении нет понятия администратора системы (однопользовательский HTML-файл) | `chor-app-docs/chor-app_v3.html`, `chor-app-docs/README.md` |

## 2. Входные решения владельца продукта (2026-09-17)

Зафиксированы в разговоре, в документах `chor-app-docs` пока не отражены.

| Решение |
|---|
| Superadmin — **отдельная сущность и отдельная таблица** (не флаг и не роль `User`) |
| Superadmin может создавать, читать, изменять и удалять других superadmin'ов, но **не может удалить себя** |
| Первый superadmin назначается **отдельным скриптом-посевом** |
| Профиль superadmin и admin panel — **отдельные маршруты в том же React-клиенте** |
| Полномочия (как разрешения): каталог; просмотр и управление пользователями и Community (поддержка, блокировка, сброс пароля); бан пользователей. **Реализуется сейчас только работа с каталогом**, остальное — только как разрешения |
| Требования к защите — такие же, как для обычных пользователей |

## 3. Аутентификация пользователей (как есть)

| Факт | Ссылка |
|---|---|
| Вход по email + паролю, bcrypt (`SALT_ROUNDS = 10`) за портом `PasswordHasher` | `src/identity/infrastructure/security/bcrypt-password-hasher.ts:5-15`, `src/identity/domain/ports/password-hasher.port.ts` |
| Email при регистрации и входе: `trim().toLowerCase()`; в БД unique-индекс `users_email_key` | `src/identity/application/use-cases/register.use-case.ts:35`, `login.use-case.ts:37`, `prisma/migrations/20260915143358_init/migration.sql:38` |
| `LoginUseCase` возвращает `{ accessToken, user: { id, email, name }, memberships }`; неверный email или пароль → одна ошибка `InvalidCredentialsError` (401) | `src/identity/application/use-cases/login.use-case.ts:20-63`, `auth.controller.ts:58-69` |
| Payload JWT: `{ sub, email, tokenVersion }`; признака типа субъекта (пользователь / другой) в токене нет | `src/identity/domain/ports/token-issuer.port.ts:1-5` |
| Токен подписывает `JwtService.sign(payload)`; секрет `JWT_SECRET`, срок `JWT_EXPIRES_IN` (по умолчанию `1d`) из `JwtModule.registerAsync` в `IdentityModule` | `src/identity/infrastructure/security/jwt-token-issuer.ts`, `src/identity/identity.module.ts:41-53`, `.env.example` |
| Одна Passport-стратегия с именем по умолчанию `'jwt'`: токен из `Authorization: Bearer`, `validate` ищет `User` по `sub` через `UserRepository.findById`, сравнивает `tokenVersion`, иначе 401 | `src/identity/infrastructure/security/jwt.strategy.ts:15-39` |
| `JwtAuthGuard` = `AuthGuard('jwt')`; `request.user` = `{ id, email, name }` | `src/identity/interface/guards/jwt-auth.guard.ts`, `jwt.strategy.ts:9-13,38` |
| Токен с `sub`, которого нет в `users`, отклоняется стратегией (401) | `jwt.strategy.ts:29-32` |
| `tokenVersion` увеличивается при смене и сбросе пароля в той же записи; старые токены становятся недействительны | `src/identity/infrastructure/prisma/prisma-user.repository.ts:20-29`, ADR 0004 |
| Смена пароля: `POST /auth/change-password` (JWT), проверка текущего пароля, новый ≥ 8 символов, ответ `{ accessToken }` | `auth.controller.ts:81-100`, `src/identity/interface/dto/change-password.dto.ts`, `change-password.use-case.ts` |
| Сброс пароля: `forgot-password` (молча, если email не найден; код по email, `PASSWORD_RESET_TOKEN_TTL_MINUTES`), `reset-password` (код → новый пароль + вход) | `forgot-password.use-case.ts:26-53`, `reset-password.use-case.ts:44-76` |
| `PasswordResetToken` ссылается на `User` (`userId`, FK cascade) | `prisma/schema.prisma:44-55` |
| `GET /auth/me` (JWT) → `{ user, memberships }` | `auth.controller.ts:71-79`, `get-current-user.use-case.ts` |
| Минимальная длина пароля — 8 (`@MinLength(8)`), максимальная не ограничена | `src/identity/interface/dto/login.dto.ts`, `register.dto.ts`, `change-password.dto.ts` |
| Ограничения частоты запросов (rate limiting, `@nestjs/throttler`) нет; блокировки после неудачных попыток входа нет | `package.json`, `src/main.ts` |
| Server-side сессий и отзыва токенов нет, кроме `tokenVersion` | ADR 0004 (Consequences) |
| ADR 0004 обязателен для всех защищённых эндпоинтов: «validate the bearer JWT, resolve the `User` it names» | `chor-app-docs/decisions/0004-auth-mechanism.md` (Consequences) |

## 4. Авторизация (как есть)

| Факт | Ссылка |
|---|---|
| Роли и разрешения существуют только на `CommunityMembership`: `CommunityRole` (`ADMINISTRATOR`, `MEMBER`), `CommunityPermission` (`PEOPLE_MANAGE`) | `prisma/schema.prisma:9-16,57-71`, `src/identity/domain/value-objects/` |
| Разрешения — захардкоженный enum Prisma + TS; `ADMINISTRATOR` получает все значения через `effectivePermissions()` | `src/identity/domain/value-objects/community-permission.ts`, `community-membership.entity.ts:50-59` |
| `CommunityMemberGuard` читает `@RequirePermission` / `@RequireRole` через `Reflector` и отвечает 403 с `code: PERMISSION_DENIED` и `required` | `src/identity/interface/guards/community-member.guard.ts:85-124` |
| Membership читается из БД на каждый запрос; разрешения в JWT не кладутся | `community-member.guard.ts:52`, ADR 0007 |
| Платформенных ролей, разрешений, guard'ов и декораторов нет | `src/`, `prisma/schema.prisma` |
| У `User` нет полей статуса (заблокирован, забанен), а стратегия и use cases такой статус не проверяют | `prisma/schema.prisma:29-42`, `jwt.strategy.ts`, `login.use-case.ts` |

## 5. Потребитель: каталог (спроектирован, не реализован)

| Факт | Ссылка |
|---|---|
| Маршруты записи каталога — `/admin/library/...` в `LibraryAdminModule`, под `JwtAuthGuard` + `SuperAdminGuard` | `../catalog/CATALOG_DESIGN.md` §5, §9.3 |
| `SuperAdminGuard` — заглушка в `src/library-admin/interface/guards/super-admin.guard.ts`, пропускает любой запрос с `request.user`; capability Superadmin должна заменить реализацию или перенести guard | `../catalog/CATALOG_DESIGN.md` §5 (правила зависимостей), D3; `../catalog/CATALOG_PLANNING.md` C0 |
| Матрица доступа каталога после Superadmin: без JWT → 401, обычный пользователь → 403, superadmin → 2xx | `../catalog/CATALOG_DESIGN.md` §12.1 |
| Чтение каталога `GET /library/...` — любой аутентифицированный пользователь | `../catalog/CATALOG_DESIGN.md` §9.1 |
| Push C5 каталога (открытый `/admin/library` в проде) заблокирован до подтверждения OQ-3 | `../catalog/CATALOG_PLANNING.md` §1, §2 |
| Открытый вопрос каталога OQ-8: кто и когда менял каталог (`updatedBy`) не хранится | `../catalog/CATALOG_DESIGN.md` §15 |
| Используемые в каталоге формулировки ошибок: 401 без JWT; 403 `PERMISSION_DENIED` в Community | `../catalog/CATALOG_DESIGN.md` §9.4, `community-member.guard.ts:116-122` |

## 6. Хранение данных и посев

| Факт | Ссылка |
|---|---|
| Таблицы, не принадлежащие Community: `users`, `password_reset_tokens`, `communities`; таблицы каталога — спроектированы | `prisma/schema.prisma`, `../catalog/CATALOG_DESIGN.md` §8 |
| Seed-механизма нет: нет `prisma.seed`, нет папки `scripts/`, миграции без данных | CR§3, корень репозитория |
| Интерактивная транзакция используется только при регистрации | `src/identity/infrastructure/prisma/prisma-registration.repository.ts:21-43` |
| Docker-образ: `npm install` без `--omit=dev` (dev-зависимости, в т. ч. `ts-node`, есть в образе), `COPY . .` копирует весь репозиторий кроме `.dockerignore`, запуск `node dist/main`; `NODE_ENV=production` задаётся только при запуске контейнера | `Dockerfile:12-21`, `.dockerignore`, `docker-compose.yml:12`, `node_modules/.bin/ts-node` |
| Команды на хосте выполняются одноразовым контейнером: `docker compose run --rm -T server npx prisma migrate deploy` | `.github/workflows/docker-image.yml:176` |
| `nest build` компилирует только `src/` (`rootDir: ./src`) | `tsconfig.build.json` |
| Скрипт `test:debug` уже использует `ts-node/register` | `package.json:20` |
| Конфигурация `.env` на хосте ведётся вручную | ADR 0006 |

## 7. Тестовая инфраструктура, относящаяся к аутентификации

| Факт | Ссылка |
|---|---|
| E2E `test/identity/auth.e2e-spec.ts`: регистрация, дубликат email (409), логин, неверный пароль (401), `me` для Administrator и Member, 401 без токена, письма не отправляются | `test/identity/auth.e2e-spec.ts:7-227` |
| E2E guard'а Community через тестовый контроллер `communities/:communityId/test-access` | `test/identity/community-member-guard.e2e-spec.ts`, `test/utils/test-community.controller.ts` |
| Фабрики создают пользователей только через HTTP-регистрацию (`createAdmin`, `createMember`) | `test/utils/factories.ts` |
| `resetDb` очищает все таблицы `public` | `test/utils/reset-db.ts` |

## 8. Клиент (`chor-app-client`)

| Факт | Ссылка |
|---|---|
| React 19, Redux Toolkit, react-router-dom 7 (`BrowserRouter`, `Routes`, без data-router), react-bootstrap; TanStack React Query в зависимостях **отсутствует**, хотя ADR 0001 и `AGENTS.md` его предписывают | `chor-app-client/package.json`, `chor-app-client/AGENTS.md:31,56-57` |
| Маршруты: `/` (под `RequireAuth` + `AppLayout`) с вкладками из `navItems`, `konto`, `change-password`; гостевые `/login`, `/register`, `/forgot-password`, `/reset-password` под `RequireGuest` | `chor-app-client/src/App.tsx:17-86` |
| При старте `bootstrap()` загружает токен и вызывает `GET /auth/me`; при ошибке токен удаляется | `chor-app-client/src/features/auth/authSlice.ts:36-69` |
| Состояние `auth`: `status`, `user`, `memberships`, `remember`; одно состояние сессии на приложение | `authSlice.ts:14-29` |
| Токен хранится под одним ключом `chorApp.accessToken` в `localStorage` («запомнить») или `sessionStorage` | `chor-app-client/src/features/auth/tokenStorage.ts:1-27` |
| HTTP-клиент: модульная переменная `authToken`, заголовок `Authorization: Bearer`; экспортированы только `get` и `post`; тело всегда `JSON.stringify` (нет `FormData`); таймаут 15 с | `chor-app-client/src/lib/http/client.ts:15-20,86-88,130-141` |
| Разбор ошибок берёт `message` и `error`; поле `code` из ответа сервера не читается | `client.ts:22-46,112-125` |
| `RequireAuth` пускает при `status === "authenticated"`, иначе редирект на `/login` с `state.from` | `chor-app-client/src/features/auth/components/RequireAuth.tsx` |
| Типы клиента `CommunityMembership` не содержат `permissions`, хотя сервер их уже возвращает | `chor-app-client/src/features/auth/types.ts:3-7`, CR§5 |
| URL API в проде определяется по hostname (`chorapp.wald.pro` → `https://chorappserver.wald.pro`) | `chor-app-client/src/utils/apiConfig.ts` |
| nginx клиента: `try_files $uri /index.html` — любые пути SPA, в т. ч. будущие `/admin/...`, отдаются приложением | `chor-app-client/nginx.conf` |
| Документация клиента — на русском в `docs/feature/<feature>/`; есть `docs/feature/dashboard-shell/DASHBOARD_SHELL.md` | `chor-app-client/AGENTS.md:147-151`, `chor-app-client/docs/` |

## 9. Решения и документы, касающиеся Superadmin

| Факт | Ссылка |
|---|---|
| Разрешения внутри Community — захардкоженный enum, по одному значению на действие, проверяются на сервере на каждый запрос | ADR 0007 |
| Модули — по bounded context, регистрируются в `AppModule`, доступ только через `exports`; ESLint `moduleBoundaries` нужно расширять | ADR 0008, CR§6 |
| Каталог: управление — «future superadmin capability (own profile, admin panel, endpoints, guards — not designed yet)» | ADR 0010 §6 |
| Capability #11 Superadmin (future) в разбиении: «platform-level role, own profile, admin panel, admin endpoints and guards» | `chor-app-docs/capability-breakdown.md` |
| В `glossary.md` нет терминов Superadmin / admin panel / бан / блокировка | `chor-app-docs/glossary.md` |
| Язык: UI немецкий, код и домен английский, документация серверного и клиентского репозиториев — русский | `chor-app-docs/glossary.md`, `AGENTS.md` (обоих репозиториев) |

## 10. Сводка пробелов, относящихся к Superadmin (факты, без оценки)

- Нет сущности, таблицы, репозитория и use cases superadmin.
- Нет механизма посева и папки `scripts/`; dev-зависимости (`ts-node`) при этом есть в Docker-образе.
- JWT не различает тип субъекта; единственная стратегия ищет субъекта только в `users`.
- Нет платформенных ролей, разрешений, guard'ов и декораторов; есть только разрешения Community.
- Нет rate limiting и блокировки при подборе пароля (для пользователей тоже).
- Нет статусов пользователя (блокировка, бан) в модели и в проверках аутентификации.
- Сброс пароля по email завязан на `User` (`password_reset_tokens.userId`).
- Каталог ждёт замены `SuperAdminGuard`; до неё `/admin/library` открыт любому пользователю с JWT.
- Клиент: одна сессия и один ключ токена; нет admin-маршрутов; HTTP-клиент без `PATCH`/`PUT`/`DELETE`-хелперов, без `multipart` и без чтения `code`.
- Нет терминов Superadmin в глоссарии и ADR о платформенной роли.
