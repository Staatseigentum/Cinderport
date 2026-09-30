# Cinderport 0.3.2 — Update detection fix

This release fixes another stale-cache case in Cinderport's own updater. An event for an older installer can no longer make a newer release appear ready to install. Cinderport now uses the downloaded installer's version to decide when the restart button should appear and keeps a newer download in progress.

Version 0.3.2 includes all launcher features from 0.3.0. The Windows installer is currently unsigned.
