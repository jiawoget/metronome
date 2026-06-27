# Pack 8 Slice Backlog: Settings / Local Data

## Pack Goal

The app provides reliable local settings, device selection, storage visibility, and safe data management.

## Slice Backlog

### P8-01 `audio-device-adapter`
- Add browser audio device adapter and permission states.

### P8-02 `audio-device-settings-ui`
- Let the user select supported input/output devices.

### P8-03 `theme-preference-provider`
- Store and apply local theme preference.

### P8-04 `theme-settings-ui`
- Add compact theme controls and visual checks.

### P8-05 `notification-preference-adapter`
- Store local notification preferences and explicit permission requests.

### P8-06 `notification-settings-ui`
- Add toggles and permission/error states.

### P8-07 `data-export-service`
- Export local metadata and supported artifacts with integrity checks.

### P8-08 `data-import-validation`
- Validate backup files before writes.

### P8-09 `data-import-restore-ui`
- Add import/restore flow with clear errors.

### P8-10 `storage-usage-service`
- Compute storage usage by data type through services/adapters.

### P8-11 `storage-usage-ui`
- Show compact storage breakdown.

### P8-12 `selective-cleanup-rules`
- Define cleanup dependency and dangling-reference rules.

### P8-13 `selective-cleanup-ui`
- Add safe cleanup UI with confirmation/cancel paths.

## Scheduling Notes

Import/export and cleanup slices are data-integrity-sensitive and should use Tier E.

