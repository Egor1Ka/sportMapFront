# Playground Events & Live Presence — Design

**Дата:** 2026-05-17
**Версия:** Lean v1
**Статус:** Проектирование завершено, готово к плану имплементации

---

## 1. Цель и контекст

Добавить в приложение возможность **спонтанно собирать pickup-игры на площадке** и видеть, кто прямо сейчас на ней находится. Это превращает карту площадок из статичного каталога в живой инструмент координации.

### Два сценария, которые должны работать

1. **«Сегодня в 18:00 баскет»** — юзер заранее объявляет событие на конкретной площадке. Другие видят, могут присоединиться (RSVP «Я иду»).
2. **«Я уже тут, кто хочет — подходите»** — юзер пришёл на площадку и отметился. Это видно как живой счётчик присутствующих, независимо от событий.

### Что НЕ делаем в v1

- Чат / комментарии в событии (есть отдельный spec `comments-system`, может использоваться позже)
- Push / email уведомления
- Повторяющиеся события («каждый вторник»)
- Календарь на неделю — только today/tomorrow
- Отдельная лента `/events` — события всегда привязаны к площадке
- Имена / аватары участников — везде только счётчики (приватность)
- WebSocket / real-time — polling 60s достаточно
- Verification check-in (QR / GPS) — простая кнопка

### Ключевые принятые решения

| Решение                         | Обоснование                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| Любой залогиненный юзер создаёт | Низкий порог входа, максимум активности                      |
| Только today/tomorrow           | Минимальная модель данных, фокус на pickup-играх             |
| Опциональный лимит мест         | Гибко для «просто покидаем мяч» и для «строго 5×5»           |
| Кнопка check-in без верификации | Простота. Хонор-система достаточна для v1                    |
| Авто-снятие через 2ч + ручное «Я ушёл» | Средняя игра ~1-2ч. Самоочищающийся счётчик              |
| RSVP и check-in — независимы    | Намерение ≠ факт. Два разных сигнала                         |
| Только счётчики, без имён       | Максимум приватности. Видим только создателя события         |
| Discovery: карта + страница площадки | Без отдельной ленты, всё в контексте места                  |

---

## 2. Доменная модель

### `Event`

```ts
interface Event {
  id: string
  playgroundId: string
  sport: PlaygroundSport         // переиспользуем тип из playground.config.ts
  creator: EventCreator          // единственный «видимый» юзер
  startAt: string                // ISO UTC
  durationMin: number            // 15-480
  description: string | null     // до 280 символов
  maxParticipants: number | null // 2-100 или null
  rsvpCount: number              // производное
  isFull: boolean                // производное: maxParticipants && rsvpCount >= max
  status: 'active' | 'cancelled' | 'finished'
  createdAt: string
  viewer?: { isRsvped: boolean } // присутствует только для залогиненного
}

interface EventCreator {
  id: string
  name: string
  avatar: string | null
}
```

### `EventRsvp`

Хранится на бэке, на фронт **не отдаётся** ни в каком виде, кроме счётчика и `viewer.isRsvped`.

- `eventId`
- `userId`
- `createdAt`
- Уникальный составной ключ `(eventId, userId)` — один RSVP на юзера

### `PlaygroundCheckIn`

```ts
interface CheckInResponse {
  playgroundId: string
  activeCount: number            // производное: count where leftAt IS NULL AND expiresAt > now
  viewer?: {
    isCheckedIn: boolean
    expiresAt: string | null     // когда автоматически снимется
  }
}
```

На бэке:
- `id`, `playgroundId`, `userId`
- `checkedInAt`
- `expiresAt = checkedInAt + 2h`
- `leftAt` — `null` или таймстамп ручного «Я ушёл»

**Инварианты:**
- Юзер «активно на площадке» если `leftAt IS NULL AND expiresAt > now`
- Один активный check-in на юзера глобально — `POST` на новую площадку автоматически закрывает старый (`leftAt = now`)
- `POST` на ту же площадку идемпотентен и продлевает `expiresAt = now + 2h`

### Производные счётчики на площадке

В существующий `GET /api/playgrounds` и `GET /api/playgrounds/:id` добавляется:

```ts
counters: {
  activeCheckIns: number
  upcomingEvents: number    // status='active' AND startAt в окне [now, now + 48h]
}
viewer?: {
  isCheckedInHere: boolean
}
```

Эти поля позволяют карте раскрашивать маркеры без N+1 запросов.

---

## 3. API контракт

Все эндпоинты следуют существующему паттерну (`endpoint<TBody, TResponse>` из `services/api/types.ts`).

### Events

| Метод   | URL                                       | Body / Query                                                        | Возвращает                      |
| ------- | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| `GET`   | `/api/playgrounds/:playgroundId/events`   | `?status=active` (default), `?status=all`                           | `EventListResponse`             |
| `GET`   | `/api/events/:id`                         | —                                                                   | `Event`                         |
| `POST`  | `/api/playgrounds/:playgroundId/events`   | `{ sportId, startAt, durationMin?, description?, maxParticipants? }`| `Event`                         |
| `PATCH` | `/api/events/:id`                         | те же поля, опционально                                             | `Event`                         |
| `POST`  | `/api/events/:id/cancel`                  | —                                                                   | `Event` (`status='cancelled'`)  |
| `POST`  | `/api/events/:id/rsvp`                    | —                                                                   | `{ rsvpCount, isFull, viewer }` |
| `DELETE`| `/api/events/:id/rsvp`                    | —                                                                   | `{ rsvpCount, isFull, viewer }` |

### Check-ins

| Метод    | URL                                        | Body | Возвращает         |
| -------- | ------------------------------------------ | ---- | ------------------ |
| `POST`   | `/api/playgrounds/:playgroundId/check-in`  | —    | `CheckInResponse`  |
| `DELETE` | `/api/playgrounds/:playgroundId/check-in`  | —    | `CheckInResponse`  |

### Бэк-валидация

| Условие                                                  | Код | `status` поле                |
| -------------------------------------------------------- | --- | ---------------------------- |
| `startAt` вне `[now+5min, now+48h]`                      | 400 | `eventTimeOutOfWindow`       |
| `durationMin` вне `[15, 480]`                            | 400 | `validationError`            |
| `maxParticipants` вне `[2, 100]` (если не null)          | 400 | `validationError`            |
| `description` длиннее 280 символов                       | 400 | `validationError`            |
| `POST /rsvp` на полное событие (не я в RSVP)             | 409 | `eventFull`                  |
| `POST /rsvp` или `DELETE /rsvp` на `cancelled`/`finished`| 400 | `eventNotActive`             |
| `PATCH` / `cancel` не от создателя                       | 403 | `forbidden`                  |

### Авторизация

- `GET` — публичные
- Все мутации — требуют авторизованного юзера
- `PATCH` / `cancel` — дополнительно проверка `authenticatedUser.id === event.creator.id` (иначе 403 `forbidden`)

---

## 4. UI: карта и страница площадки

### 4.1 — Маркеры на карте

Состояние маркера определяется `counters`:

| Состояние                | Условие                                       | Визуал                                              |
| ------------------------ | --------------------------------------------- | --------------------------------------------------- |
| Спокойная                | `activeCheckIns === 0 && upcomingEvents === 0`| Обычный маркер                                      |
| Запланированы события    | `upcomingEvents > 0 && activeCheckIns === 0`  | Маркер + бейдж `Calendar N` (primary цвет) справа сверху |
| Live-активность          | `activeCheckIns > 0`                          | Маркер + пульсирующая зелёная точка + бейдж `N` (chart-2) |
| Оба                      | `activeCheckIns > 0 && upcomingEvents > 0`    | Пульсирующий зелёный + комбинированный бейдж        |

Пульсация — CSS keyframe «вдох» (scale 1→1.4, opacity 1→0.6) с длительностью 1.5s. Не моргание — медленный визуальный сигнал.

Поповер маркера (существующий) дополняется строкой `🟢 5 сейчас · 📅 2 события сегодня` и кнопкой `Открыть площадку`.

Polling: видимый bbox перезапрашивается раз в 60s пока вкладка активна (`document.visibilityState === 'visible'`).

### 4.2 — Страница площадки

Существующий маршрут в `app/[locale]/(public-app)/playground/[id]/` дополняется двумя секциями.

**Presence card** (между шапкой площадки и событиями):

```
┌─────────────── Presence card ──────────────┐
│  🟢  5 человек сейчас на площадке           │
│  [ Я на площадке ]                          │
└────────────────────────────────────────────┘
```

После check-in:

```
┌─────────────── Presence card ──────────────┐
│  🟢  5 человек сейчас на площадке           │
│  [ ✓ Ты тут до 19:43 ]   [ Я ушёл ]         │
└────────────────────────────────────────────┘
```

- Цифра крупно (`text-2xl`), зелёная пульсирующая точка слева если `activeCount > 0`
- Тап на `[ ✓ Ты тут до HH:MM ]` — продлевает таймер (idempotent POST)
- Аноним: `[ Войти, чтобы отметиться ]` → `/login?returnTo=<current>`

**Список событий** — группировка по дням:

```
Сегодня
┌─────────────────────────────────────────┐
│ [icon] Баскетбол · 18:00 · 1ч 30м      │
│ [avatar] Игнат · 7/10 идут             │
│ «Стритбол 3×3, нужен мяч»  (line-clamp-2)│
│ [ Я иду ]   или   [ ✓ Ты идёшь ]        │
└─────────────────────────────────────────┘

Завтра
[...]

[ + Создать событие ]
```

Карточка кликабельна целиком — ведёт на `/events/[id]`. Кнопка RSVP — отдельная клик-зона, не пробрасывает событие наверх.

**Состояния CTA в карточке:**
- не RSVP → `[ Я иду ]` (primary)
- RSVP → `[ ✓ Ты идёшь ]` (secondary, тап откатывает)
- полное, не я → `[ Заполнено ]` (disabled)
- cancelled → карточка приглушена, badge `Отменено`, CTA скрыт
- finished → не показывается в списке (отфильтровано на бэке `?status=active`)

**Empty state:**

```
Пока нет событий
Будь первым, кто соберёт игру
[ Создать событие ]
```

**Адаптив:**
- Mobile: одна колонка, full-width CTA
- `md+`: Presence card → sticky aside справа, события — основная колонка

---

## 5. UI: страница события и создание

### 5.1 — Страница события `/[locale]/events/[id]`

Маршрут в группе `(app)`. Анонимные могут открыть и читать, но мутации ведут на логин.

Лейаут:

```
←  Назад                                    [Share] [⋯]

[icon]  Баскетбол

Сегодня, 18:00 · 1ч 30м
начнётся через 2ч 15м   ← live tick

📍 Корт «Чкалово»  →
   ул. Иванова, 5

── Создатель ──
[avatar] Игнат

── Описание ──
«Стритбол 3 на 3. Нужен свой мяч»

── Участники ──
7 / 10 идут
████████░░  Свободно 3 места

(sticky bottom)
[ Я иду ]
```

**Live-таймер «начнётся через X»:**
- До start > 1ч → «начнётся через 2ч 15м», обновление раз в 60s
- ≤ 1ч → «начнётся через 23 минуты», раз в 30s
- В процессе → «Идёт сейчас · закончится в 19:30»
- Прошло → «Завершено» (фронт сам переключает, не доверяя бэку слепо)

**Меню создателя** (`MoreHorizontal` из lucide, видно только когда залогиненный юзер из `useUser()` имеет `id === event.creator.id`):
- «Редактировать» → открыть edit-sheet
- «Отменить событие» → AlertDialog confirm → `POST /api/events/:id/cancel`

После отмены страница не редиректит — остаётся видна с красным баннером «Событие отменено организатором», CTA скрыт.

**Шеринг:** `navigator.share()` где есть; fallback — копирование URL в clipboard + toast «Ссылка скопирована».

### 5.2 — Создание / редактирование

Открывается как `Sheet` (mobile) / `Dialog` (desktop) с страницы площадки или из меню создателя. Не отдельный route — лишний контекст-свитч.

Поля формы:

| Поле                 | Контрол                                 | Опции / Default                                                                                          |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Спорт                | `Select`                                | **Опции:** все спорты из `sportApi.list()`. **Default:** первый из `playground.sports` если есть, иначе первый из общего списка |
| Когда (день + время) | Сегментед `Today/Tomorrow` + time input | Today, ближайшие 15м с округлением вверх                                                                |
| Длительность         | `Select`, presets: 30м / 1ч / 1ч 30м / 2ч / 3ч | 1ч                                                                                                |
| Лимит участников     | Toggle «без лимита» + spinner           | Без лимита                                                                                              |
| Описание             | `Textarea` + counter                    | Пусто, max 280                                                                                          |

**Zod-схема (черновик):**
```ts
const createEventSchema = z.object({
  sportId: z.string().uuid(),
  startAt: z.iso.datetime().refine(isWithin48hFuture),
  durationMin: z.number().int().min(15).max(480),
  maxParticipants: z.number().int().min(2).max(100).nullable(),
  description: z.string().max(280).nullable(),
})
```

**Поведение:**
- Submit → `eventApi.create({ pathParams: { playgroundId }, body })`
- Успех → toast «Событие создано», закрыть sheet, рефетч списка событий площадки (`router.refresh()`)
- Server validation → `setServerErrors(err, setError)` (существующий хелпер)
- Бизнес-ошибки (`eventTimeOutOfWindow` и т.п.) → ловит `createToastInterceptor`

**Редактирование:** та же форма, префиллена. Запрет смены `playgroundId`. Смена спорта/времени при наличии RSVP — фронт показывает confirm «У события есть N участников — продолжить?», бэк всё равно разрешает.

---

## 6. Frontend архитектура

### 6.1 — Файлы и расположение

```
services/
├── configs/
│   ├── event.config.ts          ★ endpoints (Event + RSVP)
│   ├── event.types.ts           ★ Event, EventCreator, EventListResponse, CreateEventBody, ...
│   ├── check-in.config.ts       ★ endpoints (check-in)
│   ├── check-in.types.ts        ★ CheckInResponse, ViewerCheckIn
│   └── playground.config.ts     ◯ дополнить counters/viewer
└── index.ts                     ◯ экспортнуть eventApi, checkInApi

components/
├── events/                      ★ новый каталог
│   ├── event-card.tsx           — карточка в списке
│   ├── event-list.tsx           — секция «Сегодня/Завтра» + empty
│   ├── event-rsvp-button.tsx    — самодостаточная кнопка RSVP со всеми состояниями
│   ├── event-create-sheet.tsx   — модалка создания
│   ├── event-edit-sheet.tsx     — модалка редактирования
│   ├── event-form.tsx           — общий внутренний form
│   ├── event-status-banner.tsx  — баннеры «отменено / завершено»
│   ├── event-time-display.tsx   — live «начнётся через X»
│   └── event-menu.tsx           — меню создателя
│
├── presence/                    ★ новый каталог
│   ├── presence-card.tsx        — карточка на странице площадки
│   ├── presence-check-in-button.tsx
│   ├── presence-indicator.tsx   — маленький бейдж (карта + шапка)
│   └── presence-pulse.tsx       — анимированная точка
│
└── sports-map/
    ├── SportsMap.tsx            ◯ пробросить counters
    └── PlaygroundMarker.tsx     ★ выделить отрисовку маркера

app/[locale]/
├── (app)/
│   └── events/
│       └── [id]/
│           └── page.tsx         ★
└── (public-app)/
    └── playground/[id]/         ◯ добавить PresenceCard + EventList
        └── page.tsx

hooks/
├── use-event-create-dialog.ts   ★
├── use-now-clock.ts             ★ setInterval 30s, возвращает now
└── use-relative-time.ts         ★ «начнётся через X», использует useNowClock

lib/
└── events/
    ├── format-event-time.ts     ★ «Сегодня · 18:00 · 1ч 30м»
    ├── group-events-by-day.ts   ★ { today, tomorrow }
    └── event-validators.ts      ★ isWithin48hFuture, isStartInPast

i18n/messages/{en,uk}.json       ◯ events.*, presence.*
```

★ — новый, ◯ — редактируется.

### 6.2 — Слоёная ответственность

| Слой                  | Делает                                      | Не делает                          |
| --------------------- | ------------------------------------------- | ---------------------------------- |
| `services/`           | HTTP, типы, маппинг                         | UI, бизнес-логика                  |
| `lib/events/`         | Чистые функции (format, validate, group)    | React, fetch                       |
| `hooks/`              | State, эффекты, таймеры                     | Прямой fetch                       |
| `components/`         | Презентация + действия пользователя         | Загрузка данных компонентом        |
| `app/.../page.tsx`    | RSC-загрузка, layout                        | Бизнес-логика                      |

### 6.3 — Data fetching паттерн

Проект использует RSC + fetch без React Query. Следуем существующему паттерну.

- RSC грузит данные через `await playgroundApi.getById(...)` и `await eventApi.getById(...)`
- Передаёт `initialData` в клиентские контейнеры (`PresenceCard`, `EventList`)
- Действия (RSVP, check-in) — оптимистично обновляют локальный state + после ответа делают `router.refresh()` для пересинхронизации RSC
- Polling: `setInterval(60s) → router.refresh()` пока вкладка видима

Без React Query / SWR / Zustand. Без WebSocket.

### 6.4 — Соответствие проектным правилам

Из `CLAUDE.md`:
- Именованные функции, без inline-лямбд в `.map`/`.filter`/`.reduce`
- `const` only, без мутаций
- Guard clause до вызова, не внутри
- `@base-ui/react` primitives, без `asChild` (Radix)
- shadcn компоненты (Card, Button, Sheet, Dialog, Field, Select, Input, Textarea, AlertDialog, Skeleton, Badge)
- `cn()` для className
- i18n через `useTranslations` / `getTranslations`
- `ApiError` + `setServerErrors` для форм
- `silent: true` для тихих polling-запросов

### 6.5 — i18n ключи

```json
{
  "events": {
    "today": "Сегодня",
    "tomorrow": "Завтра",
    "rsvpGoing": "Я иду",
    "rsvpYouAreGoing": "✓ Ты идёшь",
    "rsvpFull": "Заполнено",
    "createTitle": "Создать событие",
    "createCta": "Создать событие",
    "edit": "Редактировать",
    "cancel": "Отменить событие",
    "cancelConfirm": "Точно отменить событие?",
    "shareCopied": "Ссылка скопирована",
    "fields": {
      "sport": "Спорт",
      "when": "Когда",
      "duration": "Длительность",
      "limit": "Лимит участников",
      "limitOff": "Без лимита",
      "description": "Описание",
      "descriptionPlaceholder": "Например: «Стритбол 3×3, нужен мяч»"
    },
    "startsIn": "начнётся через {value}",
    "happening": "Идёт сейчас · закончится в {endTime}",
    "finished": "Завершено",
    "cancelled": "Событие отменено организатором",
    "creator": "Создатель",
    "participants": "{count} идут",
    "participantsLimited": "{count}/{max} идут",
    "freeSpots": "Свободно {count} мест",
    "emptyTitle": "Пока нет событий",
    "emptySubtitle": "Будь первым, кто соберёт игру",
    "loginToCreate": "Войти, чтобы создать"
  },
  "presence": {
    "title": "{count, plural, one {# человек} few {# человека} other {# человек}} сейчас на площадке",
    "checkInCta": "Я на площадке",
    "checkOutCta": "Я ушёл",
    "youArePresent": "✓ Ты тут до {time}",
    "loginToCheckIn": "Войти, чтобы отметиться"
  }
}
```

---

## 7. Жизненный цикл

### 7.1 — Event

```
              создаётся
                 │
                 ▼
          ┌─────────────┐    cancel создателем
          │   active    ├──────────────────────► cancelled (терминальный)
          └──────┬──────┘
                 │  startAt + durationMin < now
                 ▼
          ┌─────────────┐
          │   finished  │ (терминальный)
          └─────────────┘
```

- `cancelled` — скрывается из списка площадки и счётчиков карты. Видно только на детальной странице у тех, кто RSVP'нулся (с баннером). RSVP'ы заморожены.
- `finished` — фронт ставит сам по `startAt + durationMin < now`, не дожидаясь бэка. Бэк синхронизирует lazy при `GET` или cron'ом.

### 7.2 — CheckIn

```
            POST /check-in
                       │
       ┌───────────────┼───────────────────┐
       │               │                   │
   нет активного   на этой же         на ДРУГОЙ
       │           площадке              площадке
       │               │                   │
       ▼               ▼                   ▼
   create new   продлить expiresAt    leftAt=now старому
                                       → create new
                       │
                       ▼
              ┌──────────────┐
              │   active     │
              └──────┬───────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
   DELETE                  expiresAt < now
   /check-in               (авто 2ч)
       │                           │
       ▼                           ▼
   inactive                    inactive
```

### 7.3 — Часовые пояса

**Правило:** на бэке все таймстампы — UTC ISO. Фронт конвертит в локальную TZ браузера для отображения.

- `Intl.DateTimeFormat` / `date.toLocaleString(locale)` для форматирования
- «Today/Tomorrow» вычисляется относительно `now` юзера в его TZ
- Группировка событий по дням — `startAt` приведённый к локальной TZ vs `now` локально
- Бэк-валидация «48ч окна» — простая UTC-дельта, не зависит от TZ

Проект имеет историю TZ-багов (см. коммиты `9aeef48`, `1c1a5ab`). Правило: **никаких browser-TZ fallback'ов на бэке**. Бэк работает только в UTC, фронт отвечает за user-facing форматы.

---

## 8. Edge cases и идемпотентность

| Сценарий                                                  | Поведение                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Два юзера одновременно RSVP на последнее место            | Один → 200, второй → 409 `eventFull`. Фронт показывает «Заполнено», рефетч счётчика. |
| Юзер дважды нажал «Я иду»                                 | UI блокирует кнопку на время запроса. Сервер idempotent.                             |
| Создатель отменяет, в этот момент кто-то RSVP'ится        | Оба коммитятся. Событие cancelled с RSVP'ами. RSVP'нувшиеся видят баннер.            |
| Юзер дважды нажал «Я на площадке»                         | Идемпотентно, продлевает таймер. Без ошибок.                                         |
| Check-in и check-out ответы пришли не по порядку          | Фронт ориентируется на последний ответ.                                              |
| RSVP'нулся, потом создатель сменил спорт                  | RSVP сохранён. Следующий рефетч показывает обновлённое событие. Без уведомления.    |
| Сеть упала при RSVP                                       | `createToastInterceptor` → toast «Нет интернета». Кнопка возвращается.               |
| Событие удалено пока юзер на странице                     | 404 → `notFound()` → `app/[locale]/not-found.tsx`.                                    |
| Юзер на странице, событие стало `finished`                | Live-таймер сам переключает баннер. CTA скрывается без перезагрузки.                 |
| Юзер сделал check-in, закрыл приложение                   | Через 2ч авто-снятие на бэке. Следующий заход — `viewer.isCheckedInHere=false`.     |
| Юзер вернулся за 13 минут до истечения                    | Тап на `[ ✓ Ты тут до 19:43 ]` продлевает до `now + 2h`. Без диалога.                |

### Авторизация в UI

| Действие                       | Аноним                       | Залогинен                       |
| ------------------------------ | ---------------------------- | ------------------------------- |
| Видит карту, маркеры, счётчики | ✅                            | ✅                              |
| Открывает страницу события     | ✅                            | ✅                              |
| Создать событие                | CTA → `/login?returnTo=...`  | ✅                              |
| RSVP                           | CTA → `/login`               | ✅                              |
| Check-in                       | CTA → `/login`               | ✅                              |
| Редактировать / отменить       | —                            | Только `creator.id === me`      |

---

## 9. Тест-план

### Юнит-тесты (`lib/events/`)

- `format-event-time` — все ветки: «Сегодня · 18:00 · 1ч 30м», «Завтра 09:00», переходы дня, разные TZ
- `group-events-by-day` — boundary вокруг полуночи в локальной TZ
- `event-validators.isWithin48hFuture` — boundary cases: `now + 1min`, `now + 48h - 1min`, `now + 48h + 1min`

### Компонентные (Vitest + RTL)

- `EventCard` — каждый CTA-state (going / not going / full / cancelled / finished)
- `EventRsvpButton` — optimistic update + rollback на ошибке
- `PresenceCard` — переходы checkin → checked-in → продление → checkout
- `EventCreateSheet` — клиентская валидация + `setServerErrors` от бэка
- `EventTimeDisplay` — live-обновление через mocked timers

### Интеграционные (Playwright или ручные сценарии)

- Создать событие → видно в списке площадки → видно на карте (бейдж) → RSVP → счётчик растёт → check-in → presence растёт
- Создатель отменяет → событие пропадает из списка → у RSVP'нувшихся в детальной — баннер
- Гонка: два RSVP на последнее место, второй получает eventFull

Backend-зависимые E2E — вне scope первого PR. Фронтовые тесты мокают `services/`.

---

## 10. Out of scope (что НЕ делаем в v1)

- Комментарии / чат в событии
- Push-уведомления (мобильные, web push)
- Email-уведомления
- Повторяющиеся события («каждый вторник»)
- События на горизонт > 48ч
- Отдельная лента `/events`
- Списки участников с именами (только счётчики)
- WebSocket / real-time
- QR / GPS верификация check-in
- Аналитика и метрики (заложить хуки позже)
- Waitlist на полные события
- Уведомление RSVP'нувшимся об отмене / изменении

Эти пункты — кандидаты на следующие итерации, не блокеры v1.

---

## 11. Сводка изменений по слоям

| Слой                  | Действие                                                                             |
| --------------------- | ------------------------------------------------------------------------------------ |
| Backend               | 2 новые таблицы (`events`, `event_rsvps`, `playground_check_ins`), 8 эндпоинтов, дополнение `playgrounds` ответа `counters` + `viewer` |
| `services/configs/`   | 4 новых файла (`event.config.ts`, `event.types.ts`, `check-in.config.ts`, `check-in.types.ts`), дополнение `playground.config.ts` |
| `services/index.ts`   | Экспорт `eventApi`, `checkInApi`                                                     |
| `components/events/`  | 9 новых компонентов                                                                  |
| `components/presence/`| 4 новых компонента                                                                   |
| `components/sports-map/` | Дополнение `SportsMap.tsx`, выделение `PlaygroundMarker.tsx`                      |
| `app/[locale]/(app)/events/[id]/page.tsx` | Новая страница                                                  |
| `app/[locale]/(public-app)/playground/[id]/page.tsx` | Дополнение (Presence + Events секции)                |
| `hooks/`              | 3 новых хука                                                                         |
| `lib/events/`         | 3 чистые функции                                                                     |
| `i18n/messages/`      | Новые ключи `events.*`, `presence.*` в `en.json` и `uk.json`                         |
| `app/globals.css`     | keyframe `pulse-presence`                                                            |
| Тесты                 | Юнит + компонентные для всех новых модулей                                           |
