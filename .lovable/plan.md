# Addons & Custom Plan Builder System

Extend the existing Subscription system with à-la-carte addons, a custom plan builder, and per-feature staff/outlet add-ons. Plan features stay locked-in; addons stack on top.

## 1. Database (single migration)

### `feature_catalog` (static catalog — seeded)
- `feature_key` (PK, text) — e.g. `qr_orders`, `staff_management`, `ai_insights`
- `label`, `category` (`sales | inventory | staff | customer | reports | operations | delivery | ai`)
- `price_yearly` (numeric)
- `included_in` text[] — which plans auto-include it (`['basic']`, `['gold','platinum']`, etc.)
- `is_active` bool

### `merchant_addons` (per-merchant purchased addons)
- `merchant_id` (FK)
- `feature_key` (FK → feature_catalog)
- `enabled` bool, `purchase_date`, `expiry_date`, `created_at`, `updated_at`
- unique (merchant_id, feature_key)

### `merchant_custom_plan` (per-merchant custom-built plan toggles)
- `merchant_id` (FK, unique)
- `features` text[] — list of feature_keys selected
- `is_active` bool — when true, custom features merge with addons
- `total_price` numeric (computed client-side, stored for record)
- timestamps

### Extend `merchant_subscription` (already exists)
- add `extra_staff_count` (already have `extra_staff`)
- add `extra_outlet_count` (already have `extra_outlets`)
- *(no change needed — reuse existing columns)*

### Helper SQL function
`public.get_merchant_features(_user_id uuid) RETURNS text[]` — security definer; returns union of: plan-included features, active addons (not expired), and custom-plan features. Admin/super_admin returns `['*']`.

All tables get GRANT + RLS:
- Owners read/write their own rows
- Admins read/write all
- `feature_catalog` readable by all authenticated

## 2. Frontend feature registry

Update `src/lib/subscriptionConfig.ts` and add `src/lib/featureCatalog.ts`:
- Canonical list of every feature_key with: label, category, price, plan inclusion. Mirrors the seed in DB.
- Helpers: `getFeaturesForPlan(plan)`, `getPriceFor(keys[])`, `isLockedForPlan(plan, key)`.

## 3. Permission resolver (single source of truth)

New `src/contexts/FeatureAccessContext.tsx`:
- On auth ready, fetch in parallel: `merchant_subscription`, `merchant_addons`, `merchant_custom_plan`.
- Compute `allowedFeatures: Set<string>` = planFeatures ∪ addons.enabled ∪ customPlan.features (skipping expired addons).
- Expose: `{ plan, allowedFeatures, hasFeature(key), staffLimit, outletLimit, refresh() }`.
- Cache to localStorage `maxora.features.v1` for instant boot.
- Admin/super_admin → all features.

Refactor `useSubscription.canAccess` to delegate to FeatureAccessContext when available (keeps existing call-sites working).

`FeatureGuard` + `ProtectedPlanRoute` already read `canAccess` — no change.

## 4. Addons Marketplace + Custom Plan Builder UI

New page `src/pages/AddonsMarketplacePage.tsx` at `/addons`:
- Two tabs: **Marketplace** and **Custom Plan**.
- **Marketplace**: features grouped by category. Each shows label + price + status badge:
  - Included in plan → `🔒 Locked (Included)` (disabled toggle)
  - Already purchased → `✅ Active` (with expiry)
  - Otherwise → `[ Add to Plan ]` button → calls RPC/insert to `merchant_addons`.
- **Custom Plan**: checkboxes for every catalog feature (locked ones pre-checked & disabled), live price total, `[ Save Custom Plan ]` writes to `merchant_custom_plan`.
- Separate **Staff / Outlets** card: shows current limit + extras, `[ + Add Staff (₹199/yr) ]` and `[ + Add Outlet (₹2,999/yr) ]` increment `extra_staff` / `extra_outlets` in `merchant_subscription`.

Add `/addons` route (owner + admin only) + sidebar entry (always visible to owners).

## 5. Backend enforcement

New shared validator pattern used by existing functions:
- `create-staff` → check feature `staff_management` allowed.
- `create-store` → check `multi_outlet` for >1 outlet (already gated by outlet_limit).
- `smart-inventory-analysis` → check `smart_inventory`.
- `chat-assistant` → check `team_chat`.
- `place-qr-order` → check `qr_orders`.
- Helper inlined in each: query `public.get_merchant_features(user_id)` and assert membership; reject 403 with `required_feature`.

## 6. Sidebar / Dashboard

- Sidebar items already filtered via `canAccess(featureKey)`. Map remaining nav items to new feature_keys (Operations sub-items, Reports children) using `allowedFeatures`. Hidden = removed from DOM.
- Dashboard cards filtered the same way.
- Add `Addons` sidebar item (visible to owners/admins).

## 7. Testing helpers

`scripts/seed-addon-test.ts`: creates 4 demo merchants — basic, gold, platinum, custom — and assigns sample addons + custom plan. Documented in plan output for manual run.

Manual verification checklist included in chat response.

## Technical notes

- Locked features come from `feature_catalog.included_in` — UI cannot uncheck them.
- Expired addons treated as not-allowed (filter on read).
- Plan downgrade does not erase addons; addons remain effective until their own expiry.
- All access checks route through one resolver → no UI/API drift.
- No new RBAC roles. No edits to `auth.users` or auto-generated files.
