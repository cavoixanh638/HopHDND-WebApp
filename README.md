# HopHDND WebApp

GitHub Pages deploys the built `index.html` from the repository root.

Project source is kept in `source/`; to build it locally, run `cd source && npm ci && npm run build:pages`, then copy the generated `source/dist-pages/index.html` to the root `index.html` and commit.

The imported source excludes dependency folders, private credentials, logs and generated bundles. This is a point-in-time import from the Google Drive project, not continuous synchronization.
