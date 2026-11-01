# Запуск alex.topcars на Android

## Вариант 1 — быстрый просмотр через Expo Go

Нужен компьютер с Node.js и npm, а на Android-телефоне — приложение Expo Go.

1. Скачайте репозиторий и переключитесь на ветку `alex-topcars-app-foundation`.
2. Откройте терминал в папке `alex-topcars-scaffold/apps/mobile`.
3. Выполните:

```bash
npm install
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo start --tunnel
```

4. Откройте Expo Go на телефоне и отсканируйте QR-код из терминала/браузера.
5. Телефон и компьютер должны иметь доступ к интернету.

Если Expo Go сообщает о несовместимой версии SDK, обновите Expo Go из Google Play и повторите запуск.

## Вариант 2 — установить отдельный APK

1. Создайте аккаунт на https://expo.dev/ и войдите в него на компьютере.
2. В папке приложения выполните:

```bash
npm install
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

3. Дождитесь окончания сборки на серверах Expo.
4. Откройте ссылку на APK из результата сборки на Android-телефоне и установите файл. Android может попросить разрешить установку приложений из этого источника.

## Что пока демонстрационное

Каталог содержит тестовые автомобили и цены. SMS-вход, отправка заявок, сохранение избранного между запусками, база автомобилей и платежи ещё не подключены. Не используйте тестовые карточки как реальные предложения.

## Важно

Не добавляйте пароли, ключи Supabase или другие секреты в публичный репозиторий. Сначала проверим запуск и экраны на телефоне, затем подключим реальные данные и сервисы.
