# Repertoire — исследование (фаза 1)

**Дата:** 2026-09-16
**Охват:** всё, что затронет фича Repertoire (`Song`, коллекции Books / Folder / NewSongs, `Theme`, добавление песен, привязка тем, поиск) в `chor-app-server`, а также источники требований: старое приложение и документы в `chor-app-docs`.
**Правила документа:** только факты и ссылки, состояние «как есть». Без рекомендаций и без дизайна. Процесс: `../chor-app-docs/development-process.md`.

Пути указаны относительно `chor-app-server/`, если не начинаются с `chor-app-docs/`. Старое приложение — `chor-app-docs/chor-app_v3.html` (далее «legacy»).

Общие факты о сервере (запуск, Prisma, устройство модуля `identity`, аутентификация, линтер, тесты, CI, конфигурация) уже собраны в `../people/PEOPLE_RESEARCH.md`, разделы 2–6 (далее «PR§»), и здесь не повторяются. Ниже — только то, что нужно добавить или что изменилось с тех пор.

---

## 1. Состояние репозитория на момент исследования

| Факт | Ссылка |
|---|---|
| Последний коммит: `a6b20c2 add feature docs` (документы People) | `git log` |
| Незакоммиченные изменения: `eslint.config.mjs` (правила `complexity`, `max-depth`, `max-lines-per-function`, `max-params`, `no-restricted-imports` для `domain/` и `interface/` — содержимое фазы 0.1 плана People), `src/identity/interface/controllers/auth.controller.ts`, `src/identity/interface/dto/login.dto.ts` | `git status`, `git diff` |
| В `src/` и `prisma/` нет кода и моделей, связанных с песнями, темами или коллекциями | `grep -ri "song\|theme\|repertoire" src prisma` → пусто |
| Папка `docs/feature/repertoire/` существует; этот документ — первый файл в ней | `docs/feature/` |
| Фичи People и Community Access не реализованы: в схеме нет `Person`, `CommunityPermission`; guard'а контекста Community нет | `prisma/schema.prisma`, `src/identity/` (см. PR§4.5, PR§9) |

## 2. Серверные факты, существенные для Repertoire

Дополнение к PR§2–6.

| Факт | Ссылка |
|---|---|
| Данные в Prisma пока не засеиваются: нет seed-скрипта, нет `prisma.seed` в `package.json` и `prisma.config.ts` | `package.json`, `prisma.config.ts`, `prisma/` |
| Все существующие миграции — только DDL; миграций с вставкой данных нет | `prisma/migrations/*/migration.sql` |
| Миграции применяются `prisma migrate deploy` при каждом деплое (см. PR§3); отдельного шага загрузки данных в деплое нет | `.github/workflows/docker-image.yml`, `chor-app-docs/decisions/0006-deployment-as-implemented.md` |
| В схеме нет полнотекстовых индексов и расширений Postgres (`pg_trgm`, `unaccent`) | `prisma/schema.prisma`, миграции |
| В коде нет параметров пагинации и сортировки ни у одного эндпоинта | `src/identity/interface/controllers/auth.controller.ts` |
| Регистрация создаёт `Community` в транзакции без каких-либо дополнительных данных для новой Community | `src/identity/infrastructure/prisma/prisma-registration.repository.ts:20-42` |
| Максимальная длина строк в существующих DTO не ограничивается (`MinLength` есть, `MaxLength` нет) | `src/identity/interface/dto/register.dto.ts` |

## 3. Решения и документы в `chor-app-docs`, касающиеся Repertoire

| Факт | Ссылка |
|---|---|
| Bounded context Repertoire: `Song` (агрегат, идентичность `(collection, number)`, нумерация независима по коллекциям), `SongCollectionType` (`Books \| Folder \| NewSongs`, value object/enum, только Books участвует в сквозном поиске по темам), `Theme` (сущность, а не строка; «многие ко многим» с `Song`) | `chor-app-docs/domain-model.md` (раздел Repertoire) |
| Открытые вопросы доменной модели: стратегия id агрегатов (UUID или последовательность); где проверять уникальность `(collection, number)` — в домене, в БД или в обоих | `chor-app-docs/domain-model.md` (Still open) |
| Глоссарий: Lied → Song, Thema → Theme, Bücher → Books, Mappe → Folder, Neue Lieder → NewSongs; страницы «Lieder verwalten» → Manage songs, «Themensuche» → Theme search | `chor-app-docs/glossary.md:23,29-32,47-48` |
| Описание возможностей в конфиге OpenSpec: три независимые коллекции; Books 1–727 сквозной нумерацией в 4 книгах со сквозными темами; Folder 115 песен без тем; NewSongs полностью пользовательская; поиск по темам только в Books; добавление песен в любую коллекцию и привязка дополнительных тем | `chor-app-docs/openspec/config.yaml` (Core capabilities) |
| Разбиение на функции: Repertoire (#5) зависит только от `communityId`; на него будут ссылаться Rehearsal Log и Performance Log (`songId`), Reporting читает его данные | `chor-app-docs/capability-breakdown.md` |
| Каждая сущность вне Identity принадлежит одной Community | `chor-app-docs/decisions/0003-multi-tenancy-identity.md`, `chor-app-docs/domain-model.md` (Tenant scoping) |
| Маршруты внутри Community — `/communities/:communityId/...`; разрешения — захардкоженный enum `CommunityPermission`, каждая фича добавляет свои значения | `chor-app-docs/decisions/0007-community-scoped-requests-and-permissions.md` |
| План People: фазы 0.1 (гейты качества), 0.2 (e2e с БД), A1–A4 (Community Access) идут до реализации People и являются общей основой | `docs/feature/people/PEOPLE_PLAN.md` (разделы 4–5) |
| Для Repertoire нет OpenSpec change и спецификаций | `chor-app-docs/openspec/changes/`, `chor-app-docs/openspec/specs/` |
| Режим разработки: один агент, последовательно внутри фичи | `chor-app-docs/development-process.md` (Phase 4) |

## 4. Legacy: встроенный каталог песен

### 4.1 Хранение

| Факт | Ссылка |
|---|---|
| Каталог встроен в HTML как JSON в `<script id="song-data" type="application/json">`, ~131 КБ | legacy:684 |
| Структура: `{ songs, mappe, themen_kanonisch, meta }` | legacy:688-692 |
| Данные одинаковы для всех пользователей файла; в приложении их нельзя изменить или удалить, только дополнить (см. 5) | legacy:688-692, 1212-1282 |

### 4.2 Books (`songs`)

| Факт | Источник |
|---|---|
| 727 песен, номера 1–727 без пропусков и дубликатов | анализ JSON из legacy:684 |
| Книги и диапазоны номеров: Buch 1 — 1–163 (163), Buch 2 — 164–357 (194), Buch 3 — 358–563 (206), Buch 4 — 564–727 (164) | анализ JSON |
| Поля каждой записи: `buch` (`"Buch 1"`…`"Buch 4"`), `nummer`, `titel`, `thema`, `themen` (массив), `thema_buch_original` | анализ JSON |
| У всех 727 песен есть хотя бы одна тема; у одной песни две темы (Nr. 613 «Der Herr segne dich»: `Gebet`, `Hochzeit`) | анализ JSON |
| `thema` всегда равно `themen[0]` | анализ JSON |
| У 135 песен `thema_buch_original` (название раздела в книге) отличается от `thema` (объединённого названия) | анализ JSON |
| Максимальная длина названия песни во встроенных данных — 42 символа | анализ JSON |
| 14 названий повторяются в Books (без учёта регистра) под разными номерами | анализ JSON |

### 4.3 Folder (`mappe`)

| Факт | Источник |
|---|---|
| 115 песен, номера 1–115 без дубликатов | анализ JSON |
| Те же поля, `buch` = `"Mappe"`; `thema`, `thema_buch_original` пустые, `themen` пустой у всех 115 | анализ JSON |

### 4.4 Темы (`themen_kanonisch`)

| Факт | Источник |
|---|---|
| 30 объединённых тем: `{ thema, quellen: [{ buch, original, von, bis }] }` — какие разделы каких книг (с диапазоном номеров) сведены в одну тему; до 4 источников на тему | анализ JSON |
| Пример: «Lob und Dank» ← Buch 1 «Lob und Dank» 1–35, Buch 2 «Lob und Dank» 164–206, Buch 4 «Lob und Preis» 564–581, Buch 4 «Dank und Anbetung» 582–600 | анализ JSON |
| Полный список: Abendmahl, Advent, Auferstehung, Dienst, Einsegnung, Einweihung, Erntedankfest, Evangelisation, Zuruf, Gebet, Geistlicher Kampf, Gnadenstand und Heilsgewissheit, Haus des Herrn, Heiligung, Himmelfahrt, Himmlische Heimat, Hingabe, Hochzeit, Lob und Dank, Neujahr, Palmsonntag, Passion, Pfingsten, Schlusslieder, Tag des Herrn, Taufe, Trost und Ermunterung, Verschiedene Themen, Weihnachten, Wiederkunft, Zu verschiedenen Anlässen | анализ JSON |
| Одна из тем содержит запятую в названии: «Evangelisation, Zuruf» | анализ JSON |
| В выпадающем списке поиска по темам у каждой встроенной темы показан список книг-источников, у пользовательских — пометка «(eigenes Thema)» | legacy:2034-2050 |

### 4.5 `meta`

| Факт | Ссылка |
|---|---|
| `buch4_unvollstaendig: false`; `hinweis` сообщает, что все 4 книги и Mappe полные, без пропусков и дубликатов | анализ JSON |
| При `buch4_unvollstaendig = true` показывается глобальное предупреждение | legacy:1408-1413 |

## 5. Legacy: пользовательские данные репертуара

### 5.1 Собственные песни (`CUSTOM`)

| Факт | Ссылка |
|---|---|
| Ключ localStorage `chorlieder_custom_songs_v1`, структура `{ buecher: [], mappe: [], neue_lieder: [] }` | legacy:792, 817-826 |
| Рабочие списки: `SONGS_ALL = songs + custom.buecher`, `MAPPE_ALL = mappe + custom.mappe`, `NEUE_LIEDER_ALL = custom.neue_lieder` (для NewSongs встроенных данных нет) | legacy:834-837 |
| Форма «Neues Lied hinzufügen»: коллекция (Bücher 1-4 / Mappe / Neue Lieder), книга (только для Bücher), номер (`min=1`), название, тема (необязательно, только для Bücher, из списка существующих тем) | legacy:566-600, 1205-1211 |
| Проверки при добавлении: номер и непустое после trim название обязательны; номер уникален внутри коллекции; для Bücher уникальность проверяется по всем 4 книгам вместе | legacy:1212-1231 |
| Для Bücher номер не проверяется на попадание в диапазон выбранной книги | legacy:1227-1230 |
| Песня в Bücher без темы сохраняется с `thema: '(kein Thema zugeordnet)'`, `themen: []` | legacy:1229 |
| Таблица «Eigene hinzugefügte Lieder» показывает только пользовательские песни, сортировка по `buch`, затем по номеру; у каждой кнопка «Löschen» | legacy:1244-1261 |
| Удалить можно только пользовательскую песню; удаление без подтверждения; вместе с песней удаляются её дополнительные темы | legacy:1262-1282 |
| Встроенные песни нельзя удалить; редактирования названия или номера нет ни для каких песен | legacy:1198-1282 |
| Удаление песни не меняет записи журнала | legacy:1262-1282 (нет обращения к `LOG`) |

### 5.2 Дополнительные темы (`EXTRA_THEMEN`)

| Факт | Ссылка |
|---|---|
| Ключ `chorlieder_extra_themen_v1`, запись `{ sammlung: 'Buecher'\|'Mappe'\|'Neue Lieder', nummer, thema }`; тема хранится строкой | legacy:840-850 |
| При загрузке дополнительные темы дописываются в `themen` песен (без дубликатов); если у песни не было темы, `thema` становится первой | legacy:858-867 |
| Форма «Bestehendem Lied ein weiteres Thema zuordnen»: песня из всех трёх коллекций (подписи `Nr. X – Titel (Buch/Mappe/Neue Lieder)`, сортировка по подписи), тема из списка **или** новая, введённая вручную (приоритет у ручной) | legacy:612-633, 1284-1301, 1316-1345 |
| Уже привязанная тема повторно не добавляется (точное совпадение строки, с учётом регистра) | legacy:1328-1331 |
| Новая тема, введённая вручную, сразу появляется во всех списках тем | legacy:869-875, 1340-1344 |
| Список всех тем = встроенные 30 + темы из `EXTRA_THEMEN`, сортировка `localeCompare(…, 'de')` | legacy:869-875 |
| Отдельной сущности «тема» у пользовательских тем нет: тема существует, пока есть хотя бы одна привязка | legacy:869-875, 1363-1377 |
| Таблица «Zusätzlich zugeordnete Themen» с удалением по строке; удалить можно только дополнительную привязку, встроенные темы песни — нет | legacy:638-639, 1346-1377 |
| Дополнительные темы можно привязать и к Mappe / Neue Lieder, хотя встроенных тем там нет | legacy:1284-1301 |

## 6. Legacy: использование песен другими частями

| Факт | Ссылка |
|---|---|
| Поиск песни при записи Vortrag / Chorprobe: коллекция + номер → название и темы; если не найдена — сообщение «nicht gefunden», запись всё равно создаётся | legacy:1415-1430, 1432-1447 |
| Запись журнала хранит **копию** данных песни на момент записи: `sammlung`, `buch`, `nummer`, `titel`, `thema`; для ненайденной — `titel: '(nicht in Datenbank gefunden)'` | legacy:1441-1456 |
| Выбор коллекции при записи: «Bücher 1-4 (fortlaufend nummeriert)», «Mappe (eigene Nummerierung)», «Neue Lieder (eigene Nummerierung)» | legacy:250-255 |
| Статистика (Auswertung) группирует записи по `sammlung\|nummer`, показывает название и тему из записей журнала, фильтры по контексту и коллекции, топ-15 и полную таблицу с количеством и датой последнего исполнения | legacy:1946-1997, 430 |
| Поиск по темам (вкладка Themensuche): только `SONGS_ALL` (Books + пользовательские в Books); фильтр по теме (точное совпадение) и подстроке в названии или номере | legacy:536-551, 2052-2064 |
| Отдельные поиски для Mappe и Neue Lieder: подстрока в названии или номере, без фильтра по теме; без запроса показывается вся коллекция | legacy:553-563, 2066-2080 |
| Темы, привязанные к песням Mappe / Neue Lieder, в поиске по темам не участвуют | legacy:2052-2076 |
| Экспорт / импорт бэкапа и синхронизация через файл включают `custom_songs` и `extra_themen`; объединение аддитивное: песни — по номеру внутри коллекции, темы — по ключу `sammlung\|nummer\|thema` | legacy:905-957, 1010, 2094, 2155-2166 |

## 7. Сводка текущих пробелов, относящихся к Repertoire (факты, без оценки)

- В сервере нет ни одной модели, таблицы или эндпоинта для песен, коллекций и тем.
- Нет механизма загрузки начальных данных (seed, data-миграции).
- Встроенный каталог (727 + 115 песен, 30 тем с источниками) существует только в legacy-файле как JSON.
- Предусловия, общие с People (гейты 0.1, e2e 0.2, Community Access A1–A4), не завершены; фаза 0.1 в работе без коммита.
- В доменной модели не решены стратегия id и место проверки уникальности `(collection, number)`.
- Legacy не различает на уровне данных «тему» и «привязку темы к песне»; пользовательские темы — строки.
- Legacy хранит в журнале копию названия и темы песни, а не ссылку.
