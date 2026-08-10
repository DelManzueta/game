# Phase-weighted feature allocation

Features inject baseline tech/design into a **phase**. If feature load / staff > 0.6 → bottleneck bugs.

| Feature | Phase | Tech | Design | Cost |
|---------|-------|------|--------|------|
| Stereo Sound | 3 | 12 | 5 | $8k |
| Branching Story | 1 | 2 | 28 | $15k |
| Advanced AI | 2 | 22 | 6 | $25k |
| Open World | 3 | 45 | 45 | $120k |

Efficiency = f(slider vs genre ideal). Points = (staff×slider + feature) × efficiency.

Code: `gdtAllocation.ts` · wired at ship in `store.ts`  
Storefront decay: `(pool/L)×(1−t/L)^2.2` in `gdtCanon.ts`  
NEONCORE IDE: `/neoncore-os.html` v3.2 research + features
