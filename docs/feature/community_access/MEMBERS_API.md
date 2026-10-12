# Управление правами участников (`MembersController`)

**Основание:** ADR 0007, OpenSpec `add-community-access-control` (`../chor-app-docs/openspec/changes/add-community-access-control/`).

## Эндпоинты

Оба доступны только роли `ADMINISTRATOR` (`@RequireRole`), требуют JWT и членства в хоре.

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/communities/:communityId/members` | Участники хора: `membershipId`, `userId`, `name`, `email`, `role`, `permissions` (действующие; у администратора все) |
| `PUT` | `/communities/:communityId/members/:membershipId/permissions` | Тело `{ permissions: CommunityPermission[] }`. Полностью заменяет набор прав, дубли убираются. Ответ: `{ membershipId, permissions }` |

## Коды ответов

| Код | Когда |
|---|---|
| 400 | Неизвестное значение права или `permissions` не массив |
| 401 | Нет или недействителен токен |
| 403 | Не член хора (`NOT_COMMUNITY_MEMBER`) или не администратор (`PERMISSION_DENIED`) |
| 404 | `membershipId` не существует или принадлежит другому хору |
| 409 | Цель — администратор (его права изменить нельзя) |

Изменения применяются сразу: членство читается из БД на каждый запрос, токен не меняется. Новые права видны в `GET /auth/me` в `memberships[].permissions`.

## Реализация

- `application/use-cases/list-community-members.use-case.ts`, `set-member-permissions.use-case.ts`
- Порт `MembershipRepository`: `findById`, `listByCommunityWithUsers`, `save`
- `interface/controllers/members.controller.ts`, `interface/dto/set-member-permissions.dto.ts`
- E2E: `test/identity/members.e2e-spec.ts` (7 сценариев)

## Статус

Код написан, `nest build`, lint и unit-тесты проходят. **E2E-тесты ещё не запускались** (нужна тестовая БД на `localhost:5433`: `docker compose -f docker-compose.test.yml up -d`, затем `npm run test:e2e -- members`). Не сделано: Swagger-DTO (в проекте нет `@nestjs/swagger`), UI на клиенте.

Помимо `PEOPLE_MANAGE`, в коде уже есть право `REPERTOIRE_MANAGE` (ADR 0009); в спеке `add-community-access-control` его нужно дописать.
