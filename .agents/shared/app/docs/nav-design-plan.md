# Plan: one design language for the left and right navigations

Status: executed 2026-11-25 (phases 0 to 7). Written the same day, revised after an audit. Based on the source and on measurements of the running app (`.modernization/app`, built from this folder).

What changed while executing, against the plan below:

- The rail does not take weight 500 for its current entry: measured on Architecture, it re-wrapped 3 of 27 rows. The border and foreground colour carry it. The sidebar keeps weight 500 and the fill.
- The rail needed 8 px of room on its left (`ps-spacing-md` on the aside) or the 4 px focus outline was clipped by its scroll container.
- The sidebar's vendored ring was replaced by the same outline as the rail (`focus-visible:ring-0 outline-solid`) so both focus indicators match.
- The plan matrix's cell focus ring was at 50% opacity (about 2.2 to 2.6:1, under 3:1); it is now full strength.
- Not done: the axe scan (not a dependency here; adding it needs approval), and a real forced-colours and reduced-motion run (the browser pane cannot emulate them). `bun run check` fails before any of this work on `vendor/ui` (`select.tsx` is missing from `SOURCE.json`); `astro check` alone reports 0 errors.

## What we found

Measured in the browser at 1440 px wide, dark theme.

| | Left nav (sections) | Right rail (On this page) |
|---|---|---|
| Component | `shell/NavMenu.tsx` on the vendored `SidebarMenuButton` | `shell/Contents.tsx` (`Links`) |
| Idle | Foreground text, no fill | Muted text, 2 px transparent leading border |
| Hover | Fill at 50% of the sidebar accent, accent text | Text goes muted to foreground, no fill |
| Hover motion | None. The only transition is `width, height, padding` (0.15 s), so colour snaps | `transition-colors`, `--motion-duration-quick` (0.1 s) |
| Pressed | Darker fill (`active:`) | None |
| Active | Filled accent, weight 500, set at build time (`aria-current="page"`, `data-active`) | 2 px foreground leading border, weight 500, foreground text, set by script (`aria-current="location"`) |
| How active changes | Page navigation, then the new page renders with its own item marked | Immediately on click, then on scroll (a heading passes 30% of the viewport) |
| Row height / radius | 32 px / 6 px | 24 px / 0 |
| Focus | 2 px box-shadow ring in the ring colour, no offset | 2 px outline, 2 px offset, ring colour (from `app.css`) |
| Group label | "Sections", 12 px, 70% opacity | "On this page", 12 px, muted |

Other "current" treatments in the app, none shared with the two navs: the plan matrix (inverted fill), the vendored `item.tsx` (muted fill plus an inset leading bar made with a box-shadow), and the search palette (`aria-selected:bg-accent`).

Reduced motion is already handled (`app.css` sets the motion durations to 0 ms), so every new transition must use the `--motion-duration-*` tokens and nothing else.

Conflict to settle first: `docs/design-language.md` says "No right rail, no outline, no related panel" and describes a grouped sidebar (Understand / Modernization / Reference). The code has a right rail (`Contents.tsx`, commit d3f53d55) and a flat "Sections" list. One of them is out of date.

## Constraints

- `vendor/ui` is synced from Continuum and is never edited. Left-nav changes go through `className` on `SidebarMenuButton` in `NavMenu.tsx`.
- No raw colours or pixel font sizes outside the two theme files (a test fails on it). Use theme tokens.
- State is never carried by colour alone: the active item needs a shape (marker) as well as the fill.
- The sidebar ships no script; keep it that way.
- The built app is made only through the skill's build command, never by running `astro build` by hand (see Phase 5).

## Accessibility target: WCAG 2.2 AA

Contrast measured from the theme tokens (`--background`, `--foreground`, `--muted-foreground`, `--sidebar-accent`, `--ring`). A ratio below 4.5 fails for text (1.4.3), below 3 fails for a state indicator or focus ring (1.4.11).

| Pair | Dark | Light | Result |
|---|---|---|---|
| Muted text on page | 7.78 | 6.80 | Pass |
| Foreground text on page | 16.89 | 15.58 | Pass |
| Muted text on the 50% hover fill | 6.57 | 6.27 | Pass |
| Foreground text on the hover fill | 14.27 | 14.37 | Pass |
| Foreground text on the active fill | 11.01 | 13.21 | Pass |
| Muted text on the active fill | 5.07 | 5.77 | Pass |
| Group label at 70% opacity on page | 8.39 | 6.14 | Pass |
| Active fill against page | 1.53 | 1.18 | Fails alone |
| Hover fill against page | 1.18 | 1.08 | Fails alone |
| Foreground marker against page | 16.89 | 15.58 | Pass |
| Foreground marker against the active fill | 11.01 | 13.21 | Pass |
| Focus ring (full strength) against page | 7.20 | 5.53 | Pass |
| Focus ring against the active fill | 4.69 | 4.69 | Pass |

What this means for the design:

- The fills are decoration. They are far below 3:1 against the page, so the active item must keep the leading marker. It is what meets 1.4.1 (not colour alone) and 1.4.11.
- Never lower the marker or ring to a partial opacity. Measured at 50% opacity, the ring would be 2.55 (dark) and 2.16 (light), both failing.
- Criteria that apply, and how each is met:

| Criterion | How |
|---|---|
| 1.4.1 Use of colour | Marker plus weight, not fill alone |
| 1.4.3 Contrast (text) | Table above; all pass. No new text colour outside it |
| 1.4.11 Non-text contrast | Marker and ring at full strength |
| 1.4.10 Reflow, 1.4.4 Resize | Check the sheet at 320 px and at 200% zoom |
| 1.4.13 Content on hover | Hover shows only a fill; no tooltip or popup |
| 2.1.1 Keyboard, 2.1.2 No trap | Tab through both navs and the sheet |
| 2.4.1 Bypass blocks | The skip link to `#main` exists; keep it first |
| 2.4.3 Focus order, 2.4.7 Focus visible | Ring visible on every item in both navs, both themes |
| 2.4.11 Focus not obscured | The sticky top bar is 3rem, `scroll-padding-top` is 4.5rem; check a focused rail link is not under it |
| 2.5.8 Target size (minimum) | At least 24 by 24 px. The rail rows are exactly 24 px high, so no padding may be removed from them |
| 3.2.3 / 3.2.4 Consistent navigation | One recipe for both navs gives this |
| 4.1.2 Name, role, value | `aria-current="page"` (left) and `aria-current="location"` (rail) already say the active item; keep them |
| Forced colours (High Contrast mode) | Fills vanish; the marker must be a border or outline, not a background or box-shadow, so it survives |

## Audit of this plan

Checked against the code and the running app. Corrections are folded into the phases.

1. **Claim checked: our `className` wins over the vendored one.** `SidebarMenuButton` merges with `cn(variants, className)`, so ours is applied last. But `cn` merges conflicting Tailwind classes, and `transition-[width,height,padding]` and `transition-colors` are the same group, so ours replaces the vendored one. That only affects the collapsed-icon mode, which this app never uses (the sidebar never collapses), so it is safe, but Phase 2 states it and tests the computed style.
2. **Gap: the active marker as a box-shadow would not survive forced colours.** The vendored `item.tsx` uses an inset box-shadow. The marker for both navs is therefore a border (as the rail already does), and Phase 4 notes the item.tsx case.
3. **Gap: ring fades in.** The rail's `transition-colors` includes `outline-color`, so the focus ring fades from transparent over 0.1 s (measured mid-fade at 50% alpha, full strength after). That is acceptable but not ideal: Phase 3 limits the transition to `color, background-color, border-color` so the ring appears instantly.
4. **Risk: the rail's focus ring clipping.** The rail scrolls (`overflow: auto`), and a ring with a 2 px offset can be cut at its edges. Checked live: the ring on a rail link is fully visible today because the links sit 12 px in from the edge. Phase 3 must keep that gap.
5. **Risk: bold on the active item shifts text.** Left rows are full width, so no shift. Rail rows wrap, so a weight change can re-wrap a line and move the list. Phase 3 measures this on the longest entries and, if lines re-wrap, drops the weight change on the rail (the marker still carries state).
6. **Risk: duplicated links.** The rail and the fold both exist in the page for the same headings, so `data-contents-link` appears twice and the script marks both. This is correct, but tests must query only the visible one.
7. **Gap: no tests for the new behaviour.** Nothing pins hover, active or focus today. Phase 5 adds a scripted computed-style check (listed there) so the recipe cannot drift.
8. **Gap: the built app was not in the plan.** The pages people open come from `.modernization/app`, not from this source folder, so a change here is invisible until it is rebuilt. This is now Phase 5.
9. **Order risk.** Applying the recipe to two navs before agreeing it (Phase 0) would mean doing it twice. Phase 0 stays first and needs your decision.
10. **Out of scope, on purpose.** The top bar, breadcrumbs, the theme switcher and the story sheet are not navigations of this kind. Nothing in this plan changes them.

## Phases

### Phase 0: Decide the language (no code)

1. Resolve the doc conflict: amend "No right rail" to describe the "On this page" rail, or confirm the rail is to go. Recommendation: amend the doc, since the rail is shipped and useful on long pages.
2. Agree the shared recipe below.

Shared recipe for any navigation item:

- Idle: muted text.
- Hover: text to foreground and a soft fill (accent at 50%), faded in over `--motion-duration-quick`. The fill is decoration only; hover carries no information.
- Pressed: the existing darker fill.
- Focus-visible: a full-strength 2 px ring in the ring colour, appearing instantly, never clipped.
- Active: foreground text, weight 500, a 2 px leading border marker in foreground (the state carrier), plus the filled accent on the left nav only.
- Same radius (`rounded-control`), duration and easing on both navs.

Done when: the recipe and the doc fix are agreed in writing.

### Phase 1: Put the recipe in one place

1. Add one shared module, `src/components/shell/navItem.ts`, exporting the class strings for the states above (base, hover, pressed, focus, active, marker), built only from theme tokens.
2. If a colour needs a name, add a token to `src/styles/reader-theme.css` rather than a literal.
3. Run the existing raw-colour test; it must still pass.

Done when: the module exists, nothing imports it yet, and the checks pass.

### Phase 2: Left nav

1. In `NavMenu.tsx`, pass the shared classes as `className` on `SidebarMenuButton`: add the colour transition on the quick duration and the leading border marker on the active item.
2. Keep `isActive` and `aria-current` exactly as they are, so no behaviour or script changes.
3. Give the header link and the group label the same muted-to-foreground treatment where they are interactive.
4. Confirm `MobileNav.tsx` (the sheet shares `NavMenu`) picks the change up.
5. Check the computed style, not the class list, to prove ours won over the vendored default.

Done when: hover fades, the active item shows fill and marker, the page still ships no sidebar script.

### Phase 3: Right rail and fold

1. In `Contents.tsx` `Links`, replace the inline class string with the shared recipe. Add the soft hover fill and the rounded radius; keep the leading border as the marker.
2. Limit the transition to `color, background-color, border-color` so the focus ring is instant.
3. Keep row height at 24 px or more (2.5.8) and keep the 12 px gap that stops the ring clipping.
4. Measure the weight change on the longest entries; if any line re-wraps, drop the weight change on the rail.
5. Apply the same recipe to `ContentsFold` (below 1280 px).
6. Leave `scripts/contents.ts` logic alone.

Done when: both navs show the same hover, pressed, focus and active behaviour, and scrolling and clicking still mark the right entry.

### Phase 4: Other places that show "current"

1. Palette rows (`scripts/shell.ts`): align `aria-selected` to the recipe's fill and text.
2. Plan matrix (`plan/Matrix.tsx`): keep the inverted fill, since it marks a chosen cell and not a navigation item, and record it as the one deliberate exception. Check it has a non-colour cue (it has text colour inversion plus underline removal).
3. Vendored `item.tsx` rows: note that its box-shadow marker disappears in forced colours. It cannot be edited here, so report it for the next Continuum sync instead of working around it.

Done when: every "current" treatment is either the shared recipe or a listed exception.

### Phase 5: Rebuild `.modernization/app` so it reflects the new design

The app people open is the built copy, so this phase is what makes the change real.

1. Do not run `astro build` by hand (the app's `package.json` says it is run through a skill's build-app command). Use the modernization skill: its step runner treats the app source as an input of the `app` step, so editing the source marks the app out of date and prints the exact command to run. That command composes the case from the analysis, the target and the plan, then builds into `.modernization/app`.
2. Run that command. Do not edit `.modernization/case` or the payloads.
3. Check the output: the build exits cleanly, `.modernization/app/index.html` is newer than the source change, and `language-report.json` shows no new findings.
4. Restart or reload the preview of `.modernization/app` (served on port 4321) and confirm the new hover, active and focus styles are present in the shipped CSS: read the computed style of a left item and a rail link in the browser, not the source.
5. Note that `.modernization/` is untracked in git, so the rebuilt output is not versioned; nothing here is committed.

Done when: the preview of `.modernization/app` shows the new language on Architecture, Journeys and Plan, with the computed styles matching the recipe.

### Phase 6: Verify, including accessibility

1. `bun run check` in the app folder (type checks, vendor sync check, schema generation).
2. Scripted check against the built app: for each of left idle, hover, active and rail idle, hover, active, assert the computed text colour, fill, marker width, weight, transition property and duration, and focus outline colour and offset, in both themes. Fail if any contrast pair in the table above drops below its threshold.
3. An automated accessibility scan (axe) of Architecture, Journeys and Plan in both themes, expecting no violations. If axe is not already a dev dependency, adding it needs your approval.
4. Manual keyboard pass: skip link, Tab through the sidebar and the rail, Enter on an item, Shift+Tab back. Focus is visible on every stop, never hidden under the top bar, and there is no trap.
5. Screen reader spot check: the active item is announced as current page (left) or current location (rail).
6. Layouts: 1440, 1280 (the rail threshold), 768, 375 and 320 px; 200% zoom; reduced motion on (hover and active changes must be instant); forced colours on (the marker still shows).
7. Confirm no layout shift when an item becomes active.

Done when: every item above passes and before and after screenshots are attached to the change.

### Phase 7: Write it down

1. Update `docs/design-language.md` with a short "Navigation" section: the recipe, the ratios the marker and ring must keep, the one exception, and the corrected layout paragraph from Phase 0.
2. Note in the `NavMenu.tsx` and `Contents.tsx` header comments that both take their look from `navItem.ts`.

Done when: the doc matches the code and names where to change the language in future.

## Order and risk

Phases 0 to 3 are the core and land in that order. Phase 5 must follow them or the preview will not show anything. Phases 4, 6 and 7 can follow separately, but 6 must run before the work is called done. The main technical risk is the vendored classes (item 1 of the audit), which is why Phases 2 and 5 check computed styles in the browser rather than trusting the class list.
