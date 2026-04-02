# src/components/analytics — Analytics Visualization Components

## Purpose

D3.js-powered charts and analytics UI components for admin and teacher dashboards.

## Files

| File | Description |
|------|-------------|
| `D3HeatMap.tsx` | Interactive D3 heat map showing engagement by day-of-week × hour-of-day. Props: `data` (array of `{day, hour, value}`), `width`, `height`, `colorScheme` (blues/reds/greens/viridis/plasma), `onCellClick`, `title`. Renders into an SVG via `useRef` + `useEffect`. |
| `DateRangeSelector.tsx` | Date range picker for filtering analytics data. Likely emits a `{from, to}` callback used by parent analytics pages. |
| `ExportPanel.tsx` | UI for exporting analytics data to CSV. Works with `scripts/` CSV utilities. |
| `MetricCard.tsx` | Stat card with a label, value, and optional trend indicator. Used in analytics dashboards as the summary row. |

## Key Patterns

- D3 mutations are isolated in `useEffect` — no direct DOM manipulation outside effects
- All components are client-only; mount with `client:load` in Astro pages

## Cross-References

- `src/pages/admin/analytics.astro` — mounts these components
- `src/pages/teacher/analytics.astro` — uses `MetricCard` and `DateRangeSelector`
- `tests/utils/exportCSV.test.ts` — tests for export functionality
