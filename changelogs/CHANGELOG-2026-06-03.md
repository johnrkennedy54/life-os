# Life OS — Changelog — Jun 3, 2026

| # | Date | Version | Type | Change | Description | Files |
|---|------|---------|------|--------|-------------|-------|
| 026 | Jun 3, 2026 | v0.1 | FEAT | Drag-to-reorder sidebar categories | Added a grip handle to each sidebar category header; dragging from the handle reorders categories live and persists the new order to localStorage across sessions. | public/index.html, public/css/style.css, public/js/app.js |
| 027 | Jun 3, 2026 | v0.1 | INFRA | Changelog script: CLI arg support + same-day append | Script now accepts five CLI args for non-interactive use; dated file is appended to (not recreated) on same-day runs; readline only opened when running interactively. | scripts/changelog.js |
