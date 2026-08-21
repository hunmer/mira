# Findings

- The existing ScreenshotDialog captures the current Electron window, allows rectangular cropping, saves to Pictures/Mira Screenshots, optionally copies to clipboard, and emits a File for FileUploadDialog.
- The current implementation has no annotation model. Native Canvas can provide deterministic export without adding dependencies.
- Use image-local CSS coordinates for selection and commands. Preview draws at scale 1; export scales commands to source pixels and translates by the crop origin.
- Model pen/mosaic as point paths, text as a positioned command, and arrow/rectangle/ellipse as start/end commands. A command stack plus redo stack provides undo/redo.
