# Catalog — план реализации (фаза 3)

**Дата:** 2026-09-17
**Статус:** черновик на ревью (гейт качества 2 по `../chor-app-docs/development-process.md`)
**Входные данные:** `CATALOG_RESEARCH.md` (CR§…), `CATALOG_DESIGN.md` (D§… — разделы, D1…D16 — решения, OQ-… — открытые вопросы),
`chor-app-docs/decisions/0010-public-book-library.md`.

---

## 1. Принятые допущения

Открытые вопросы D§15 на ревью дизайна не закрыты, поэтому план исходит из временных решений дизайна.
Если ответ другой, меняются только перечисленные фазы.

| Вопрос | Допущение в плане | Затронутые фазы |
|---|---|---|
| OQ-1 Имена | `Library*`, папки `src/library`, `src/library-admin`, маршруты `/library`, `/admin/library` | все (переименование — механическое, до C0 дешевле всего) |
| OQ-2 Формат номера | `^[0-9]{1,6}[a-z]{0,3}$`, без учёта регистра | C1 |
| OQ-3 Заглушка superadmin | JWT обязателен, `SuperAdminGuard` пропускает всех. **Push коммитов C5 и дальше (они выкатывают `/admin/library` в прод) — только после явного подтверждения OQ-3 владельцем продукта** | C0, C5 |
| OQ-4 Форматы | порядок JSON → CSV → XLSX, каждый — отдельная фаза; XLSX можно отложить без влияния на остальные | C7, C9, C10 |
| OQ-5 Доп. поля песни | нет | C1, C7 |
| OQ-6 Лимит прокси | проверяется на хосте до push коммита C7 (первая загрузка файлов в проде) | C7 |
| OQ-7 Эндпоинт usage | нет | C5 |
| OQ-8 Аудит изменений | нет | — |

**Уточнение дизайна при планировании:** `id` новых записей для `createMany` генерирует приложение через порт
`IdGenerator` (D§12.4); raw-запросы — `SET LOCAL lock_timeout` и `pg_advisory_xact_lock` (D§12.2). Внесено в `CATALOG_DESIGN.md`.

## 2. Правила выполнения

- **Ветка — `main`** (решение владельца, 2026-09-17). Отдельной feature-ветки и PR нет. Каждая фаза — отдельный коммит (или несколько) прямо в `main`.
- **Push = деплой.** Push в `main` запускает CI и деплой в прод (CR§7). Поэтому:
  - коммит фазы создаётся только после зелёных G1–G8 локально;
  - push делается после коммита фазы, и следующая фаза начинается только после зелёного CI и деплоя этого push;
  - если CI или деплой красные — следующая фаза не начинается, исправление идёт новым коммитом в той же фазе;
  - **блокирующие точки push:** до push C5 — подтверждение OQ-3 (открытый `/admin/library` в проде); до push C7 — проверка OQ-6 (лимит reverse proxy); без подтверждения коммиты остаются локальными, работа над следующими фазами не начинается;
  - миграция `library` (C2) уходит в прод с push C2; она только добавляет таблицы (NFR-3) и не влияет на работающий код.
- **Независимость от People.** Каталог не трогает `CommunityPermission` и таблицы People; если работа по People тоже идёт в `main`, перед каждым коммитом делается `git pull --rebase`.
- **Фаза завершена**, только если выполнены её критерии готовности и общие проверки раздела 3.
- **Миграции** только добавляют объекты (NFR-3). Закоммиченную миграцию не редактируют, исправления — новой миграцией.
- **Один агент, строго последовательно** (`development-process.md`, фаза 4; подтверждено владельцем 2026-09-17): весь план — от C0 до C12 — выполняет один агент. Без субагентов, без параллельных задач, без разделения ролей между агентами. Фазы выполняются строго в порядке раздела 4; внутри фазы шаги ниже тоже идут строго по очереди. Следующая фаза начинается только после коммита, push и зелёного CI/деплоя предыдущей. «Параллельные» запросы в e2e-тестах (C2, C7) — это сценарии тестов, а не параллельная работа агента.
- **Шаги внутри каждой фазы:**
  1. реализация кода и тестов фазы;
  2. самопроверка: каждый критерий готовности покрыт тестом или ручной проверкой, недостающие тесты дописаны;
  3. сверка с `CATALOG_DESIGN.md`, ADR 0002 (слои) и ADR 0008 (границы) по чек-листу фазы;
  4. для фаз с 🔒 — проверка безопасности по чек-листу C11;
  5. прогон гейтов G1–G8, коммит.
- **Отклонение от дизайна** не делается молча: сначала правится `CATALOG_DESIGN.md` с пометкой, что и почему изменилось, потом код.
- **Лимиты линтера** (`complexity` 10, `max-lines-per-function` 60, CR§6) не отключаются в новом коде. Если функция не укладывается, она делится.

## 3. Общие проверки для каждой фазы (quality gates)

Все гейты уже работают в репозитории (CR§6).

| # | Проверка | Команда / способ |
|---|---|---|
| G1 | Сборка | `npm run build` |
| G2 | Unit-тесты | `npm test` |
| G3 | E2E-тесты | `docker compose -f docker-compose.test.yml up -d && npm run test:e2e` |
| G4 | Линтер и форматирование | `npm run lint:check` |
| G5 | Метрики сложности | правила `complexity`, `max-depth`, `max-lines-per-function`, `max-params` (входят в G4) |
| G6 | Зависимости без high/critical | `npm audit --audit-level=high --omit=dev` |
| G7 | Слои и границы модулей | `no-restricted-imports` (входит в G4) + `library`, `library-admin` в `moduleBoundaries` (с C0) |
| G8 | Соответствие дизайну | ревью по чек-листу фазы |

---

## 4. Карта фаз

```mermaid
flowchart LR
  C0["C0 Каркас модулей,<br/>границы, guard-заглушка"] --> C1["C1 Домен:<br/>VO, агрегаты, порты"]
  C1 --> C2["C2 Схема, миграция,<br/>репозитории, UoW"]
  C2 --> C3["C3 Чтение:<br/>/library, LibraryReader"]
  C3 --> C4["C4 Use cases<br/>правки каталога"]
  C4 --> C5["C5 Admin API правки<br/>+ проверка использования"]
  C5 --> C6["C6 ImportPlanner"]
  C6 --> C7["C7 Загрузка JSON:<br/>preview / apply"]
  C7 --> C8["C8 Конвертер legacy"]
  C8 --> C9["C9 Парсер CSV"]
  C9 --> C10["C10 Парсер XLSX"]
  C10 --> C11["C11 Безопасность<br/>и матрица доступа"]
  C11 --> C12["C12 Документация<br/>и финальная проверка"]
```

| Фаза | Результат | Оценка |
|---|---|---|
| C0 | `LibraryModule`, `LibraryAdminModule` зарегистрированы; ESLint-границы; `SuperAdminGuard` | S |
| C1 | VO, 4 агрегата, ошибки, порты — чистый TS | M |
| C2 | Модели Prisma, миграция `library`, Prisma-репозитории, `LibraryUnitOfWork` с блокировкой | M |
| C3 | 6 запросов, `LibraryController`, экспорт `LibraryReader` | M |
| C4 | 17 use cases правки (серии, книги с переносом, песни, темы) | L |
| C5 | 4 admin-контроллера, маппер ошибок, `ArchiveWithUsageCheck`, `NoUsageProvider` | M |
| C6 | `ImportPlanner`, `ImportPlan`, `hash()` | L |
| C7 | Порт парсера, JSON-адаптер, `PreviewImport`, `ApplyImport`, `AdminImportsController` | L |
| C8 | `scripts/convert-legacy-catalog.ts` + e2e загрузки встроенного каталога | S |
| C9 | CSV-адаптер | M |
| C10 | XLSX-адаптер | M |
| C11 | E2E матрицы доступа и атак на загрузку, отчёт безопасности | S |
| C12 | `AGENTS.md`, документы `chor-app-docs`, smoke в проде | S |

S — до половины дня, M — до дня, L — до двух дней.

---

## 5. Фазы

### Фаза C0 — каркас модулей, границы, guard-заглушка

**Дизайн:** D§5, D§5.1, D1, D3; NFR-2.

**Изменения:**
- `src/library/library.module.ts` (imports `IdentityModule`), `src/library/index.ts` — barrel (пока экспортирует только модуль).
- `src/library-admin/library-admin.module.ts` (imports `IdentityModule`, `LibraryModule`).
- `src/library-admin/interface/guards/super-admin.guard.ts`: `CanActivate`, всегда `true`; комментарий-ссылка на ADR 0010 §6 и OQ-3; в `canActivate` проверка, что `request.user` есть (иначе 401) — защита от использования без `JwtAuthGuard`.
- `src/app.module.ts`: `LibraryModule`, `LibraryAdminModule`.
- `eslint.config.mjs`: `library`, `library-admin` в `moduleBoundaries`.

**Тесты:**
- Unit `super-admin.guard.spec.ts`: с `request.user` → `true`; без → `UnauthorizedException`.
- Существующие e2e проходят (модули поднимаются в `createTestApp`).

**Критерии готовности:**
- [ ] Намеренный импорт `src/library/domain/...` из `src/library-admin` даёт ошибку линтера (проверить руками и откатить).
- [ ] `AppModule` поднимается; маршрутов каталога ещё нет.

**Коммит:** `chore(library): scaffold library and library-admin modules`

---

### Фаза C1 — домен: value objects, агрегаты, порты

**Дизайн:** D§6, D§6.1, D§6.2, D11, D13, D16.

**Изменения (`src/library/domain/`):**
- `value-objects/`: `library-title.ts`, `song-number.ts` (`value`, `key`, `sortKey`), `song-title.ts`, `optional-text.ts`, `theme-name.ts` (запрет `|`), `volume.ts`, `book-placement.ts`.
- `entities/`: `library-series.entity.ts` (`archive(now, activeBookCount)`), `library-book.entity.ts` (`numberScopeId()`, `place`), `library-song.entity.ts` (`create(book, props)`, `update`, `renumber`, `moveTo(book)`, `setThemes`, `archive`, `restore`), `library-theme.entity.ts`. Архивный агрегат запрещает изменения, архивация и восстановление идемпотентны.
- `errors/library.errors.ts`: все ошибки D§9.4 доменного уровня (`LibraryValueInvalidError(field)`, `BookPlacementInvalidError`, `…NotFoundError`, `…TitleTakenError`, `VolumeTakenError`, `SongNumberTakenError`, `NumberScopeConflictError(numbers)`, `ThemeNameTakenError`, `LibraryItemArchivedError(type, id)`, `SeriesHasActiveBooksError(bookIds)`).
- `ports/`: `series-repository.port.ts`, `book-repository.port.ts`, `song-repository.port.ts`, `theme-repository.port.ts`, `library-unit-of-work.port.ts`, `id-generator.port.ts`, `clock.port.ts` (если нужен для `now`).

**Тесты (unit, табличные):**
- `SongNumber`: `" 22 a"` → `22a`; `22A` key `22a`; sortKey `22` → `00000022`, `22b` → `00000022b`, `100` → `00000100`; сортировка `22 < 22a < 22b < 100`; `22-1`, `II`, `1234567`, `22abcd`, пусто — ошибка; целое `22` → `"22"`.
- `LibraryTitle` / `ThemeName`: пробелы схлопываются; 100 — ок, 101 — ошибка; `Evangelisation, Zuruf` — ок; `a|b` — ошибка для темы.
- `BookPlacement`: только серия или только том — ошибка.
- `LibraryBook.numberScopeId()`: в серии → `seriesId`, без серии → `id`.
- `LibrarySong`: `moveTo` книги той же серии сохраняет `numberScopeId`; изменения архивной песни — ошибка; `setThemes` убирает дубликаты.
- `LibrarySeries.archive` с активными книгами — ошибка.

**Критерии готовности:**
- [ ] `src/library/domain` без импортов Nest и Prisma (G7).
- [ ] Каждое правило таблицы D§6.2, относящееся к агрегатам, покрыто тестом.

**Коммит:** `feat(library): add catalog domain model`

---

### Фаза C2 — схема, миграция, репозитории, unit of work 🔒

**Дизайн:** D§8, D§12.2, D§12.3, D§12.4, D12, D16.

**Изменения:**
- `prisma/schema.prisma`: 5 моделей D§8.1; миграция `library` (`npx prisma migrate dev --name library`).
- `src/library/infrastructure/prisma/`:
  - `prisma-series.repository.ts`, `prisma-book.repository.ts`, `prisma-song.repository.ts`, `prisma-theme.repository.ts` — мапперы `toDomain` / `toPersistence`; `P2002` → доменные ошибки занятости с дочитыванием существующей записи;
  - `SongRepository`: `findByScope(numberScopeId, numberKey)`, `listByBookIds(ids, { includeArchived })`, `findNumberKeys(scopeId)`, `saveMany`, `createMany`, `rescope(bookId, newScopeId)`; темы песни пишутся вместе с песней (`deleteMany` + `createMany` по `songId`);
  - `prisma-library-unit-of-work.ts`: `run(fn)` = `$transaction(fn, { timeout: 60_000, maxWait: 10_000 })`, внутри первым делом `SET LOCAL lock_timeout = '5s'` и `SELECT pg_advisory_xact_lock(<константа>)`; ошибка ожидания блокировки (`55P03`) → `LibraryBusyError`; репозитории внутри `run` используют клиент транзакции.
- `src/library/infrastructure/crypto-id-generator.ts` (`randomUUID`).
- Провайдеры портов в `library.module.ts`.

**Тесты (интеграционные, `test/library/repositories.e2e-spec.ts`, тестовая БД):**
- уникальность: название книги в другом регистре, том в серии, номер в серии для двух книг → доменные ошибки; `(NULL, volume)` не конфликтует;
- `rescope`: песни книги получают `numberScopeId` серии;
- удаление строк с FK запрещено (`onDelete: Restrict`) — попытка `DELETE` через Prisma в тесте падает;
- две параллельные транзакции `run`: вторая ждёт первую; при удержании > 5 с — `LibraryBusyError`;
- `createMany` песен с `id` от `IdGenerator` + связи с темами одной транзакцией; ошибка внутри — откат всего.

**Критерии готовности:**
- [ ] Миграция содержит только `CREATE TABLE`, индексы и FK из D§8.1.
- [ ] Raw-запросы только из D§12.2, без интерполяции пользовательских данных.
- [ ] `resetDb` очищает новые таблицы (он берёт все таблицы `public`, CR§6) — проверено тестом.

**Коммит:** `feat(library): add catalog schema and prisma repositories`

---

### Фаза C3 — чтение: `/library` и `LibraryReader`

**Дизайн:** D§9.1, D§9.5, D§11.4, D§12.4; FR-1…FR-4, FR-12.

**Изменения:**
- `application/views/`: `SeriesView`, `BookSummaryView`, `BookView`, `SongView`, `ThemeView` + функции маппинга.
- `application/queries/`: `list-series`, `list-books` (`seriesId`, `q`, `includeArchived`, `songCount`), `get-book`, `lookup-song` (ровно одно из `bookId`/`seriesId`; для `bookId` дополнительно `song.bookId = bookId`), `get-song`, `list-themes` (`songCount` по активным песням). Сортировка названий `localeCompare(…, 'de')`.
- `application/reader/library-reader.ts` — реализация `LibraryReader` поверх запросов, `*Ref`-объекты.
- `interface/controllers/library.controller.ts` под `JwtAuthGuard`; `lookup` объявлен до `:songId`; `ParseUUIDPipe`; DTO запросов с преобразованием `"true"`.
- `interface/http/library-error-mapper.ts` — `toLibraryHttpException(error)` для всех ошибок D§9.4.
- `index.ts`: экспорт `LIBRARY_READER`, типов `LibraryReader`, `LibraryBookRef`, `LibrarySongRef`, `LibraryThemeRef`, функции `toLibraryHttpException`; `library.module.ts` `exports: [LIBRARY_READER]`.

**Тесты:**
- Unit запросов с in-memory репозиториями: сортировка книг серии по тому; `q` без учёта регистра; архивные скрыты по умолчанию; `lookup` по серии находит песню тома 2; по чужой книге той же серии — `null`.
- Unit маппера ошибок: каждая строка D§9.4 → статус и `code`.
- E2E `test/library/library-read.e2e-spec.ts`: данные создаются через репозитории (API правки ещё нет); все эндпоинты D§9.1; без JWT → 401; `lookup` без области или с обеими → 400 `LIBRARY_LOOKUP_SCOPE_INVALID`; неизвестный id → 404 с `code`.
- Тест границ: модуль-заглушка в `test/utils` импортирует `LIBRARY_READER` из `src/library` (barrel) и получает данные.

**Критерии готовности:**
- [ ] Ответы совпадают с примерами D§9.1 по полям.
- [ ] Наружу из `LibraryModule` экспортируются только `LIBRARY_READER`, типы `*Ref` и маппер ошибок (в C4 — команды).

**Коммит:** `feat(library): expose catalog read API and LibraryReader`

---

### Фаза C4 — use cases правки каталога

**Дизайн:** D§6.2, D§9.3, D§11.5, D12, D13; FR-7…FR-10.

**Изменения (`src/library/application/use-cases/`):**
- `series/`: `create-series`, `rename-series`, `archive-series` (проверка активных книг), `restore-series`.
- `books/`: `create-book` (серия активна, том свободен), `update-book` (название; перенос — через `PlaceBook`), `place-book` (D§11.5: пересечение номеров → `NumberScopeConflictError`, `rescope` в транзакции), `archive-book`, `restore-book`.
- `songs/`: `create-song` (книга активна, номер свободен в области, темы активны), `update-song` (включая `renumber`), `set-song-themes`, `archive-song`, `restore-song`.
- `themes/`: `create-theme`, `rename-theme`, `archive-theme`, `restore-theme`.
- Все записи — внутри `LibraryUnitOfWork.run`. Без `save`, если состояние не изменилось.
- `index.ts` + `library.module.ts`: экспорт use cases команд для `LibraryAdminModule`.

**Тесты (unit, in-memory репозитории и фейковый UoW):**
- каждое правило D§6.2 уровня use case: занятые названия (в т. ч. архивными), том занят, книга в архивную серию, песня в архивной книге, привязка архивной темы, архивная тема остаётся у песни;
- `place-book`: без конфликта — все песни в новой области; с конфликтом — ничего не изменено, в ошибке список номеров; вывод из серии — область = `bookId`;
- `update-song` с новым номером: `id` прежний; номер занят → ошибка;
- архивация/восстановление повторно — без записи.

**Критерии готовности:**
- [ ] 17 use cases, по одному файлу; `max-params` не отключался.
- [ ] Нет use case, пишущего вне `LibraryUnitOfWork.run`.

**Коммит:** `feat(library): add catalog editing use cases`

---

### Фаза C5 — admin API правки и проверка использования 🔒

**Дизайн:** D§5 (правила зависимостей), D§9.3, D§9.4, D§11.3, D1, D2, D3; FR-7…FR-11.

**Изменения (`src/library-admin/`):**
- `application/ports/library-usage-provider.port.ts`: `countUsage(refs: { type: 'BOOK'|'SONG'|'THEME'; id }[]) → { ref, communities, references }[]`.
- `infrastructure/no-usage-provider.ts` — всегда нули; провайдер по токену в `library-admin.module.ts`.
- `application/archive-with-usage-check.ts`: `archiveBook|Song|Theme(id, confirmInUse)` → `LibraryItemInUseError(usage)` или вызов use case из `LibraryModule`.
- `interface/controllers/`: `admin-series`, `admin-books`, `admin-songs`, `admin-themes` — все маршруты D§9.3, guards `JwtAuthGuard` + `SuperAdminGuard` на уровне класса; маппинг через `interface/http/library-admin-error-mapper.ts` (D14): обрабатывает `LibraryItemInUseError`, остальные ошибки передаёт в `toLibraryHttpException`, экспортированный из barrel `src/library` (C3 добавляет его в экспорт).
- DTO с `whitelist`: без `id`, `numberScopeId`, `archivedAt`; `PATCH` — минимум одно поле; `seriesId: null` вместе с `volume: null`.

**Тесты:**
- Unit `archive-with-usage-check.spec.ts` с фейковым провайдером (`communities: 3`): без подтверждения — ошибка с usage; с подтверждением — use case вызван; при нулевом использовании подтверждение не нужно.
- E2E `test/library/library-admin.e2e-spec.ts`: успешные пути всех эндпоинтов; перенос книги в серию с конфликтом → 409 `LIBRARY_NUMBER_SCOPE_CONFLICT` и данные не изменились; архивация серии с активной книгой → 409; изменение архивного → 409 `LIBRARY_ITEM_ARCHIVED`; e2e с подменой `LibraryUsageProvider` через `overrideProvider` → 409 `LIBRARY_ITEM_IN_USE`, затем `confirmInUse=true` → 200; без JWT → 401.

**Критерии готовности:**
- [ ] Ответы и коды — D§9.3, D§9.4.
- [ ] `src/library-admin` импортирует `src/library` только через barrel (G7).

**Коммит:** `feat(library-admin): add catalog admin editing API with usage check`

---

### Фаза C6 — `ImportPlanner`

**Дизайн:** D§7.1, D§7.5 (проверки уровня плана), D§7.6, D8, D9, D10.

**Изменения (`src/library/domain/services/`):**
- `import-plan.ts`: структура плана (серии, книги, темы, песни с действиями `CREATE|UPDATE|MOVE|RESTORE|ARCHIVE|PLACE|UNCHANGED`, ошибки плана), `summary()`, `archivedRefs()`, `hash()` — SHA-256 канонического JSON (сортированные ключи и элементы). SHA-256 — через `node:crypto` (G7 запрещает в `domain/` только Nest и Prisma; модуль Node без I/O это правило не нарушает).
- `import-planner.ts`: `plan(parsedFile, snapshot)`, разбит на функции `planSeries`, `planBooks`, `planThemes`, `planSongsForBook`, `planArchive`, `detectScopeConflicts` (каждая ≤ 60 строк, complexity ≤ 10).
- Проверки файла уровня VO (D§7.5) — функция `validateParsedFile` в домене, общая для всех парсеров: `VALUE_REQUIRED`, `VALUE_INVALID`, `BOOK_PLACEMENT_INCONSISTENT`, `DUPLICATE_NUMBER`, `DUPLICATE_VOLUME`, `TOO_MANY_ROWS`, лимит 200 ошибок.

**Тесты (unit, табличные, фикстуры-снимки):**
- пустой каталог + 4 тома серии → create 1 серия, 4 книги, 30 тем, 727 песен (на урезанной фикстуре и на полной из C8);
- тот же файл повторно → всё `UNCHANGED`, тот же `hash()`;
- изменено название одной песни и темы другой → `UPDATE` с полями;
- номер исчез из книги → `ARCHIVE`; вернулся → `RESTORE` + `UPDATE`;
- граница томов сдвинута (песня 164 из тома 2 в том 1, обе книги в файле) → `MOVE`;
- та же песня, но том 2 не в файле → `NUMBER_SCOPE_CONFLICT`;
- книга файла перенесена в серию с занятыми номерами книги вне файла → `NUMBER_SCOPE_CONFLICT`;
- том занят книгой вне файла → `VOLUME_TAKEN`;
- название книги в другом регистре → книга сопоставлена, написание не меняется;
- архивная тема в файле → `RESTORE`;
- `hash()` меняется при изменении любого значения и не зависит от порядка строк файла.

**Критерии готовности:**
- [ ] Каждая строка таблиц D§7.5 и D§7.6 покрыта тестом.
- [ ] `ImportPlanner` — чистая функция без I/O.

**Коммит:** `feat(library): add catalog import planner`

---

### Фаза C7 — загрузка JSON: preview / apply 🔒

**Дизайн:** D§7.4, D§9.2, D§10.2, D§11.1, D§11.2, D4, D5, D12.

**Изменения:**
- `package.json`: `@types/multer` (dev). G6.
- `src/library/domain/ports/library-file-parser.port.ts`: `parse(buffer, filename) → ParsedLibraryFile | FileErrors`.
- `src/library/infrastructure/parsing/json-library-file-parser.ts`: проверка `format`, известные поля, типы; копирование по известным ключам.
- `library-file-parser-registry.ts`: выбор адаптера по расширению (`.json` сейчас; `.csv`, `.xlsx` → `FILE_TYPE_UNSUPPORTED` до C9/C10).
- `application/use-cases/imports/`: `preview-import` (parse → validate → snapshot → plan), `apply-import` (в `LibraryUnitOfWork.run`: snapshot заново → plan → сравнение `planHash` → запись в порядке D§11.2: серии, книги/`place`/`rescope`, темы, песни, связи).
- `src/library-admin/interface/controllers/admin-imports.controller.ts`: `FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } })`; превышение → 413 `FILE_TOO_LARGE`; `apply` проверяет `planHash` и `ArchiveWithUsageCheck` для `plan.archivedRefs()` до вызова `apply`.
- Логирование: размер, формат, `summary`; содержимое файла не логируется.

**Тесты:**
- Unit JSON-парсера: валидный файл; без `format`; неизвестное поле; `number` числом и строкой; `__proto__` в объекте не попадает в результат.
- Unit use cases с фейками: `apply` с чужим `planHash` → `PlanChangedError`; запись не начиналась.
- E2E `test/library/library-import-json.e2e-spec.ts`: preview → apply → чтение через `/library` показывает данные; повторный preview того же файла — только `UNCHANGED`; изменение каталога правкой между preview и apply → 409 `LIBRARY_IMPORT_PLAN_CHANGED`; файл 6 МБ → 413; файл с ошибками → 400 со списком `errors`; два параллельных `apply` → один 200, второй 200 без изменений или 409 `LIBRARY_BUSY`/`PLAN_CHANGED` (без дублей); с подменённым `LibraryUsageProvider` архивация через файл без `confirmInUse` → 409.
- Производительность (NFR-5): e2e загрузки файла на 1 000 песен в пустой каталог и повторной загрузки укладывается в 5 с (порог в тесте с запасом, результат в описании коммита).

**Критерии готовности:**
- [ ] После ошибки на любом шаге `apply` в БД нет частичных изменений (тест с искусственной ошибкой после записи книг).
- [ ] `id` существующих песен после повторной загрузки не изменились (NFR-7).

**Коммит:** `feat(library): add JSON catalog import with preview and apply`

---

### Фаза C8 — конвертер встроенного каталога legacy

**Дизайн:** D§7.7, D15; FR-13.

**Изменения:**
- `scripts/convert-legacy-catalog.ts`: чтение HTML, извлечение `song-data`, преобразование в `chor-app-library/v1`, проверки инвариантов (727 песен, 4 тома с диапазонами 1–163 / 164–357 / 358–563 / 564–727, 30 тем, все темы песен в списке), выход с кодом ≠ 0 при расхождении.
- `package.json`: скрипт `catalog:convert-legacy` (`ts-node scripts/convert-legacy-catalog.ts`).
- Решить и зафиксировать в коммите: входит ли `scripts/` в `lint:check` (сейчас нет, CR§6). Предпочтительно добавить `scripts/**/*.ts` в линт.

**Тесты:**
- Unit функции преобразования на маленькой фикстуре HTML (2 книги, 3 темы).
- E2E `test/library/legacy-catalog.e2e-spec.ts`: если `../chor-app-docs/chor-app_v3.html` существует — конвертация + preview + apply: 1 серия, 4 книги, 727 песен, 30 тем, песня 613 с двумя темами; `lookup?seriesId&number=200` → том 2. Если файла нет (CI сервера) — тест помечается `skip` с сообщением.

**Критерии готовности:**
- [ ] Выходной JSON проходит preview без ошибок.
- [ ] Результат не коммитится в репозиторий сервера.

**Коммит:** `feat(library): add legacy catalog converter script`

---

### Фаза C9 — парсер CSV

**Дизайн:** D§7.2, D§7.5, D5, D6, D7.

**Изменения:**
- Выбор библиотеки: `csv-parse` (кандидат D5). Перед коммитом — `npm audit` локально; если high/critical — альтернатива или остановка и вопрос владельцу.
- `csv-library-file-parser.ts`: BOM; разделитель по заголовку (`;`, если в заголовке `;` и нет `,` вне кавычек, иначе `,`); заголовки без учёта регистра; `COLUMN_MISSING`/`COLUMN_UNKNOWN`; пустые строки пропускаются; номер строки в ошибках (с учётом заголовка); группировка строк в книги; `themes` через `|`.
- Реестр: `.csv` → CSV-адаптер.

**Тесты (unit, фикстуры в `src/library/infrastructure/parsing/__fixtures__/`):**
- `,` и `;`; BOM; `"Halleluja, lobet Gott"`; `""` внутри кавычек; перевод строки в кавычках; умлауты и `ß`; `Gebet|Hochzeit`; тема `Evangelisation, Zuruf`; неизвестная колонка; пропущенная обязательная; разные `series` у строк одной книги; не-UTF-8 файл → `FILE_UNREADABLE`.
- E2E: CSV-вариант файла C7 даёт тот же `planHash`, что JSON с теми же данными.

**Критерии готовности:**
- [ ] G6 зелёный после добавления зависимости.
- [ ] Одинаковые данные в CSV и JSON дают одинаковый план.

**Коммит:** `feat(library): add CSV catalog import`

---

### Фаза C10 — парсер XLSX

**Дизайн:** D§7.3, D§12.2 (zip bomb, формулы), D5.

**Изменения:**
- Выбор библиотеки: `exceljs` или `read-excel-file` — та, что проходит `npm audit --audit-level=high --omit=dev` и умеет потоковое чтение или ограничение строк. Если ни одна не проходит — фаза останавливается, XLSX откладывается (OQ-4), в `CATALOG_DESIGN.md` фиксируется решение.
- `xlsx-library-file-parser.ts`: первый лист; значения ячеек как текст, для формул — сохранённое значение; числовой номер → строка без `.0`; прерывание при > 20 000 строк; `.xls`, `.xlsm` → `FILE_TYPE_UNSUPPORTED`.
- Реестр: `.xlsx` → XLSX-адаптер.

**Тесты (unit, фикстуры генерируются в тесте библиотекой):**
- тот же набор данных, что в C9; номер `22` числом; ячейка-формула; лишний второй лист игнорируется; повреждённый файл → `FILE_UNREADABLE`; файл > 20 000 строк → `TOO_MANY_ROWS` без полной загрузки в память (проверка времени/памяти в пределах теста).
- E2E: XLSX-вариант файла C7 → тот же `planHash`, что JSON.

**Критерии готовности:**
- [ ] G6 зелёный.
- [ ] Одинаковые данные в XLSX, CSV и JSON дают одинаковый план.

**Коммит:** `feat(library): add XLSX catalog import`

---

### Фаза C11 — безопасность и матрица доступа 🔒

**Дизайн:** D§12.1, D§12.2, D§12.3; NFR-1, NFR-6, NFR-7, NFR-8, NFR-9.

**Изменения:** только тесты и исправления найденного.
- `test/library/access-matrix.e2e-spec.ts`: D§12.1 для текущей заглушки — без JWT → 401 на всех маршрутах `/library` и `/admin/library`; любой пользователь с JWT → 2xx.
- `test/library/upload-abuse.e2e-spec.ts`: 413 для большого файла; 2 файла в одном запросе → 400; неподдерживаемое расширение; JSON с `__proto__`/`constructor`; CSV с 20 001 строкой; XLSX с формулой; имя файла с `../`.
- Чек-лист проверки безопасности (тем же агентом отдельным шагом):
  - ни одна таблица каталога не содержит `communityId` (NFR-1);
  - в `src/library*` нет `$queryRaw`/`$executeRaw`, кроме D§12.2;
  - DTO не принимают `id`, `numberScopeId`, `archivedAt`;
  - нет `delete`/`deleteMany` по таблицам серий, книг, песен, тем (только `library_song_themes` при замене тем);
  - содержимое файлов и значения из них не логируются;
  - лимиты multer и строк заданы константами и покрыты тестами;
  - `npm audit` (G6);
  - заглушка `SuperAdminGuard` — единственное место решения о доступе к `/admin/library`.

**Критерии готовности:**
- [ ] Матрица и тесты атак проходят.
- [ ] Отчёт проверки безопасности — в описании коммита C11; найденное исправлено или вынесено в задачи с обоснованием.

**Коммит:** `test(library): cover access matrix and upload abuse cases`

---

### Фаза C12 — документация и финальная проверка

**Изменения:**
- `chor-app-server/AGENTS.md`: «Implemented so far» — каталог; `/admin/library` открыт до Superadmin; как загрузить встроенный каталог (C8).
- `chor-app-docs`: `glossary.md` (термины каталога после OQ-1), `capability-breakdown.md` (#10 — реализован), ADR 0010 (ответы на OQ, если поменялись), `domain-model.md` (раздел каталога).
- `CATALOG_DESIGN.md`: статус «реализован», список отклонений.

**Критерии готовности:**
- [ ] G1–G8 зелёные локально и в CI после push.
- [ ] Деплой зелёный; миграция `library` применена (с C2).
- [ ] Smoke в проде: `GET /library/books` отвечает; preview + apply JSON-файла конвертера (C8); `GET /library/songs/lookup?seriesId=…&number=613` → Buch 4 с двумя темами.
- [ ] Блокирующие точки OQ-3 (C5) и OQ-6 (C7) пройдены — отметка с датой в этом документе.

**Коммиты:** `docs: document catalog` (server, `main`), `docs: update catalog decisions and glossary` (docs repo).

---

## 6. Чек-лист гейта 2 (ревью плана)

- [ ] Каждое требование FR-1…FR-13 и NFR-1…NFR-9 из D§2 закрыто фазой (таблица ниже).
- [ ] Каждая фаза проверяется отдельно, коммитится и пушится в `main` без поломки прода.
- [ ] Весь план выполняет один агент строго последовательно; блокирующие точки push (C5, C7) устраивают.
- [ ] Порядок фаз не нарушает зависимостей D§5 (Library ← LibraryAdmin; Repertoire не нужен).
- [ ] Допущения раздела 1 подтверждены или исправлены.
- [ ] Порядок форматов JSON → CSV → XLSX и возможность отложить XLSX устраивают.

| Требование | Фазы |
|---|---|
| FR-1, FR-2, FR-3, FR-4 | C2, C3 |
| FR-5, FR-6 | C6, C7, C9, C10 |
| FR-7, FR-8, FR-9, FR-10 | C1, C4, C5 |
| FR-11 | C5, C7 |
| FR-12 | C3 |
| FR-13 | C8 |
| NFR-1 | C2, C11 |
| NFR-2 | C0 (границы), все фазы (G7) |
| NFR-3 | C2, C12 |
| NFR-4 | C3 (маппер), C5, C7 |
| NFR-5 | C7 |
| NFR-6 | C2, C7 |
| NFR-7 | C1, C6, C7 |
| NFR-8 | C7, C9, C10 (G6) |
| NFR-9 | C1, C2, C11 |

## 7. Риски плана

| Риск | Что делаем |
|---|---|
| Библиотеки XLSX не проходят `npm audit --audit-level=high` | C10 последняя из форматов; остановка и отложенный XLSX без влияния на JSON/CSV |
| `ImportPlanner` не укладывается в лимиты сложности | разбиение на функции заложено в C6; правила не отключаются |
| Открытый `/admin/library` в проде | push C5 заблокирован до подтверждения OQ-3 |
| Лимит reverse proxy меньше 5 МБ, загрузка падает только в проде | проверка OQ-6 до push C7; при необходимости правка на хосте или снижение лимита в дизайне |
| Таймаут транзакции Prisma при большой загрузке | явный `timeout` в UoW (C2), замер NFR-5 в C7 |
| Каждая фаза сразу уходит в прод | коммит только после зелёных гейтов; фазы C0–C4 не добавляют маршрутов записи; следующая фаза только после зелёного деплоя |
| Незаконченная фича видна в проде между фазами (например, `/library` без данных после C3) | допустимо: маршруты только читают пустой каталог, клиент их ещё не использует |
| Один агент пропускает свои ошибки | обязательные шаги самопроверки и чек-лист C11; ревью человеком в блокирующих точках C5, C7 и после C12 |
| Имена поменяются после OQ-1 | переименование до C0 — бесплатно; позже — отдельный механический коммит до C12 |
