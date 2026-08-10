# Classic GDT loop (spine)

Based on classic Game Dev Tycoon mechanics (phase sliders, topic×genre combos, moving target reviews).

## Player turn
1. Pick **Topic / Genre / Platform / Audience**
2. Set **phase sliders** (3 stages × 3 fields) toward genre ideals
3. Develop weeks → accumulate **Design + Tech points**
4. **Reviews** = `10 × baseScore / targetHighScore` (size-capped)
5. **Units** = `(T+D) × review² × 9 × size × platform × combo`

## What was broken
- Production quality path awarded near-perfect scores for finishing work with default sliders
- Weekly sales double-counted platform lifecycle → ~16 units total
- Design/tech points were not accruing during production weeks

## Fix
- `classicGdt.ts` is the legible spine
- Release scoring always uses classic reviews
- Sales use classic unit plan (`salesEngine: classic_gdt`)
- Points accrue each production week via `generateWeekPoints`
