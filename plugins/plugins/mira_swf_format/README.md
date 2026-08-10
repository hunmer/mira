# Mira SWF Format

Adds SWF metadata detection, FFmpeg first-frame thumbnails, and Ruffle-based playback to Mira.

Thumbnail generation reuses the FFmpeg executable configured by Mira. Ruffle starts only for hover/detail previews, so thumbnail scans do not create browser instances.

## Development

```powershell
npm install
npm test
```
