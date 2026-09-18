# Catalog Community (Repertoire) — дизайн (фаза 2)

**Дата:** 2026-09-18
**Охват:** Модуль `RepertoireModule` (Catalog Community) на сервере `chor-app-server` для управления репертуаром (прикрепленные глобальные книги, локальные папки/Mappe, локальные песни, локальные темы).
**Статус:** Черновик на ревью.
**Основание:** `CATALOG_COMMUNITY_RESEARCH.md`, ADR 0009.

---

## 1. Концепция и цель

Согласно ADR 0009, Репертуар Сообщества состоит из **Привязанных глобальных книг** (Read-Only) и **Собственных папок сообщества** (Mappe). 
Цель фичи — дать возможность сообществу составлять свой рабочий каталог, переиспользуя стандартизированные печатные издания из `LibraryModule` и дополняя их собственным материалом (Folder / FolderSong).

Структура данных `RepertoireModule` во многом симметрична `LibraryModule` (глобальному каталогу), но:
1. **Каждая сущность имеет `communityId`** и недоступна другим сообществам.
2. У `FolderSong` есть флаг `isNew` (недоступен для глобальных книг).
3. Доступны операции изменения и удаления (архивации) только для локальных папок и локальных песен. Глобальные книги можно только "подключить" или "отключить".

---

## 2. Модель данных (Сущности)

```mermaid
classDiagram
  class Folder {
    +String id
    +String communityId
    +String title
    +String titleKey
    +Date archivedAt
  }

  class FolderSong {
    +String id
    +String communityId
    +String folderId
    +String number
    +String numberKey
    +String sortKey
    +String title
    +String author
    +String arranger
    +Boolean isNew
    +Date archivedAt
  }

  class BookAttachment {
    +String id
    +String communityId
    +String libraryBookId
    +Date archivedAt
  }

  class Theme {
    +String id
    +String communityId
    +String name
    +String nameKey
    +Date archivedAt
  }

  class SongThemeAssignment {
    +String communityId
    +String songId
    +Enum themeSource (LIBRARY | COMMUNITY)
    +String themeId
  }

  Folder "1" *-- "many" FolderSong : contains
  FolderSong "1" -- "many" SongThemeAssignment : has themes
  Theme "1" -- "many" SongThemeAssignment : assigned to
```

> **Примечание:** В `SongThemeAssignment` поле `songId` может указывать как на локальный `FolderSong`, так и на глобальный `LibrarySong`. Это позволяет присваивать локальные темы и глобальным печатным песням в контексте одного сообщества.

---

## 3. C4 Уровень 2: Контейнеры

```mermaid
flowchart LR
  user["👤 Community Member"]
  
  subgraph api["chor-app-server (NestJS)"]
    identity["IdentityModule<br/>(Access control)"]
    library["LibraryModule<br/>(Global Catalog)"]
    rep["RepertoireModule 🆕<br/>(Community Catalog)"]
  end
  
  db[("PostgreSQL")]

  user -- "GET /communities/:id/songs<br/>POST /communities/:id/folders<br/>POST /communities/:id/attachments" --> rep
  rep -- "Проверка прав (REPERTOIRE_MANAGE)" --> identity
  rep -- "Читает глобальные книги и песни<br/>через LIBRARY_READER" --> library
  rep -- "Prisma" --> db
  library -- "Prisma" --> db
```

---

## 4. C4 Уровень 3: Компоненты API (`RepertoireModule`)

```mermaid
flowchart TB
  subgraph library["LibraryModule"]
    reader["LIBRARY_READER"]
  end

  subgraph rep["RepertoireModule (src/repertoire)"]
    ctrl["RepertoireController<br/>/communities/:id/songs<br/>/communities/:id/folders<br/>/communities/:id/attachments"]
    
    ucGetSongs["GetCommunitySongsUseCase<br/>(Агрегирует FolderSong + LibrarySong)"]
    ucAttach["AttachBookUseCase"]
    ucDetach["ArchiveAttachmentUseCase"]
    
    ucFolder["Folder Use Cases<br/>(CreateFolder, UpdateFolder, etc)"]
    ucSong["FolderSong Use Cases<br/>(CreateSong, UpdateSong, etc)"]
    ucTheme["Theme Use Cases"]
    
    repPorts["Репозитории<br/>FolderRepo, FolderSongRepo,<br/>AttachmentRepo, ThemeRepo"]
    prisma["Prisma Repositories"]
  end

  ctrl --> ucGetSongs
  ctrl --> ucAttach
  ctrl --> ucDetach
  ctrl --> ucFolder
  ctrl --> ucSong
  
  ucGetSongs --> repPorts
  ucGetSongs --> reader
  ucAttach --> repPorts
  ucAttach --> reader
  
  repPorts --> prisma
```

---

## 5. DFD (Поток данных): Запрос списка песен сообщества

```mermaid
sequenceDiagram
  participant Client
  participant Ctrl as RepertoireController
  participant UC as GetCommunitySongsUseCase
  participant Rep as Attachment & FolderSong Repos
  participant Lib as LIBRARY_READER

  Client->>Ctrl: GET /communities/{cid}/songs
  Ctrl->>UC: execute({ communityId: cid })
  
  UC->>Rep: getActiveAttachments(cid)
  Rep-->>UC: [{ libraryBookId: 'book-1' }, ...]
  
  UC->>Lib: findSongsByBookIds(['book-1'])
  Lib-->>UC: [LibrarySongRef, ...]
  
  UC->>Rep: getActiveFolderSongs(cid)
  Rep-->>UC: [FolderSong, ...]
  
  UC->>Rep: getSongThemeAssignments(cid)
  Rep-->>UC: [SongThemeAssignment, ...]
  
  note over UC: 1. Объединить LibrarySongRef и FolderSong<br/>2. Добавить локальные темы из Assignments<br/>3. Отсортировать (книга/папка -> номер)
  
  UC-->>Ctrl: SongView[] (где каждая песня имеет `source: LIBRARY | COMMUNITY`)
  Ctrl-->>Client: 200 OK
```

---

## 6. Ключевые решения и API Контракты

### 6.1 API Привязок книг (BookAttachment)
- `GET /communities/:communityId/attachments`
- `POST /communities/:communityId/attachments` (body: `{ libraryBookId }`)
- `POST /communities/:communityId/attachments/:attachmentId/archive`

### 6.2 API Пользовательских папок (Folders / Mappe)
- `GET /communities/:communityId/folders`
- `POST /communities/:communityId/folders` (body: `{ title }`)
- `PATCH /communities/:communityId/folders/:folderId`
- `POST /communities/:communityId/folders/:folderId/archive`

### 6.3 API Пользовательских песен (FolderSongs)
- Относятся к конкретной папке.
- `POST /communities/:communityId/folders/:folderId/songs` (body: `{ number, title, author, arranger, isNew, themeIds }`)
- `PATCH /communities/:communityId/folders/:folderId/songs/:songId`
- `POST /communities/:communityId/folders/:folderId/songs/:songId/archive`

### 6.4 API Тем и Присвоений (Themes & Assignments)
Темы сообщества управляются через:
- `GET /communities/:communityId/themes` (вернёт `LibraryTheme` от привязанных книг + `Theme` сообщества)
- `POST /communities/:communityId/themes`
Привязка тем к ЛЮБОЙ песне (даже глобальной) идёт через отдельный эндпоинт в репертуаре:
- `PUT /communities/:communityId/songs/:songId/themes` (перезаписывает массив локальных тем песни).

### 6.5 Права доступа
Все эндпоинты защищены `CommunityMemberGuard`.
Операции изменения (POST, PATCH) требуют наличия разрешения `REPERTOIRE_MANAGE` в роли участника сообщества. Чтение доступно всем членам сообщества.
