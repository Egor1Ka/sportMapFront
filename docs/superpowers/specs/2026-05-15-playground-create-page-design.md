# Сторінка створення площадки — Design

**Дата:** 2026-05-15
**Контекст:** У проєкті вже є сторінка перегляду (`/sports-map/[id]`) та редагування (`/sports-map/[id]/edit`) площадок, але немає сторінки створення. Backend endpoint `POST /api/playgrounds` готовий (див. `services/configs/playground.config.ts`).

## Мета

Додати красиву та зручну сторінку для створення нової площадки з інтерактивним вибором координат на карті та пошуком за адресою.

## Маршрут

`app/[locale]/sports-map/new/page.tsx` — статичний сегмент `new` має пріоритет над динамічним `[id]` у Next.js App Router.

## Структура сторінки (одна колонка, шаблон як у edit)

1. **Header** — breadcrumb «Карта → Нова площадка», кнопка «← Назад до карти»
2. **Card: Основна інформація** — `name`, `description`
3. **Card: Розташування** — компонент `<PlaygroundLocationPicker>` (карта + пошук + lat/lng)
4. **Card: Адреса** — `fullAddress`, `city`, `district`, `street` (автозаповнюються з reverse geocoding)
5. **Card: Види спорту** — чекбокси (реюз шаблона `SportsPicker` з edit)
6. **Card: Фото** — drag-n-drop + сітка прев'ю; файли в `useState<File[]>` до успішного create
7. **Bottom bar** (sticky на десктопі, fixed на мобайл) — кнопки «Скасувати» та «Створити площадку» (disabled, поки немає lat/lng)

## Новий компонент: `components/sports-map/PlaygroundLocationPicker.tsx`

Інтерактивний пікер координат на базі Leaflet:

- **Leaflet-карта** з одним draggable-маркером. Якщо координати ще не обрано — маркер не показується, замість нього напис «Клікніть або перетягніть маркер».
- **Поле пошуку адреси** з дебаунсом 400ms (мінімум 3 символи) + Popover-список з результатами Nominatim.
- **Два інпути lat/lng** під картою з валідацією діапазону.
- **Кнопка «Моя локація»** — використовує `navigator.geolocation`.
- **Двосторонній sync:** клік/драг по карті ↔ lat/lng інпути ↔ вибір з пошуку.

**Props:**
```ts
type Props = {
  lat?: number
  lng?: number
  onChange: (next: { lat: number; lng: number; addressHint?: NominatimAddressHint }) => void
}
```

`addressHint` дозволяє батьківській формі автозаповнити поля адреси після reverse geocoding.

## Геокодер (Nominatim)

Новий модуль `lib/nominatim.ts`:

```ts
type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    suburb?: string
    city_district?: string
    road?: string
    house_number?: string
    country?: string
  }
}

export const searchPlaces = (query: string): Promise<NominatimResult[]>
export const reverseGeocode = (lat: number, lng: number): Promise<NominatimResult | null>
```

- Endpoint: `https://nominatim.openstreetmap.org/search` та `/reverse`
- `format=json`, `limit=5`, `addressdetails=1`
- Заголовок `Accept-Language: uk,en`
- AbortController для скасування попереднього запиту під час дебаунса

## Flow сабмита

```
handleSubmit
  ├── playgroundApi.create({ body })            ──> playground.id
  ├── for each File in photos:
  │     playgroundApi.uploadPhoto({ pathParams: { id }, body: FormData })
  │     update progress (idx/total) в toast.loading
  ├── router.push(`/sports-map/${id}`)
  ├── catch ApiError (validation) → setServerErrors на поля
  └── catch ApiError (photos) → router.push(`/sports-map/${id}/edit`), toast.warning
```

## Валідація (zod)

```ts
const schema = z.object({
  name: z.string().max(200),
  description: z.string().max(2000),
  city: z.string().max(120),
  district: z.string().max(120),
  street: z.string().max(200),
  fullAddress: z.string().max(400),
  lat: z.number({ message: 'Оберіть місце на карті' }).min(-90).max(90),
  lng: z.number({ message: 'Оберіть місце на карті' }).min(-180).max(180),
  sportIds: z.array(z.string()),
})
```

Default `lat`/`lng` — `undefined` (через `useForm<FormData | Partial<FormData>>`). Кнопка submit `disabled`, поки `lat`/`lng` undefined.

Файли валідуються поза zod: тип ∈ {JPG, PNG, WebP, GIF}, розмір ≤ 15 МБ (логіка взята з edit-сторінки).

## UX-деталі

- Sticky bottom bar з кнопками — щоб кнопка «Створити» завжди була на видноті.
- Empty-state для фото — велика dashed-зона з іконкою (`ImagePlus`).
- Прев'ю фото — `URL.createObjectURL`, кліпиться при unmount.
- Loading state кнопки створення — `<Loader2 className="animate-spin" />`.
- При помилці — форма не очищається, дані лишаються.

## Discoverability

На сторінці `app/[locale]/sports-map/page.tsx` додати FAB-кнопку «+ Створити площадку» поряд із фільтром (верхній правий кут, під/над `SportsFilter`).

## Файли

| Файл | Що робимо |
|------|-----------|
| `lib/nominatim.ts` | Новий — функції геокодера |
| `components/sports-map/PlaygroundLocationPicker.tsx` | Новий — інтерактивний пікер |
| `app/[locale]/sports-map/new/page.tsx` | Новий — сторінка створення |
| `app/[locale]/sports-map/page.tsx` | Правимо — додаємо FAB-кнопку |
| `services/configs/playground.config.ts` | Без змін |

## Не входить у scope

- Окремий backend-endpoint для геокодинга (використовуємо публічний Nominatim з клієнта).
- Завантаження кількох фото одним запитом (бекенд приймає по одному).
- Drag-and-drop сортування фото після завантаження.
- Збереження чернеток (draft) у localStorage.
