# One-time Driftbound base upload

Upload all `Pokemon_Driftbound_v86.zip.part-*` files into this folder.

The GitHub Pages workflow concatenates the parts, extracts the complete v86 game into the Pages artifact, then overlays anything placed in `/updates/`.

After this one-time base upload, normal code updates can be pushed into `/updates/` without re-uploading the full game archive.
