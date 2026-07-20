# v0 Design Style Guide

## Purpose

This guide captures the visual direction for v0 implementation. All UI work should reference:

```text
D:\Projects\metronome\Design Notes\design_pictures\overall_style_design.png
```

The design should feel like a focused music practice workspace: calm, clear, light, and efficient.

## Overall Direction

The v0 app should follow the reference image's style:

- Light, warm-neutral app background.
- Soft card surfaces with subtle shadows.
- Rounded but restrained corners.
- Clear black primary text.
- Muted secondary text.
- Yellow as the main practice/action accent.
- Purple used sparingly for import/secondary accent.
- Small colored waveform accents for recordings.
- Spacious dashboard layout.
- Functional practice controls with strong visual hierarchy.

The UI should feel like a polished practice tool, not a marketing landing page.

## Layout Principles

- Desktop and iPad landscape use a left sidebar.
- Narrow mobile uses bottom navigation.
- Home is a practice dashboard.
- Sheet Practice keeps the sheet as the visual priority.
- Bottom practice controls stay reachable.
- Side panels are secondary and should not dominate the sheet.
- Do not nest cards inside cards.
- Do not use decorative gradient blobs or orbs.
- Preserve stable dimensions for controls so state changes do not shift layout.

## Visual Details

Use:

- Soft off-white backgrounds.
- White or lightly tinted surfaces.
- Thin dividers.
- 8px or smaller card radius unless a component pattern requires otherwise.
- Yellow circular primary play/action controls.
- Simple icon buttons for common actions.
- Subtle colored waveform previews.
- Compact typography inside panels.

Avoid:

- Dark app-wide themes for v0.
- One-note purple or blue gradient palettes.
- Oversized marketing hero sections.
- Decorative SVG illustrations.
- Heavy skeuomorphic music hardware styling.
- Text-heavy explanations inside the app UI.

## Component Expectations

- Use icon buttons for playback, settings, import, search, filter, more, and navigation actions where appropriate.
- Use tooltips for unfamiliar icon-only controls.
- Use segmented controls or select-like controls for mode/category choices.
- Use sliders or numeric controls for BPM and volume.
- Use toggles for binary settings.
- Use menus for option sets.
- Keep text inside controls from overflowing on mobile.

## Responsive Requirements

Every UI feature must be checked across:

- Desktop width.
- Tablet-like or iPad landscape width.
- Narrow mobile width.
- Browser resize transitions.

Visual verification should include checking:

- No overlapping controls.
- No clipped labels.
- Main action remains visible.
- Navigation remains usable.
- Panels or drawers do not block critical practice controls.

## Module-Specific Notes

### Home / App Shell

Match the reference dashboard style:

- Sidebar on wide screens.
- Practice summary and recent items.
- Quick Metronome and Continue Practice as primary cards.
- No fake populated history.

### Quick Metronome

Match the reference metronome panel:

- Large BPM number.
- Clear play/stop/record controls.
- Settings panel on the side where space allows.
- Yellow primary play control.

### Sheet Library

Match the reference list style:

- Search and filter controls.
- Simple rows with thumbnails.
- Category badges.
- Import action visible but not dominant.

### Sheet Practice

Match the reference practice workspace:

- Sheet centered and visually dominant.
- Bottom controls.
- Side reference/settings panel.
- Avoid crowding the score.

### Recordings

Match the reference recording list:

- Play button per row.
- Colored waveform preview.
- Search and filter controls.
- Clean metadata.

## Verification Requirements

Verification agents must compare implemented UI against this style guide and the reference image.

They must report FAIL if:

- The UI becomes a marketing page instead of a practice tool.
- Primary practice actions are visually unclear.
- Layout breaks during resize.
- Text overlaps or clips.
- The implementation ignores the reference style direction.
- Visual controls are display-only or inconsistent with module behavior.
