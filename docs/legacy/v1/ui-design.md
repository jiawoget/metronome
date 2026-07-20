# v1 UI Design Direction

## Purpose

v1 UI work must extend the existing reference direction from:

```text
Design Notes/design_pictures/overall_style_design.png
```

The app should continue to feel like a focused music practice workspace: light, calm, precise, and fast to operate. v1 adds more structured practice features, but the interface must not become visually crowded or tutorial-heavy.

## Global Visual Direction

- Use a warm off-white app background with white or lightly tinted surfaces.
- Keep primary text black and secondary metadata muted.
- Use yellow for primary practice actions such as play, active beat, selected measure, and current segment state.
- Use purple sparingly for secondary creation or import actions.
- Use small waveform color accents for recordings and comparisons.
- Keep cards and panels restrained with subtle shadows, thin dividers, and compact typography.
- Avoid marketing-style hero layouts, decorative illustrations, gradient orbs, heavy dark themes, and oversized explanatory text.

## Navigation And Layout

- Desktop and iPad landscape keep the left sidebar pattern from the reference image.
- Narrow mobile keeps bottom navigation.
- Home remains a dense practice dashboard, not a landing page.
- Quick Metronome keeps the large BPM center focus and side settings panel where space allows.
- Sheet Library keeps searchable rows with thumbnails, category/tag badges, and compact metadata.
- Recordings keeps a clean list with play buttons, metadata, waveform previews, and filters.

## Sheet Practice Layout

Sheet Practice is the most important v1 workspace and should follow this hierarchy:

1. Sheet image/PDF remains centered and visually dominant.
2. Bottom transport controls remain reachable and stable.
3. Right-side panel contains secondary context: reference, segment, loop, speed, marker, and take controls.
4. Segment and marker visuals should be subtle overlays or panel state, not heavy decoration.
5. Mobile should collapse secondary panels into drawers or tabs without hiding transport controls.

## Practice Segment UI

Practice Segment v1 should look like a natural extension of the Sheet Practice screen in the reference image.

Expected UI pieces:

- A compact segment selector near the sheet title or right-side practice panel.
- A measure range editor with numeric start/end measure controls.
- A small MeasureGrid calibration row showing BPM, time signature, and measure-one offset.
- A visible "Set measure 1 here" action near playback/scrub context.
- Segment state badges such as Active, Needs calibration, and Unsaved changes.
- A restrained measure timeline or tick strip may be used if it helps, but it must not compete with the sheet.
- Selected measure or segment accents should use yellow.
- Creation/edit actions may use the existing purple secondary action style.

The first v1 implementation should not require drawing detected bar lines on the PDF. If a later feature adds sheet overlays, they must be verified across zoom and resize.

## Review And Take Comparison UI

- Multi-take review should use compact rows or columns with real metadata and waveform previews.
- Best/latest/active state should be visible through small badges or icons, not large promotional cards.
- Waveform comparison should use consistent colors and stable row heights.
- Empty states must be honest and must not show fake practice history.

## Interaction Controls

- Use icon buttons for common actions where recognizable: play, pause, stop, record, import, search, filter, settings, edit, delete, more.
- Use tooltips for unfamiliar icon-only controls.
- Use segmented controls or tabs for view modes.
- Use toggles for binary settings.
- Use sliders or numeric steppers for BPM, volume, playback speed, and measure values.
- Keep all control dimensions stable so recording/playback state changes do not shift layout.

## Responsive Requirements

Every v1 UI contract must include checks for:

- Desktop width.
- Tablet-like or iPad landscape width.
- Narrow mobile width.
- Resize transitions.

Verification must fail if:

- Text clips or overlaps.
- Sheet Practice controls cover the sheet or transport.
- The segment panel dominates the sheet.
- Primary practice actions become unclear.
- The UI ignores the reference image's light workspace direction.

## Documentation Requirement

Every v1 feature contract with UI must include a `UI Design Requirements` section that references this file and the reference image.
