# Catalog Community (Repertoire) — план реализации (фаза 3)

**Дата:** 2026-09-18
**Статус:** черновик на ревью (гейт качества 2 по `../chor-app-docs/development-process.md`)
**Входные данные:** `CATALOG_COMMUNITY_RESEARCH.md`, `CATALOG_COMMUNITY_DESIGN.md`, ADR 0009.

---

## 1. Принятые допущения

| Вопрос | Допущение в плане | Затронутые фазы |
|---|---|---|
| Аутентификация и проверка прав | Используем существующий механизм `IdentityModule` (доступен `CommunityMemberGuard` и валидация пермишенов). | C6 |
| Порядок отображения песен | Сортировка по ключу папки/книги, затем по номеру. Делается на уровне UseCase. | C5 |
| Имена и Роуты | Маршруты будут монтироваться на `/communities/:communityId/...`, хотя модуль называется `RepertoireModule`. | C6 |

## 2. Правила выполнения

- **Ветка — `main`.** Каждая фаза — отдельный коммит (или несколько) прямо в `main` (как было решено для каталога).
- **Один агент, строго последовательно:** весь план выполняет один агент. Фазы выполняются строго в порядке.
- **Шаги внутри каждой фазы:**
  1. Реализация кода и тестов фазы;
  2. Самопроверка: каждый критерий готовности покрыт тестом;
  3. Сверка со слоями DDD и архитектурой ADR 0009;
  4. Прогон базовых команд сборки/линтера, коммит.
- **Миграции** не редактируются задним числом.

## 3. Общие проверки для каждой фазы (quality gates)

| # | Проверка | Команда / способ |
|---|---|---|
| G1 | Сборка | `npm run build` |
| G2 | Unit-тесты | `npm test` |
| G3 | E2E-тесты | `npm run test:e2e` (начиная с C6) |
| G4 | Линтер и форматирование | `npm run lint:check` |
| G5 | Соответствие дизайну | ревью по `CATALOG_COMMUNITY_DESIGN.md` |

---

## 4. Карта фаз

### C1: Схема БД (Prisma)
- **Что делаем:** Добавляем модели `Folder`, `FolderSong`, `BookAttachment`, `Theme` (локальную), `SongThemeAssignment` в `prisma/schema.prisma`. Создаём миграцию (`npx prisma migrate dev --name init_repertoire`).
- **Критерий готовности:** База данных обновлена, Prisma клиент сгенерирован без ошибок.

### C2: Базовый сетап RepertoireModule и Доменные сущности
- **Что делаем:** 
  1. Создаём `RepertoireModule`, регистрируем его в `AppModule`.
  2. Создаём классы (Entities/Value Objects) для слоя domain: `Folder`, `FolderSong`, `BookAttachment`, `Theme`.
  3. Описываем интерфейсы портов: `FolderRepository`, `FolderSongRepository`, `BookAttachmentRepository`, `ThemeRepository`.
- **Критерий готовности:** Сборка проходит. Модуль загружается в Nest.

### C3: Инфраструктура (Prisma Repositories)
- **Что делаем:** Реализуем порты репозиториев (`PrismaFolderRepository`, `PrismaBookAttachmentRepository` и т.д.) и регистрируем в модуле.
- **Критерий готовности:** Методы `create`, `findById`, `findAll` (по communityId) работают и покрыты простыми тестами или моками.

### C4: Use Cases — Пользовательские папки и песни (Mappe & FolderSongs)
- **Что делаем:**
  1. Создание папки (`CreateFolderUseCase`).
  2. Создание песни в папке (`CreateFolderSongUseCase`) — проверяем уникальность номера в рамках папки. Устанавливаем флаг `isNew`.
  3. Архивация папок и песен.
- **Критерий готовности:** Написаны Unit-тесты на проверку уникальности номеров и логику бизнес-валидации.

### C5: Use Cases — Привязки и Агрегация репертуара
- **Что делаем:**
  1. `AttachBookUseCase`: получает `libraryBookId`, запрашивает `LIBRARY_READER.findBooks`, если существует — создаёт `BookAttachment`.
  2. `ArchiveAttachmentUseCase`.
  3. `GetCommunitySongsUseCase`: запрашивает привязанные книги, достаёт из `LIBRARY_READER` глобальные песни. Затем достаёт `FolderSong` из БД. Затем читает `SongThemeAssignment`. Склеивает это в единый DTO-ответ (`SongView[]` со статусом `source: LIBRARY | COMMUNITY`).
- **Критерий готовности:** Unit-тест на агрегацию списка показывает правильную склейку библиотечных песен с локальными темами.

### C6: Контроллеры API и E2E
- **Что делаем:**
  1. Создаём `RepertoireController`.
  2. Прописываем роуты `/communities/:communityId/attachments`, `/communities/:communityId/folders`, `/communities/:communityId/songs`.
  3. Вешаем `@UseGuards(CommunityMemberGuard)` и `@RequirePermission('REPERTOIRE_MANAGE')` для POST/PATCH/DELETE.
  4. Пишем E2E тесты.
- **Критерий готовности:** E2E тесты зелёные. Эндпоинты возвращают ожидаемый клиентом формат (совпадает с `communityAttachmentsApi.ts` на клиенте).
