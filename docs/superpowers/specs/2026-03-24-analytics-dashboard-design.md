# Analytics Dashboard — Design Spec

## Goal
Clinic admin dashboard for financial and operational KPI tracking, accessible only to admin roles via `analytics.admin` permission.

## Access
- Permission: `analytics.admin` (admin + super_admin only)
- Route: `/analytics` (sidebar entry already exists)
- Practitioners do NOT have access (future consideration)

## KPI Cards (top row)
1. **CA total mois** — current month revenue + % change vs previous month
2. **Impayés** — overdue invoices count + total amount
3. **Taux d'encaissement** — paid amount / total invoiced (percentage)
4. **Activité RDV** — completed vs cancelled vs no-show count for current period

## Charts
1. **Évolution CA mensuelle** — 12-month bar chart (current year)
2. **Ventilation par traitement** — top 10 services by revenue (horizontal bars)
3. **Ventilation par praticien** — revenue per practitioner (bars or donut)

## Filters
- Date range presets: ce mois, mois dernier, trimestre, année, personnalisé
- Practitioner filter (dropdown)
- All filters apply to KPIs + charts simultaneously

## Backend
- Existing: `GET /documents/stats` (by status, totals, overdue)
- Existing: `GET /documents/stats/monthly` (12-month revenue)
- New: `GET /analytics/dashboard` — aggregated KPIs:
  - Revenue current/previous month
  - Collection rate
  - Appointment stats (completed/cancelled/no_show) for period
  - Revenue by service (top 10)
  - Revenue by practitioner

## Frontend
- New component: `AnalyticsModule.js` in `src/components/dashboard/modules/`
- Chart library: lightweight (recharts or inline SVG bars)
- Responsive: cards stack on narrow screens, charts full-width

## Data Sources
- `documents` table (invoices): revenue, payments, overdue
- `document_items` table: revenue per service (product_service_id)
- `appointments` table: completion rate, volume
- `healthcare_providers` table: practitioner names for grouping
