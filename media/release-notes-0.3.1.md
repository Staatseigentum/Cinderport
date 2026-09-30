# Cinderport 0.3.1 — Updater reliability fix

This small update fixes a case where the launcher could show an old version as already downloaded and then skip checks for newer releases. Cinderport now checks the actual downloaded installer version, ignores stale update events, and continues looking for a newer version when needed.

All library, download, theme, news, and settings features introduced in 0.3.0 remain available. The Windows installer is currently unsigned.
