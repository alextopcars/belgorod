import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-telegram-bot-api-secret-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
}
function field(text: string, labels: string[]) {
  const names = labels.join("|");
  const re = new RegExp("^(?:" + names + ")\\s*[:—-]\\s*(.+)$", "im");
  return clean(text.match(re)?.[1] ?? "");
}
function parsePost(text: string) {
  const title = clean(text.split(/\r?\n/)[0] ?? "").replace(/^#/, "").trim();
  const yearText = field(text, ["Год", "Год выпуска", "Year"]);
  const priceText = field(text, ["Цена", "Стоимость", "Price"]);
  const mileageText = field(text, ["Пробег", "Mileage"]);
  const year = Number(yearText.match(/20\d{2}|19\d{2}/)?.[0] ?? NaN);
  const priceDigits = priceText.replace(/[^\d]/g, "");
  const mileageDigits = mileageText.replace(/[^\d]/g, "");
  const statusText = text.toLowerCase();
  const status = /продан|sold/.test(statusText) ? "sold"
    : /под заказ|на заказ|заказ/.test(statusText) ? "on_order" : "available";
  const brand = field(text, ["Марка", "Бренд"]) || title.split(/\s+/)[0] || "";
  const model = field(text, ["Модель"]) || title.replace(new RegExp("^" + brand + "\\s*", "i"), "");
  return {
    title: title || "Автомобиль",
    brand: brand || null,
    model: model || null,
    year: Number.isFinite(year) ? year : null,
    price: priceDigits ? Number(priceDigits) : null,
    currency: /\$|usd|доллар/i.test(priceText) ? "USD" : /€|eur|евро/i.test(priceText) ? "EUR" : "RUB",
    mileage_km: mileageDigits ? Number(mileageDigits) : null,
    engine: field(text, ["Двигатель", "Мотор"]),
    transmission: field(text, ["КПП", "Коробка", "Трансмиссия"]),
    drive: field(text, ["Привод"]),
    description: text,
    status,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  if (req.method === "GET") {
    const { data, error } = await supabase.from("vehicles")
      .select("id,title,brand,model,year,price,currency,mileage_km,engine,transmission,drive,description,status,photos,source_url,created_at")
      .in("status", ["available", "on_order", "sold"])
      .order("created_at", { ascending: false });
    if (error) return response({ error: error.message }, 500);
    return response({ vehicles: data ?? [] });
  }

  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return response({ error: "Unauthorized webhook" }, 401);
  }

  const update = await req.json();
  const post = update.channel_post ?? update.edited_channel_post;
  if (!post) return response({ ok: true, ignored: true });
  const expected = (Deno.env.get("TELEGRAM_CHANNEL_USERNAME") ?? "alex_topcars").replace(/^@/, "").toLowerCase();
  const actual = (post.chat?.username ?? "").toLowerCase();
  if (actual && actual !== expected) return response({ ok: true, ignored: true });

  const caption = clean(post.caption ?? post.text ?? "");
  const mediaGroup = post.media_group_id ? String(post.media_group_id) : null;
  const sourceKey = mediaGroup ? `${post.chat.id}:album:${mediaGroup}` : `${post.chat.id}:message:${post.message_id}`;
  const parsed = parsePost(caption);
  const sourceUrl = post.chat?.username
    ? `https://t.me/${post.chat.username}/${post.message_id}`
    : null;

  const { data: vehicle, error: upsertError } = await supabase.from("vehicles").upsert({
    source_post_key: sourceKey,
    telegram_chat_id: post.chat.id,
    telegram_message_id: post.message_id,
    telegram_media_group_id: mediaGroup,
    source_url: sourceUrl,
    ...parsed,
    raw_text: caption,
    published_at: new Date((post.date ?? Date.now() / 1000) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "source_post_key" }).select("id").single();
  if (upsertError) return response({ error: upsertError.message }, 500);

  const photos = (post.photo ?? []);
  if (photos.length) {
    const photo = photos[photos.length - 1];
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo.file_id}`);
    const fileInfo = await fileInfoRes.json();
    if (fileInfo.ok && fileInfo.result?.file_path) {
      const imageRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`);
      if (imageRes.ok) {
        const bytes = new Uint8Array(await imageRes.arrayBuffer());
        const ext = fileInfo.result.file_path.split(".").pop() || "jpg";
        const path = `${vehicle.id}/${photo.file_unique_id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("vehicle-photos")
          .upload(path, bytes, { contentType: imageRes.headers.get("content-type") ?? "image/jpeg", upsert: true });
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
          const { data: current } = await supabase.from("vehicles").select("photos").eq("id", vehicle.id).single();
          const currentPhotos = Array.isArray(current?.photos) ? current.photos : [];
          if (!currentPhotos.some((p: { file_unique_id?: string }) => p.file_unique_id === photo.file_unique_id)) {
            await supabase.from("vehicles").update({
              photos: [...currentPhotos, { url: publicUrl.publicUrl, file_unique_id: photo.file_unique_id }],
            }).eq("id", vehicle.id);
          }
        }
      }
    }
  }
  return response({ ok: true, vehicle_id: vehicle.id });
});
