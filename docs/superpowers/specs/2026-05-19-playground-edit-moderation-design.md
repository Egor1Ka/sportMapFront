# Модерація редагування площадок — Design

**Дата:** 2026-05-19
**Контекст:** Сьогодні `playgroundApi.update()` дозволяє будь-кому редагувати будь-яку площадку напряму. Потрібно ввести модерацію: правки чужих площадок повинні чекати схвалення супер-адміна, щоб уникнути вандалізму.

---

## Мета

Дозволити правки чужих площадок, але без моментального застосування. Адмін бачить чергу заявок, дивиться diff «було → стало» і клікає Approve або Reject.

## Принципи (зібрано в брейнштормі)

- **Створення площадки** — публікується одразу. Без модерації.
- **Своя площадка** (`createdBy === viewer.id`) — будь-які правки застосовуються одразу, як зараз.
- **Чужа площадка**:
  - Поля під модерацію: `name`, `description`, `address.{city, district, street, fullAddress}`, `lat`, `lng` — створюють заявку.
  - Вільні дії (без модерації): зміна `sports`, додавання фото.
  - Заборонено: видалення фото (тільки автор площадки або адмін).
- **Адмін** — `viewer.isAdmin` приходить від бекенду на основі ENV-масиву `ADMIN_IDS`. Адмін діє як супер-власник: редагує напряму, видаляє фото, схвалює/відхиляє заявки.
- **Конкурентні заявки** — усі незалежні в черзі. Адмін обробляє кожну окремо.
- **Сповіщення адміна** — лише бейдж із count у сайдбарі. Без email, Telegram, WebSocket.
- **Юзер після submit** — бачить лише toast «Заявку надіслано». Окремої сторінки «Мої заявки» немає, статусів `pending/approved/rejected` юзер не бачить.
- **Reject** — одна кнопка без коментаря/причини.

---

## Архітектура: окрема сутність `PlaygroundEditRequest`

Рішення: завести окрему таблицю/endpoint під заявки (Approach A з брейнштормінгу). Альтернативи (поле `pendingEdit` на самій площадці, ревізії в стилі Wikipedia) відкинуті — не відповідають вимозі «всі заявки незалежні» або є overkill.

### Зберігання diff, а не snapshot

Кожна заявка зберігає **тільки реально змінені поля** (`diff`), не повний знімок. При approve `diff` накладається на **актуальний** стан площадки в момент схвалення, а не на стан у момент submit.

Наслідок: гонки вирішуються автоматично за принципом last-write-wins per field. Приклад:
1. Користувач A пропонує `{ name: "Метеор" → "Дніпро-Арена" }`.
2. Користувач B пропонує `{ description: "..." → "новий опис" }`.
3. Адмін затверджує A — `name` стає `"Дніпро-Арена"`.
4. Адмін відкриває картку B — diff показує тільки опис (бо B не чіпав name). Approve змінює тільки опис.

Поляна без `createdBy` (старі дані): для всіх не-адмінів вважаємо чужою.

---

## Модель даних

### Розширення існуючих типів

**`Playground` (`services/configs/playground.config.ts`):**
```ts
interface Playground {
  // ... existing fields
  createdBy: string | null   // NEW — id автора, NULL для legacy
}

interface PlaygroundViewer {
  isCheckedInHere: boolean
  isOwner: boolean           // NEW — backend проставляє
}
```

**`User` (`services/configs/user.config.ts`):**
```ts
interface User {
  // ... existing fields
  isAdmin: boolean           // NEW — backend проставляє з ENV ADMIN_IDS
}
```

Фронт **не читає** `NEXT_PUBLIC_ADMIN_IDS`. Усі рішення на основі полів від бекенду — це усуває ризик підробки на клієнті.

### Нова сутність `PlaygroundEditRequest`

```ts
type EditRequestStatus = 'pending' | 'approved' | 'rejected'

interface EditRequestDiff {
  name?: string | null
  description?: string | null
  address?: {
    city?: string | null
    district?: string | null
    street?: string | null
    fullAddress?: string | null
  }
  lat?: number
  lng?: number
}

interface PlaygroundEditRequest {
  id: string
  playgroundId: string
  authorId: string
  authorName: string | null     // денормалізовано для списка
  authorEmail: string | null
  diff: EditRequestDiff          // тільки змінені поля
  status: EditRequestStatus
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}

interface EditRequestWithPlayground {
  request: PlaygroundEditRequest
  playground: Playground         // актуальний стан, для рендеру diff
}

interface EditRequestListResponse {
  items: EditRequestWithPlayground[]
  total: number
}
```

Backend повертає parsed pair `{ request, playground }` — фронт не робить N+1 запитів.

---

## API endpoints

Новий config `services/configs/playground-edit-request.config.ts`:

```ts
playgroundEditRequestApi = {
  submit: endpoint<{ diff: EditRequestDiff }, PlaygroundEditRequest>({
    url: ({ id }) => `/api/playgrounds/${id}/edit-requests`,
    method: postData,
    defaultErrorMessage: 'Не вдалося надіслати заявку',
  }),

  list: endpoint<void, EditRequestListResponse>({
    url: () => `/api/admin/playground-edit-requests`,
    method: getData,
    // queryParams: { status?: 'pending' | 'approved' | 'rejected', limit?, offset? }
  }),

  pendingCount: endpoint<void, { count: number }>({
    url: () => `/api/admin/playground-edit-requests/count`,
    method: getData,
    silent: true,
  }),

  getById: endpoint<void, EditRequestWithPlayground>({
    url: ({ id }) => `/api/admin/playground-edit-requests/${id}`,
    method: getData,
  }),

  approve: endpoint<void, Playground>({
    url: ({ id }) => `/api/admin/playground-edit-requests/${id}/approve`,
    method: postData,
  }),

  reject: endpoint<void, PlaygroundEditRequest>({
    url: ({ id }) => `/api/admin/playground-edit-requests/${id}/reject`,
    method: postData,
  }),
}
```

### Зміни в існуючих endpoints (вимоги до бекенду, фронт без змін)

- `PATCH /api/playgrounds/:id` — якщо викликач не owner і body містить будь-яке з модерованих полів → `403 forbidden` (фронт це обходить, перенаправляючи на `submit`).
- `DELETE /api/playgrounds/:id/photos` — тільки owner або admin.
- `POST /api/playgrounds/:id/photos` — без змін, будь-який авторизований.

---

## Frontend: edit-форма

Правимо `app/[locale]/(public-app)/sports-map/[id]/edit/page.tsx`.

### Computed flags

```ts
const isOwner       = playground.viewer?.isOwner ?? false
const isAdmin       = currentUser.isAdmin
const isEffective   = isOwner || isAdmin    // ефективний власник
const canDeletePhotos = isEffective
```

`isAdmin` загружається разом із `viewer.me()` на верхньому рівні (контекст або проп з layout).

### Поведінка submit (split owner / non-owner)

Функції в новому модулі `lib/diff/playground-diff.ts`:

```ts
type ModeratedFields = Pick<UpdatePlaygroundBody, 'name' | 'description' | 'address' | 'lat' | 'lng'>

const computeModeratedDiff = (initial: Playground, next: ModeratedFields): EditRequestDiff => { ... }
const sportsChanged        = (initial: Playground, nextSports: string[]): boolean => { ... }
const applyDiffPreview     = (playground: Playground, diff: EditRequestDiff): Playground => { ... }
```

```ts
const onSubmit = async (data: FormData) => {
  if (isEffective) {
    await playgroundApi.update({ pathParams: { id }, body: buildPatch(data) })
    toast.success('Зміни збережено')
    return
  }

  const moderatedDiff = computeModeratedDiff(playground, buildModerated(data))
  const sportsDirty   = sportsChanged(playground, data.sportIds)

  const tasks = []
  if (Object.keys(moderatedDiff).length > 0) {
    tasks.push(playgroundEditRequestApi.submit({ pathParams: { id }, body: { diff: moderatedDiff } }))
  }
  if (sportsDirty) {
    tasks.push(playgroundApi.update({ pathParams: { id }, body: { sports: data.sportIds } }))
  }

  await Promise.all(tasks)

  if (Object.keys(moderatedDiff).length > 0) {
    toast.success(t('moderation.toast.submitted'), { description: t('moderation.toast.submittedDesc') })
  }
  reset(buildDefaults(playground))  // dirty знімаємо, поляна не оновилась — це нормально
}
```

**Error handling:** `onSubmit` обгорнутий у `try/catch` (як зараз). Якщо `Promise.all` фейлить (наприклад, submit заявки пройшов, а оновлення sports повернуло 500) — toast через interceptor + форма залишається dirty, юзер може повторити. Часткове застосування sports без заявки прийнятне (поляна вже отримала ці зміни на бекенді, наступна спроба submit'у пропустить sports бо вже не dirty).

**User context:** `User.isAdmin` отримується з `userApi.me()` через існуючий механізм (сторінкові server components + контекст для client-side). У `AppSidebar` і edit-page прокидаємо через існуючий патерн проекту (server fetch у `(app)/layout.tsx` + props/context). Деталь реалізації — не специфікаційне рішення.

### Submit-кнопка

- `isEffective` → лейбл «Зберегти зміни», `disabled={!isDirty || saving}` (як зараз).
- Не-owner:
  - якщо `dirty` тільки в `sportIds` → лейбл «Зберегти зміни» (free path).
  - якщо `dirty` зачіпає модеровані поля → лейбл «Запропонувати зміни».
  - Підказка під кнопкою (тільки коли модеровані поля dirty): «Зміни побачать інші користувачі після перевірки адміном».

### Banner для не-owner

Вище форми, тільки коли `!isEffective`:
```
ℹ️  Це не ваша площадка
    Зміни назви, опису, адреси та координат відправляться на модерацію адміну.
    Види спорту та фото можна додати одразу.
```

### Кнопка видалення фото

В `PhotoTile`: рендеримо `<button onClick={onRemove}>` тільки якщо `canDeletePhotos`. Інакше — фото без кнопки.

### Що НЕ змінюється

- Create page (`/sports-map/new`) — публікується одразу.
- View page (`/sports-map/[id]`) — без банерів, юзер статусу не бачить.
- Логіка загрузки sports/playground.

---

## Admin UI

### Sidebar badge

Правимо `components/app-shell/app-sidebar.tsx`. Додаємо новий пункт меню (умовний рендер на `currentUser.isAdmin`):

```tsx
{currentUser.isAdmin && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link href="/admin/playground-requests">
        <ShieldCheck />
        <span>{t('admin.nav.moderation')}</span>
        {pendingCount > 0 && <SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>}
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

### Hook `useAdminPendingCount`

Новий `hooks/use-admin-pending-count.ts`:

```ts
const POLL_INTERVAL = 60_000

const useAdminPendingCount = (enabled: boolean) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const fetchCount = async () => {
      try {
        const result = await playgroundEditRequestApi.pendingCount()
        if (!cancelled) setCount(result.count)
      } catch { /* silent */ }
    }
    fetchCount()
    const intervalId = setInterval(fetchCount, POLL_INTERVAL)
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchCount() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  return count
}
```

Викликається з sidebar з прапором `enabled = currentUser.isAdmin`.

### Сторінка `/app/[locale]/(app)/admin/playground-requests/page.tsx`

Client component (потрібні мутації, polling, табы).

**Layout:**
- Хедер: «Заявки на модерацію» + count для активної вкладки
- Tabs: `Pending` (default) / `Approved` / `Rejected` — фільтр через `queryParams.status`
- Список карток

**RequestCard component** (`components/admin/RequestCard.tsx`):

```
┌────────────────────────────────────────────────────────────┐
│ 🏟️ Площадка «Стадіон Метеор»          [Approve] [Reject]   │
│ Запропонував: Іван Петренко · 2 год тому                   │
│ ─────────────────────────────────────────────────────────  │
│ Назва:    «Стадіон Метеор»  →  «Стадіон Дніпро-Арена»     │
│ Адреса:   «вул. Січ.»        →  «вул. Січова Наб., 17»    │
│ Координати: 48.4647, 35.0462 → 48.4651, 35.0470            │
└────────────────────────────────────────────────────────────┘
```

Рядки `(не змінено)` приховуємо — показуємо тільки реальний diff. Якщо після порівняння з актуальним станом diff порожній (все вже застосовано вручну owner'ом) → показуємо повідомлення «Усі запропоновані поля вже відповідають поточному стану» з пропозицією просто Reject.

**RequestDiffRow component** (`components/admin/RequestDiffRow.tsx`) — один рядок, formatter за типом поля (string / number / address-object). Address розбиваємо на підрядки.

### Дії

- **Approve** → `approve({ pathParams: { id } })`:
  - Optimistic: видаляємо картку зі списку
  - Toast `t('admin.requests.toastApproved')`
  - Refetch counter
  - On error: refetch list, toast.error
- **Reject** → `reject({ pathParams: { id } })`:
  - Optimistic remove
  - Toast `t('admin.requests.toastRejected')`
  - Refetch counter
  - On error: refetch list, toast.error

### Захист маршруту

Новий `app/[locale]/(app)/admin/layout.tsx` — Server Component:

```tsx
const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const profile = await userApi.me()
  if (!profile.data.isAdmin) redirect('/sports-map')
  return <>{children}</>
}
```

Backend дублює перевірку на кожному `/api/admin/...` endpoint. Frontend guard — лише для UX.

### Empty state

«Немає заявок на модерацію» з іконкою `Inbox`, текст з `admin.requests.empty`.

---

## Edge cases

1. **Площадка без `createdBy`** (legacy/seed) — для всіх не-адмінів вважається чужою → модерація.

2. **Owner редагує під час pending-заявок інших** — заявки виживають. Diff у картці адміна перераховується від актуального стану. Якщо owner уже застосував те саме значення вручну — рядок diff показує `(не змінено)` і ховається.

3. **Approve площадки, яку видалили** — backend 404 → toast.error, refetch list. Backend каскадно відмічає заявки rejected.

4. **Submit без реальних змін** — `computeModeratedDiff` повертає `{}`, кнопка submit залишається `disabled={!isDirty}` (RHF). Якщо клієнт обходить це — backend відповідає `nothingToUpdate`.

5. **Юзер не авторизований** — edit-сторінка вимагає логін (як зараз). Серверне redirect-правило в `(public-app)/layout.tsx` або middleware.

6. **Адмін на своїй площадці** — `isOwner=true, isAdmin=true`. Обраний path — owner (direct update). Жодних додаткових ефектів.

7. **DELETE photo через DevTools не-власником** — backend 403, frontend просто ховає кнопку.

8. **Polling при switching tabs** — `visibilitychange` listener рефетчить count при поверненні. У фоні `setInterval` продовжує тікати (browser throttle ним керує).

9. **Концентровані заявки на одну поляну** — адмін бачить кожну окремою карткою; approve однієї не впливає на інші (diff перерахується для решти).

10. **Юзер хоче відмінити свою заявку** — out of scope. Якщо потім знадобиться → додати endpoint `DELETE /playgrounds/:id/edit-requests/:requestId` + кнопку «Скасувати» на view-page.

---

## i18n

Додаємо в `i18n/messages/uk.json` та `i18n/messages/en.json`:

```
moderation:
  banner.title             "Це не ваша площадка"
  banner.description       "Зміни назви, опису, адреси та координат відправляться на модерацію адміну. Види спорту та фото можна додати одразу."
  submit.propose           "Запропонувати зміни"
  submit.hint              "Зміни побачать інші користувачі після перевірки адміном"
  toast.submitted          "Заявку надіслано"
  toast.submittedDesc      "Адмін перевірить ваші зміни"

admin:
  nav.moderation              "Модерація"
  requests.title              "Заявки на модерацію"
  requests.empty              "Немає заявок на модерацію"
  requests.tabs.pending       "Очікують"
  requests.tabs.approved      "Затверджені"
  requests.tabs.rejected      "Відхилені"
  requests.approve            "Затвердити"
  requests.reject             "Відхилити"
  requests.proposedBy         "Запропонував"
  requests.fieldUnchanged     "(не змінено)"
  requests.allFieldsUnchanged "Усі запропоновані поля вже відповідають поточному стану"
  requests.toastApproved      "Зміни застосовано"
  requests.toastRejected      "Заявку відхилено"
  requests.field.name         "Назва"
  requests.field.description  "Опис"
  requests.field.address      "Адреса"
  requests.field.lat          "Широта"
  requests.field.lng          "Довгота"
```

---

## Файли

### Нові

| Файл | Призначення |
|---|---|
| `services/configs/playground-edit-request.config.ts` | endpoint config |
| `services/configs/playground-edit-request.types.ts` | типи `EditRequest`, `EditRequestDiff`, response shapes |
| `hooks/use-admin-pending-count.ts` | polling + visibility listener для counter |
| `app/[locale]/(app)/admin/layout.tsx` | server-side guard на `isAdmin` |
| `app/[locale]/(app)/admin/playground-requests/page.tsx` | список з табами |
| `components/admin/RequestCard.tsx` | картка заявки з diff та діями |
| `components/admin/RequestDiffRow.tsx` | відрисовка одного рядка diff |
| `lib/diff/playground-diff.ts` | `computeModeratedDiff`, `sportsChanged`, `applyDiffPreview` |

### Правимо

| Файл | Що |
|---|---|
| `services/configs/playground.config.ts` | додати `createdBy: string \| null`, `viewer.isOwner: boolean` |
| `services/configs/user.config.ts` | додати `isAdmin: boolean` у `User` |
| `services/index.ts` | експорт `playgroundEditRequestApi` |
| `app/[locale]/(public-app)/sports-map/[id]/edit/page.tsx` | banner, split submit, label кнопки, скрытие delete-photo |
| `components/app-shell/app-sidebar.tsx` | новий пункт «Модерація» + бейдж під `isAdmin` |
| `i18n/messages/uk.json`, `i18n/messages/en.json` | новi ключі |

### Бекенд (вимоги, фронт не реалізує)

- Поле `createdBy` у площадці (міграція: NULL для legacy)
- ENV `ADMIN_IDS` (масив, server-side)
- `viewer.isOwner` та `viewer.isAdmin` у відповідях
- Таблиця `playground_edit_requests` (id, playgroundId, authorId, diff JSON, status, createdAt, resolvedAt, resolvedBy)
- Нові endpoints `/api/playgrounds/:id/edit-requests`, `/api/admin/playground-edit-requests/...`
- `PATCH /playgrounds/:id` відкидає модеровані поля для не-owner з 403
- `DELETE photos` дозволено тільки owner/admin
- Cascading: видалення площадки → заявки rejected

---

## Поза scope

- Сторінка «Мої заявки» для юзера
- Можливість юзеру скасувати свою заявку
- Email / Telegram / WebSocket сповіщення адміну
- Reason при reject
- WebSocket для live counter (тільки polling 60s + visibilitychange)
- Bulk approve/reject
- Окремий audit-log (поточної моделі статусів + `resolvedAt/resolvedBy` достатньо)
- Версіонування / можливість «відкотити» затверджену зміну
