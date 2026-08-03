# Future Home UI Structure

This document records the ideal long-term UI direction inspired by `site-image.png`.

It is not the immediate v1.0 implementation target. The current v1.0 navigation remains focused on the experiment workflow:

Create -> Brew -> Record -> Review -> Refine

The future structure described here should be considered after the core workflow, release stability, and version comparison experience are reliable.

## Design Intent

The ideal UI is an app-like home experience rather than a single workbench screen.

Its purpose is to help users return to their coffee exploration with context:

- Continue recent experiments
- Review recent blend records
- Discover blend ideas or testing themes
- Enter the recording flow quickly
- Access beans, brew methods, settings, and account information without crowding the main workflow

This direction should preserve the product promise:

Coffee Blend Lab helps users discover their preferred coffee through visible, comparable, and shareable experimentation.

## Target Top-Level Structure

The future top-level navigation may use these primary sections:

1. Home
2. Record
3. Library
4. Discover
5. My Page

Japanese labels:

1. ホーム
2. 記録する
3. ライブラリ
4. 見つける
5. マイページ

This is a broader information architecture than the current v1.0 phase navigation.

Do not switch to this structure until each section has enough real product surface to justify it.

## Home

Purpose:

Give users a high-context entry point into their ongoing blending work.

Expected content:

- Featured or recommended blend idea
- Recent blend records
- Continue experiment action
- Shortcuts to the latest active series
- Optional product announcements or prompts

Home should not become a generic marketing page. It should answer:

- What was I working on?
- What changed recently?
- What should I try next?

## Record

Purpose:

Enter the active experiment workflow.

This section may contain an internal step flow based on the current v1.0 structure:

1. 配合
2. 抽出
3. 記録

The current `Blend`, `Brew`, and `Record` screens should eventually become steps inside this section rather than all being top-level destinations.

## Library

Purpose:

Organize reusable and historical material.

Expected content:

- Recipe history
- Bean library
- Brew method library
- Saved blend versions
- Archived series

This section should support comparison and reuse, not merely storage.

## Discover

Purpose:

Expose ideas that help users decide what to test next.

Possible future content:

- Shared experiments
- Public blend histories
- Testing themes
- Brewing technique articles
- Community or curated blend examples

This section depends on sharing and discovery features. It should not be introduced as an empty shell.

## My Page

Purpose:

Collect account-level and personal context.

Expected content:

- Profile
- Settings
- Statistics
- Preferences
- Privacy and account controls

## Visual Direction

The ideal visual direction from `site-image.png` includes:

- A light app shell with a strong centered brand header
- Clear icon-based top utilities such as notifications and account
- Rounded content cards with restrained borders
- A large visual feature area near the top of Home
- Recent blend cards with real coffee imagery
- Topic or discovery cards for future community and learning surfaces
- A persistent bottom navigation on mobile

Use this visual direction as inspiration, not as a literal requirement.

Coffee Blend Lab should still feel like a practical blending notebook. Visual richness should support experimentation and comparison.

## Current v1.0 Bridge

Until the future Home structure is justified, keep the current top-level workflow navigation:

1. 配合
2. 抽出
3. 記録
4. 履歴
5. 管理

This current structure is better for v1.0 because it directly supports:

- Creating a blend
- Brewing it
- Recording the result
- Reviewing previous versions
- Managing beans and brew methods

The future structure should be treated as a later product evolution, not as a reason to delay release readiness.

## Migration Path

A practical transition path:

1. Stabilize the current five-phase workflow navigation.
2. Improve History with version comparison and continue-experiment actions.
3. Add recent experiments as a lightweight Home-like panel or section.
4. Introduce a real Home screen once recent experiments, featured prompts, and shortcuts have enough value.
5. Move 配合, 抽出, and 記録 under 記録する as an internal flow.
6. Reorganize 履歴, 豆マスタ, and 淹れ方マスタ under ライブラリ where appropriate.
7. Add 見つける only when sharing or curated discovery exists.

## Decision Rule

Adopt the future home structure only when it strengthens the exploration cycle:

Create -> Taste -> Record -> Compare -> Refine

Do not adopt it merely because it looks more complete or app-like.
