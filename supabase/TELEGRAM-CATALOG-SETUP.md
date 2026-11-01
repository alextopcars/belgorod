# alex.topcars — Telegram catalog sync

## Flow
Telegram channel `@alex_topcars` → Telegram Bot webhook → Supabase Edge Function → Supabase Postgres + Storage → website/mobile catalog.

## Telegram post format
Use one vehicle per channel post. Put the key data in the caption/text; attach up to 10 photos (a Telegram album is supported).

Example:
```
BMW X5 30d
Год: 2022
Цена: 8 900 000 ₽
Пробег: 42 000 км
Двигатель: 3.0 дизель
КПП: автомат
Привод: полный
Статус: В наличии
Описание: хорошее состояние, прозрачная история.
```

Recognized labels: Год/Год выпуска, Цена/Стоимость, Пробег, Двигатель/Мотор, КПП/Коробка/Трансмиссия, Привод, Марка, Модель.
Status is detected from text: "Продан" → sold; "Под заказ"/"На заказ" → on_order; otherwise available.

## Setup
1. Create a Supabase project.
2. Run `supabase/migrations/202611010001_create_vehicle_catalog.sql` in Supabase SQL Editor.
3. Deploy function `supabase/functions/telegram-catalog/index.ts` as `telegram-catalog`.
4. Create a separate Telegram bot with @BotFather for catalog synchronization. Use a dedicated bot rather than the existing lead bot, so setting this webhook does not replace any webhook used by lead handling.\n5. Add the new catalog bot as an administrator of @alex_topcars with permission to read channel posts.\n6. Set Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET` (random secret string)
   - `TELEGRAM_CHANNEL_USERNAME` = `alex_topcars`
5. Add the bot as an administrator of @alex_topcars with permission to read channel posts.
6. Register webhook:
   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-catalog&secret_token=<WEBHOOK_SECRET>`
8. Frontend reads GET `https://<PROJECT_REF>.supabase.co/functions/v1/telegram-catalog`.

Important: Telegram Bot API sends new and edited channel posts, but does not provide a reliable channel-post deletion update. Mark sold in the post text rather than deleting it. For Telegram albums, each photo update shares one media_group_id and is grouped into one catalog vehicle.

Never put the bot token or Supabase service-role key in website JavaScript or GitHub.
