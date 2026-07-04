# Music Domain Policy

F5 keeps reusable music primitives behind this folder. Time-signature parsing uses
`@tonaljs/time-signature`; duration fractions use `@tonaljs/duration-value`.

Product policy remains repo-owned here or in explicit product callers:
supported time signatures, supported subdivisions, BPM clamps, accent modes,
countdown options, settings, and preset behavior do not come from TonalJS.

Do not add note, chord, scale, key, interval, pitch, MIDI, rhythm, or duration
tables outside this folder without updating the Pack F architecture guardrails.
