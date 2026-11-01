# alex.topcars — app workspace

This branch contains the public, secret-free foundation specification and starter scaffold for the mobile app/admin platform.

## Product decisions
- Mobile: React Native + Expo + TypeScript (Android and iOS).
- Admin: Next.js + TypeScript.
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions).
- Guest browsing plus phone/SMS sign-in.
- Vehicle sources: own Avito listings via permitted official API; Telegram channel @alex_topcars via a bot added as channel administrator.
- Checkout: Telegram handoff and online payment. Sberbank is the user's business bank; acquiring contract/API credentials still need to be obtained and validated.
- Deposit policy configured initially as 5% indicative default. The exact amount, contract terms and refund rules must be confirmed per order before charging.
- Full-price payment is a planned option, disabled until the seller/commission legal flow, acquiring approval, fiscal receipts and refunds are verified.

## Workspace layout
- `apps/mobile`: Expo app
- `apps/admin`: Next.js admin panel
- `packages/shared`: shared TypeScript types
- `supabase/migrations`: database schema and RLS

## Local setup
1. Copy `.env.example` to the appropriate local env files.
2. Create a Supabase project and apply migrations.
3. Install dependencies in each app workspace.
4. Never commit credentials. This repository is currently public; do not place secrets, real customer data or production exports here.

This is a scaffold, not a production-ready app. Payment processing and external API sync remain disabled until credentials and legal/provider approvals are configured.
