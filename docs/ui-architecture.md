# Coffee Blend Lab UI Architecture

## Purpose

The UI should support a mobile-first blending workbench.

Coffee Blend Lab is not a dashboard of stored recipes. It is a place where a user can quickly adjust a blend, brew it, record what happened, and decide what to try next.

The interface should make the experiment cycle easy:

Create -> Brew -> Record -> Review -> Refine

## Primary Navigation

Use a bottom navigation model for the primary mobile experience.

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

