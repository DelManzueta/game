# Module 23 — Accessories & Physical Merch

| Category | Setup | RP | Unit cost |
|----------|-------|-----|-----------|
| Branded Apparel | $12k | 20 | $2.50 |
| Pro Gamepad | $85k | 60 | $14 |
| Premium VR Visor | $450k | 200 | $110 |

- Launch pool ≈ `base + fans×0.45` (×1.8 if retail < unit cost)
- Shelf **16 weeks**, weekly decay `(weeksLeft/16)^1.8`
- Cash += units × (retail − unitCost)
- Fans: +1%/unit profit SKU · +5%/unit loss-leader

UI: More → Hardware → Accessory Factory  
IDE: `/studio-os-v35.html`  
Code: `hardwareMerch.ts`
