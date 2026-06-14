# Seeds

## `original-3-pathways.json`

A pristine snapshot of the three original CEP pathways that shipped with the
project:

| Slug | Title | Questions |
|---|---|---|
| `general-cep` | General Critical Element Pathway | 18 |
| `neglect-cep` | Neglect Critical Element Pathway | 15 |
| `infection-control-cep` | Infection Control Pathway | 15 |

It is in the `AdminWorkflowPayload` shape, so it can be re-imported at any time
through the existing import endpoints — no code changes needed.

### Restore (load the 3 pathways back into an empty database)

```bash
# additive import — adds the pathways without touching anything else
curl -s -X POST http://localhost:8010/api/admin/workflows/import-pack \
  -H "Content-Type: application/json" \
  --data @seeds/original-3-pathways.json
```

(Or use `/api/admin/workflows/import` with `reset_runtime: true` to replace the
entire questionnaire definition.)

> The canonical source for these 3 pathways is also `app/seed.py`
> (`seed_if_empty()`), which recreates them when the database is empty.
