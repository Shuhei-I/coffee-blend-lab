# Coffee Blend Lab UI Architecture

## Purpose

The UI should support a mobile-first blending workbench.

Coffee Blend Lab is not a dashboard of stored recipes. It is a place where a user can quickly adjust a blend, brew it, record what happened, and decide what to try next.

The interface should make the experiment cycle easy:

Create -> Brew -> Record -> Review -> Refine

## Primary Navigation

Use a bottom navigation model for the primary mobile experience.

For the current v1.0 workbench, navigation is based on experiment phases. A broader app-home structure is documented separately in `docs/future-home-ui-structure.md` and should be treated as a later direction, not the immediate release target.

Primary sections:

1. Blend
2. Brew
3. Record
4. History
5. Manage

Japanese UI labels:

1. 配合
2. 抽出
3. 記録
4. 履歴
5. 管理

The bottom navigation should stay light. It should help users move between work phases, not expose every feature directly.

## Section Responsibilities

### Blend

Purpose:

Design the blend.

Includes:

- Blend name
- Bean selection
- Bean ratio sliders
- Roast level per blend bean
- Normalize to 100%
- Blend cost
- Flavor/profile preview

Does not include:

- Brew timer
- Full recipe history browsing
- Bean master editing unless intentionally opened from Manage

### Brew

Purpose:

Help the user brew the current blend.

Includes:

- Dose
- Brew ratio
- Target brew amount
- Brew method selection
- Pour schedule
- Future brew timer
- Future step-by-step brew support

Does not include:

- Bean master editing
- Long tasting notes
- Recipe version browsing

### Record

Purpose:

Capture the result of the experiment.

Includes:

- Tasting evaluation
- Improvement memo
- Change note
- Save recipe version
- Clear save confirmation

Does not include:

- Detailed master management
- Full archive management
- Public sharing controls

### History

Purpose:

Find, review, compare, and reuse previous experiments.

Includes:

- RecipeSeries list
- Version list
- Latest version loading
- Specific version loading
- Archive and restore
- Version deletion guard
- Future version comparison

Does not include:

- Primary blend editing controls
- Brew timer
- Master editing

### Manage

Purpose:

Keep supporting data organized without crowding the main workbench.

Includes:

- Bean master
- Brew method master
- Future account or app settings

Does not include:

- Main blend workflow
- Recipe version comparison
- Tasting workflow

## Card Model

Use function-level cards.

Recommended pattern:

- One card for one user intention
- Dense row UI inside cards
- Avoid turning every small item into a large card
- Avoid putting an entire screen into one heavy card

Examples:

- Blend screen: blend identity, bean ratios, profile preview, cost summary
- Brew screen: brew parameters, pour schedule, timer
- Record screen: sensory notes, improvement memo, save action
- History screen: series cards with compact version rows
- Manage screen: master list sections

## Mobile First Rules

- Primary actions should be reachable with one hand where practical.
- Bottom navigation should remain stable.
- The current work state should remain visible or easy to return to.
- Long forms should be split by work phase instead of stacked into one page.
- Buttons and inputs should avoid horizontal overflow.
- Sliders remain a core interaction for blend ratios.
- Normalize to 100% remains a core command.

## Desktop Behavior

Desktop may show more information at once, but it should not define the product structure.

Desktop layouts can use wider cards, side-by-side summaries, or persistent panels where helpful. The section responsibilities should remain the same as mobile.

## Product Identity

The UI should feel like a focused coffee blending workbench.

Distinctiveness should come from:

- Ratio adjustment
- Blend visualization
- Roast level context
- Brew support
- Tasting records
- Version comparison
- Experiment history

It should not rely on decorative complexity or dashboard-style density.

## Future UI Work

The next UI refactors should be evaluated against this order:

1. Make navigation lighter and mobile-first.
2. Split blend and brew responsibilities.
3. Create a dedicated record flow.
4. Improve history as a comparison and reuse surface.
5. Move master management behind Manage.
6. Add timer and brew guidance inside Brew.

## Pending UI Requests

These requests are candidates for the next UI iteration. They should be implemented in a way that keeps the workbench focused on:

Create -> Brew -> Record -> Review -> Refine

### Editor Reset

Goal:

- Add a way to reset the current unsaved editor input.

Current idea:

- Clicking the logo could start reset.

Recommended behavior:

- Do not reset immediately on logo click.
- Use a confirmation dialog if the logo starts reset.
- Prefer an explicit reset action if the UI can expose it without crowding the header.

Open questions:

- Should reset clear only the current blend/record inputs, or also reset selected brew method?
- Should reset keep the user on the current page, or return to Blend?

### Next Actions

Goal:

- Add a `次へ` action at the bottom-right of Blend.
- Add a `次へ` action at the bottom-right of Brew.

Expected navigation:

- Blend -> Brew
- Brew -> Record

Notes:

- This supplements bottom navigation rather than replacing it.
- On mobile, the button must not collide with the fixed bottom navigation.

### Record Save Placement

Goal:

- Move the Record page `保存` action to the bottom of the page.

Reason:

- Users should naturally review tasting notes and memo content before saving the version.

Notes:

- The save disabled message should stay close enough to the save button to be understood.
- The save action should remain visually clear and reachable.

### History Labels And Export Visibility

Requested changes:

- Change `Archived` to `アーカイブ`.
- Remove archive count display.
- Hide JSON and CSV export buttons for now.

Notes:

- Export behavior can stay in code for later use.
- Tests should reflect that JSON and CSV are not part of the current visible History UI.

## Future Brew Data

These fields are candidates for future RecipeVersion or BrewMethod data. They should be added only when they strengthen recording, comparison, or repeatability.

### Grind Size

Goal:

- Record grind size.

Possible options:

- 細挽き
- 中細挽き
- 中挽き
- 粗挽き

Open question:

- Should this be a fixed option set, free text, or both?

### Equipment

Goal:

- Record the brewing equipment or device.

Examples:

- ペーパードリップ
- フレンチプレス
- サイフォン

Open question:

- Should equipment be part of BrewMethod master data, or stored directly on each RecipeVersion?

### Brew Temperature

Goal:

- Record brew temperature.

Recommended initial shape:

- Celsius-only numeric value.
- Optional field.

Open question:

- Should brew temperature be shown only in Brew, or also summarized in History?

## Brew Stopwatch

Goal:

- Add a stopwatch under the Brew section.

Behavior:

- Start begins a 3 second countdown.
- Measurement starts after countdown.
- Reset returns the stopwatch to idle.
- Stopwatch automatically resets at 5 minutes.

Expected states:

- idle
- countdown
- running
- auto-reset

Controls:

- Start
- Reset

Notes:

- The stopwatch should not block recording or saving.
- Keep it simple before adding step-by-step brew guidance.

## Suggested UI Implementation Order

1. Clean up History labels and hide JSON/CSV.
2. Add `次へ` actions on Blend and Brew.
3. Move the Record save action to the bottom.
4. Add a safe reset action with confirmation.
5. Add the Brew stopwatch.
6. Add grind size, equipment, and brew temperature fields.

