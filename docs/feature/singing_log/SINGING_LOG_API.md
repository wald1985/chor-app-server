# Журнал Vortrag и Chorprobe: серверная часть

**Основание:** OpenSpec `add-performance-log` и `add-rehearsal-log` (`../chor-app-docs/openspec/changes/`).
**Статус:** модули `performance-log` и `rehearsal-log` реализованы, unit-тесты и сборка проходят. **Миграции `20261012170000_performance_log` и `20261012180000_rehearsal_log` не применены к БД, e2e-тесты (`test/performance-log/`, `test/rehearsal-log/`) не запускались** — для них нужна БД (`docker compose -f docker-compose.test.yml up -d`, затем `npm run test:e2e -- performances` и `-- rehearsals`).

## Общие правила

- Маршруты `/communities/:communityId/...`, JWT и членство в хоре. **Читать может любой член хора**, менять — только с правом `SINGING_LOG_MANAGE` (у администратора оно есть всегда). Право выдаётся через `PUT /communities/:id/members/:membershipId/permissions`.
- Песня и люди хранятся как `songId`, `pianistId`, `conductorId`, `warmUpLeaderId` **без внешних ключей** на таблицы других модулей.
- **Проверка при записи:** песня видима в хоре и не архивна (`SongLookup`); пианист и дирижёр (и ведущий распевки) — активные `Person` этого хора с подходящей ролью `PIANIST` или `CONDUCTOR` (`PersonLookup`). Ошибка — 400 с кодом `SONG_NOT_FOUND`, `PERSON_NOT_FOUND`, `PERSON_ARCHIVED`, `PERSON_ROLE_MISMATCH`.
- **Разрешение при чтении:** в ответ вкладываются текущие данные песни и людей, в том числе архивных (флаг `archived`). Названия и имена не копируются, поэтому исправления видны в истории. Если песню нельзя найти вообще, `song` равен `null`, строка остаётся.
- Даты — календарные `YYYY-MM-DD` (`@db.Date`), без часовых поясов.
- Записи журнала удаляются физически (единственное исключение из правила «только архив»).

## Vortrag (`/performances`)

| Метод и путь | Право | Описание |
|---|---|---|
| `GET /` | член хора | `?from&to` (включительно), `?limit` (по умолчанию 50, максимум 200); сортировка: дата по убыванию, затем время создания |
| `GET /:performanceId` | член хора | 404, если запись другого хора |
| `POST /` | `SINGING_LOG_MANAGE` | `{ date, songId, pianistId?, conductorId?, note? }` → 201 |
| `DELETE /:performanceId` | `SINGING_LOG_MANAGE` | 204; правки записей нет |

## Chorprobe (`/rehearsals`)

| Метод и путь | Право | Описание |
|---|---|---|
| `GET /` | член хора | `?from&to`; новые сверху, у каждой `entryCount`, без песен |
| `GET /:rehearsalId` | член хора | с песнями в порядке добавления |
| `POST /` | `SINGING_LOG_MANAGE` | `{ date, warmUpLeaderId?, note? }` → 201; **409 `REHEARSAL_DATE_TAKEN`** с `existingRehearsalId`, если на дату уже есть проба |
| `PATCH /:rehearsalId` | `SINGING_LOG_MANAGE` | `{ warmUpLeaderId?, note? }`, `null` очищает; дата не меняется |
| `DELETE /:rehearsalId` | `SINGING_LOG_MANAGE` | 204; **409 `REHEARSAL_NOT_EMPTY`**, если есть песни |
| `POST /:rehearsalId/entries` | `SINGING_LOG_MANAGE` | `{ songId, pianistId?, conductorId?, note? }` → 201; одну песню можно добавить несколько раз |
| `DELETE /:rehearsalId/entries/:entryId` | `SINGING_LOG_MANAGE` | 204 |

Уникальность «одна проба на хор и дату» обеспечивает ограничение БД; одновременное создание даёт ровно один 201 и один 409. Песни добавляются и удаляются построчно (а не перезаписью списка), порядок — по `createdAt`, затем `id`.

## Что изменено в других модулях

- **Repertoire:** `SongLookup` получил `includeInactive` и `lookupMany`, чтобы архивные песни и песни отсоединённых книг оставались доступны для истории (ADR 0009, Q6).
- **People:** экспортирован порт `PersonLookup` (`PERSON_LOOKUP`), возвращает и архивных людей.
- **Identity:** новое право `CommunityPermission.SINGING_LOG_MANAGE`.
