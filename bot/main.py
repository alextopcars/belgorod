import hashlib
import logging
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
# Telegram Bot API URLs include the bot token; prevent HTTP client logs from exposing it.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
log = logging.getLogger("alex-topcars-bot")

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "").strip()
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "").strip()
PUBLIC_URL = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")

TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}" if BOT_TOKEN else ""
app = FastAPI(title="AlexTopCarsLeadBot", docs_url=None, redoc_url=None)

# In-memory conversation state is sufficient for a small first version.
# For durable multi-instance use, move this to Redis or a database.
flows: dict[int, dict[str, Any]] = {}

SERVICE_LABELS = {
    "selection": "Подбор автомобиля",
    "purchase": "Покупка автомобиля",
    "delivery": "Доставка автомобиля",
    "tradein": "Trade-in",
    "sale": "Комиссионная продажа",
    "consultation": "Консультация",
}


async def telegram(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{TELEGRAM_API}/{method}", json=payload)
        response.raise_for_status()
        data = response.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram API {method} failed: {data}")
        return data.get("result", {})


async def send_message(chat_id: int, text: str, reply_markup: dict[str, Any] | None = None) -> None:
    payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    await telegram("sendMessage", payload)


async def answer_callback(callback_id: str, text: str = "") -> None:
    await telegram("answerCallbackQuery", {"callback_query_id": callback_id, "text": text})


def main_menu() -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [{"text": "Оставить заявку", "callback_data": "new:lead"}],
            [{"text": "Узнать об услугах", "callback_data": "new:services"}],
        ]
    }


def services_menu() -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [{"text": "Подбор автомобиля", "callback_data": "service:selection"}],
            [{"text": "Покупка автомобиля", "callback_data": "service:purchase"}],
            [{"text": "Доставка", "callback_data": "service:delivery"}],
            [{"text": "Trade-in", "callback_data": "service:tradein"}],
            [{"text": "Комиссионная продажа", "callback_data": "service:sale"}],
            [{"text": "Консультация", "callback_data": "service:consultation"}],
            [{"text": "Оставить обычную заявку", "callback_data": "new:lead"}],
        ]
    }


async def begin_flow(chat_id: int, mode: str, service: str = "") -> None:
    flows[chat_id] = {
        "mode": mode,
        "service": service,
        "step": "wish",
        "name": "",
        "contact": "",
        "wish": "",
    }
    if mode == "services":
        prompt = (
            f"Что именно вас интересует по услуге «{service}»? "
            "Напишите модель автомобиля, бюджет или задайте вопрос."
        )
    else:
        prompt = (
            "Какой автомобиль вы ищете? Напишите марку/модель, примерный бюджет, "
            "год выпуска или другие пожелания."
        )
    await send_message(chat_id, prompt + "\n\nДля отмены отправьте /cancel.")


async def notify_admin(user: dict[str, Any], chat_id: int, flow: dict[str, Any]) -> bool:
    if not ADMIN_CHAT_ID:
        log.error("ADMIN_CHAT_ID is not configured; lead was not forwarded")
        return False
    username = user.get("username")
    username_text = f"@{username}" if username else "не указан"
    topic = flow.get("service") or "Подбор автомобиля"
    message = (
        "🚘 Новая заявка с сайта alex.topcars\n\n"
        f"Тип: {topic}\n"
        f"Пожелания: {flow.get('wish') or 'не указаны'}\n"
        f"Имя: {flow.get('name') or 'не указано'}\n"
        f"Контакт: {flow.get('contact') or 'не указан'}\n"
        f"Telegram клиента: {username_text}\n"
        f"Chat ID клиента: {chat_id}"
    )
    try:
        await send_message(int(ADMIN_CHAT_ID), message)
        return True
    except (ValueError, RuntimeError, httpx.HTTPError) as exc:
        log.exception("Unable to forward lead to admin: %s", exc)
        return False


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "AlexTopCarsLeadBot", "status": "ok"}


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({
        "status": "ok",
        "telegram_token_configured": bool(BOT_TOKEN),
        "admin_chat_configured": bool(ADMIN_CHAT_ID),
        "webhook_url_configured": bool(PUBLIC_URL),
    })


@app.on_event("startup")
async def configure_webhook() -> None:
    if not BOT_TOKEN:
        log.warning("TELEGRAM_BOT_TOKEN is missing. Add it in the hosting environment.")
        return
    if not PUBLIC_URL:
        log.warning("RENDER_EXTERNAL_URL is missing. Set the Telegram webhook after deployment.")
        return
    payload: dict[str, Any] = {
        "url": f"{PUBLIC_URL}/telegram/webhook",
        "allowed_updates": ["message", "callback_query"],
        "drop_pending_updates": False,
    }
    if WEBHOOK_SECRET:
        payload["secret_token"] = hashlib.sha256(WEBHOOK_SECRET.encode("utf-8")).hexdigest()
    try:
        await telegram("setWebhook", payload)
        log.info("Telegram webhook configured successfully: %s/telegram/webhook", PUBLIC_URL)
    except (RuntimeError, httpx.HTTPError) as exc:
        log.exception("Could not configure Telegram webhook: %s", exc)


@app.post("/telegram/webhook")
async def telegram_webhook(request: Request) -> dict[str, bool]:
    if not BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Bot token is not configured")
    if WEBHOOK_SECRET:
        incoming_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if incoming_secret != hashlib.sha256(WEBHOOK_SECRET.encode("utf-8")).hexdigest():
            raise HTTPException(status_code=403, detail="Invalid webhook secret")
    update = await request.json()
    try:
        await handle_update(update)
    except (RuntimeError, httpx.HTTPError, ValueError, KeyError) as exc:
        log.exception("Failed to process Telegram update: %s", exc)
    return {"ok": True}


async def handle_update(update: dict[str, Any]) -> None:
    callback = update.get("callback_query")
    if callback:
        await handle_callback(callback)
        return
    message = update.get("message")
    if not message:
        return
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    user = message.get("from", {})
    if not chat_id or chat.get("type") != "private":
        return
    text = (message.get("text") or "").strip()
    if not text:
        await send_message(chat_id, "Пожалуйста, отправьте ответ текстом.")
        return

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        payload = parts[1].strip() if len(parts) > 1 else ""
        if payload == "lead":
            await begin_flow(chat_id, "lead")
        elif payload == "services":
            await send_message(
                chat_id,
                "Здравствуйте! Alex.topcars поможет с подбором, покупкой и доставкой автомобиля.\n\nЧто вас интересует?",
                services_menu(),
            )
        else:
            await send_message(
                chat_id,
                "Здравствуйте! Это Alex.topcars. Поможем подобрать, купить и доставить автомобиль из Кореи, Китая и Европы.\n\nВыберите, с чего начнём:",
                main_menu(),
            )
        return

    if text == "/myid":
        await send_message(
            chat_id,
            f"Ваш Telegram Chat ID: {chat_id}\nСкопируйте это число в переменную ADMIN_CHAT_ID в настройках хостинга."
        )
        return

    if text == "/cancel":
        flows.pop(chat_id, None)
        await send_message(chat_id, "Заявка отменена. Чтобы начать заново, нажмите кнопку ниже.", main_menu())
        return

    flow = flows.get(chat_id)
    if not flow:
        await send_message(chat_id, "Чтобы оставить заявку или узнать об услугах, выберите действие:", main_menu())
        return

    if flow["step"] == "wish":
        flow["wish"] = text[:1500]
        flow["step"] = "name"
        await send_message(chat_id, "Как к вам обращаться?")
        return

    if flow["step"] == "name":
        flow["name"] = text[:200]
        flow["step"] = "contact"
        await send_message(chat_id, "Оставьте номер телефона или ваш Telegram username, чтобы менеджер мог связаться с вами.")
        return

    if flow["step"] == "contact":
        flow["contact"] = text[:250]
        delivered = await notify_admin(user, chat_id, flow)
        flows.pop(chat_id, None)
        if delivered:
            await send_message(
                chat_id,
                "Спасибо! Заявка отправлена менеджеру Alex.topcars. С вами свяжутся по указанному контакту."
            )
        else:
            await send_message(
                chat_id,
                "Заявка заполнена, но уведомления менеджеру пока не настроены. "
                "Пожалуйста, напишите напрямую: https://t.me/+79192826666"
            )


async def handle_callback(callback: dict[str, Any]) -> None:
    callback_id = callback.get("id")
    message = callback.get("message", {})
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    data = callback.get("data", "")
    if callback_id:
        await answer_callback(callback_id)
    if not chat_id:
        return
    if data == "new:lead":
        await begin_flow(chat_id, "lead")
    elif data == "new:services":
        await send_message(chat_id, "Выберите интересующую услугу:", services_menu())
    elif data.startswith("service:"):
        code = data.split(":", 1)[1]
        service = SERVICE_LABELS.get(code)
        if service:
            await begin_flow(chat_id, "services", service)
        else:
            await send_message(chat_id, "Выберите услугу ещё раз:", services_menu())
