# Catalog Community (Repertoire) — исследование (фаза 1)

**Дата:** 2026-09-18
**Охват:** реализация модуля `RepertoireModule` (или `CatalogCommunity`) на сервере, хранение привязок (`BookAttachment`) к глобальным книгам библиотеки, реализация пользовательских папок (`Folder` / Mappe) и песен (`FolderSong`), а также пользовательских тем (`Theme`) в рамках одного Community, согласно ADR 0009.
**Вне охвата:** клиентский UI (кроме контрактов API), внутреннее устройство `LibraryModule` (глобального каталога), авторизация (опираемся на уже существующую логику `identity`), Legacy Import.
**Правила документа:** только факты и ссылки, состояние «как есть». Без рекомендаций и без дизайна. Процесс: `../chor-app-docs/development-process.md`.

Пути указаны относительно `chor-app-server/`.

## 1. Состояние репозитория и схемы данных

| Факт | Ссылка |
|---|---|
| На сервере отсутствует модуль `RepertoireModule` (или `CatalogCommunityModule`). | `src/` (нет папки `repertoire` или `catalog-community`) |
| В схеме БД (Prisma) нет сущностей `Folder`, `FolderSong`, `BookAttachment`, `Theme` (пользовательская), `SongThemeAssignment`. | `prisma/schema.prisma` |
| Сущности глобальной библиотеки (`LibraryBook`, `LibrarySong`, `LibraryTheme`, `LibrarySeries`) уже реализованы в `LibraryModule` и хранятся в БД. | `src/library/domain/entities/`, `prisma/schema.prisma` |
| Поведение и архитектура фичи описаны и утверждены в ADR 0009. | `../chor-app-docs/decisions/0009-repertoire-folders-attachments-themes.md` |

## 2. API контракты (ожидания клиента)

| Факт | Ссылка |
|---|---|
| Клиентское приложение ожидает эндпоинты для получения привязанных книг: `GET /communities/:communityId/attachments`. Возвращает `BookAttachmentView[]`. | `../chor-app-client/src/features/catalog/api/communityAttachmentsApi.ts:8` |
| Клиент ожидает эндпоинт для привязки книги: `POST /communities/:communityId/attachments` с телом `{ libraryBookId }`. | `../chor-app-client/src/features/catalog/api/communityAttachmentsApi.ts:13` |
| Клиент ожидает эндпоинт для отвязки (удаления): `DELETE /communities/:communityId/attachments/:attachmentId`. | `../chor-app-client/src/features/catalog/api/communityAttachmentsApi.ts:22` |
| Клиент ожидает эндпоинт для архивации привязки: `POST /communities/:communityId/attachments/:attachmentId/archive`. | `../chor-app-client/src/features/catalog/api/communityAttachmentsApi.ts:27` |
| На данный момент все запросы клиента к `/communities/...` падают с 404, так как контроллеров для этого пути на сервере нет. | `src/app.module.ts`, поиск `@Controller('communities')` |

## 3. Взаимодействие с LibraryModule (глобальным каталогом)

| Факт | Ссылка |
|---|---|
| В `LibraryModule` реализован и экспортируется `LIBRARY_READER`. | `src/library/library.module.ts:137` |
| `LIBRARY_READER` предоставляет интерфейс `LibraryReader`, который содержит методы `findBooks(ids)`, `findSongsByBookIds(bookIds, options)`, `findSongs(ids)`, `lookupSong(query)`, `findThemes(ids)`, `listThemes(options)`. | `src/library/application/reader/library-reader.ts:32` |
| Методы возвращают облегчённые объекты `LibraryBookRef`, `LibrarySongRef`, `LibraryThemeRef` без привязки к конкретному `Community`. | `src/library/application/reader/library-reader.ts` |
| Глобальные книги не могут быть изменены изнутри Community (read-only). | `../chor-app-docs/decisions/0009-repertoire-folders-attachments-themes.md:11` |

## 4. Контекст ADR 0009: BookAttachment, Folder и Themes

| Факт | Ссылка |
|---|---|
| Привязка глобальной книги к Community реализуется через `BookAttachment` (сущность, хранящая `communityId` и `libraryBookId`). Физического копирования песен не происходит. | ADR 0009 (TL;DR) |
| Пользовательские списки называются `Folder` (Mappe). Каждое Community может иметь несколько папок. | ADR 0009 (TL;DR) |
| Пользовательские песни называются `FolderSong` и принадлежат конкретному `Folder`. Номера песен уникальны в рамках одной папки. Допускается флаг `isNew`. | ADR 0009 (Model in RepertoireModule) |
| Темы бывают двух видов: `LibraryTheme` (из глобального каталога, read-only) и `Theme` (пользовательские темы Community). | ADR 0009 (Ownership) |
| `SongThemeAssignment` позволяет привязывать к песне (как `FolderSong`, так и `LibrarySong`) любую доступную в Community тему (как библиотечную, так и пользовательскую). | ADR 0009 (Model in RepertoireModule) |
| Чтение списка песен Community = `FolderSong` + `LibrarySong` (из привязанных книг). Слияние происходит на уровне приложения (service/use-case), а не SQL JOIN. | ADR 0009 (Reading and searching) |
| Общая точка поиска (SongLookup) должна возвращать формат: `{ songId, source: LIBRARY \| COMMUNITY, container: { id, title, type: BOOK \| FOLDER, ... }, ... }`. | ADR 0009 (Reading and searching) |

## 5. Требования к разработке (Quality Gates)

| Факт | Ссылка |
|---|---|
| Разработка должна вестись строго по одной фазе (сначала Research, затем Design, затем Planning, затем Implementation). | `../chor-app-docs/development-process.md` |
| После этапа Research (текущего), необходимо перейти к фазе Design (создание `CATALOG_COMMUNITY_DESIGN.md` с моделями, DFD и C4 диаграммами). | `../chor-app-docs/development-process.md` |
