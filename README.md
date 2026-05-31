# Fia's Emerald — companion app

A personal, single-character companion for the homebrew magic item **Fia's Emerald**
(modified 5E). It tracks tier progression, rolls the tier-correct dice for each unlocked power,
and totals damage/healing with a full breakdown. Offline, local, no accounts, no backend.

The Emerald **is** the interface: the gem (the original item art — an emerald in a gold serpent
setting) sits at the centre with the three active powers orbiting it; tapping one charges the gem,
fires a forked bolt down its wire, and raises the activation drawer. Passive effects sit in a quiet
rail beneath.

Built by re-skinning the **Mordewin's Sapphire** companion app (same engine, same structure).

## Powers (from `Fia's Emerald.docx`, the source of truth)

**Active** — orbit the gem, open a roller drawer:

- **Violet Aeonia** (1/Day) — a spell of desperation, usable at/below the tier's HP gate
  (≤25% / ≤50% / ≤75% / any). Free self-heal (2–4 HD), then Poison + Acid to designated creatures
  (DEX save halves, scales per creature), conditions on a CON save, and lingering sludge blobs.
- **Thorn Barriers** (2/short rest, 1st-level slot) — conjure 2–6 barrier units (AC/HP stat block,
  Weak to Fire, resistances at higher tiers). A reminder card, no dice.
- **Fey Blossom** (2/short rest, 2nd-level slot) — grow 1–2 seasonal blossoms. Pick a **season**:
  Spring (buff) · Summer (regen — rolls as heal) · Fall (debuff) · Winter (Cold damage + control).

**Passive** — shown in the rail / progression view:

- **Cat's Grace** — +1…+4 DEX · **Owl's Wisdom** — +1…+4 WIS · **Venomous Blood** — poison
  affinity (Resistance → Immunity → Absorb → Absorb + reflect ½).

Tier level gates come straight from the doc: **Base** any · **Enhanced** 6 · **Superior** 8 · **Ultimate** 11.

## Run

```bash
npm install
npm run dev      # local dev server (http://localhost:5180)
npm test         # unit tests (dice engine, rollers, unlock gates) — 39 tests
npm run build    # static production build → dist/
npm run preview  # serve the built dist/
```

The build is fully static and self-contained (fonts + icons are self-hosted, the gem art is
bundled — **no CDN at runtime**). Deploy `dist/` to GitHub Pages / Netlify / Vercel, or just open it
locally. `base` is `./` so it works from any sub-path. State persists in `localStorage`; use the
**Export / Import** buttons in the progression view to back up or move between devices.

## Structure

| Path | Purpose |
|---|---|
| `src/config.ts` | Fia's values, seeded unlocks, documented rules notes |
| `src/types.ts` | Domain types (tiers, powers, effects, save state) |
| `src/dice.ts` (+ `.test.ts`) | Dice engine: `roll`, per-target multiplier, `RollBuilder`, manual override |
| `src/powers.ts` (+ `.test.ts`) | Power dataset, tier tables, rollers, meta text, tier reference |
| `src/state/` | Reducer + `localStorage` persistence + unlock-gate logic (+ tests) |
| `src/components/` | `GemHub` (gem + nodes + choreography), `Drawer`, `Progression`, `Header`, `PassiveRail`, `Sky` |
| `scripts/cut-bg.mjs` | Regenerates `emerald-cut.png` (transparent gem) from `Emerald.png` |
| `scripts/generate-icons.mjs` | Builds the PWA icons in `public/icons/` from `emerald-cut.png` |

## The gem is raster art, not SVG

The canonical gem is **`Emerald.png` with its white background flood-filled out**
(`src/assets/emerald.png`, produced by `scripts/cut-bg.mjs`), with all the activation choreography
animating around/with it. Per-facet animation is intentionally out of scope. To swap art: replace
`Emerald.png`, run `node scripts/cut-bg.mjs` then `node scripts/generate-icons.mjs`.

## Theme

Emerald "Balanced" palette — jewel-emerald primary on a near-black green, with the gem's gold serpent
setting kept as the accent. Damage-type chips: Poison (violet) · Acid (lime) · Cold (cyan) · Heal (mint).
Defined in `src/index.css` (`:root` vars) and mirrored in `tailwind.config.js`.

## Rules notes (`config.ts → RULES_CONFLICTS`)

The doc is the source of truth. Two app-level decisions are flagged rather than silently resolved:

- **Currency naming** — the doc labels the unlock currency "AP"; this app calls it **Aurum** to stay
  consistent with the Sapphire build. Same resource, different label.
- **Per-tier Aurum costs** (1 / 2 / 3 / 4) are **not** specified in the doc; they carry over from the
  player's economy and are editable in the progression view.

## Out of scope (v1)

No HP / spell-slot / rest / usage tracking, no save-result prompts, no multi-character, no backend.
Usage limits (1/Day, 2/short rest) and slot costs are shown as meta text only.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml` (test → build → GitHub Pages).
