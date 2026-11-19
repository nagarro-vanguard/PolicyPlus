# Mulish, self-hosted

Finch's typeface, served from ui's own files so no request leaves the origin: sessions have no egress, and a font CDN sees every visitor. The four variable fonts cover normal and italic, Latin and Latin Extended, every weight from 200 to 1000.

They come from the npm tarball of `@fontsource-variable/mulish` 5.3.0 (`files/`), whose SHA-1 matched the registry's `dist.shasum`, `e7465b62342d1b1ecd44f76ea48a7463bc3d9ee9`. They are pinned by SHA-256, like every binary npm doesn't install. To update: take the same four files from a newer tarball, record their checksums here, and keep `ofl.txt` beside them.

| File                                 | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `mulish-latin-wght-normal.woff2`     | `8d1d33d6beea5a722b8f336d79c61c07405949457e37b5e65454c72dc10aba1a` |
| `mulish-latin-wght-italic.woff2`     | `7380fb751bd9cbd89824588ddeb25a83395eb850e16eb24936c24c7de2ff4d2e` |
| `mulish-latin-ext-wght-normal.woff2` | `e1ccc8579a0437969464ba8bb1bb5e423306fa16746521d1f05040243b9a7a58` |
| `mulish-latin-ext-wght-italic.woff2` | `081c49fccb3da90bee5f39c9b97cc40c8d52e13291c0c78d573a6def6a8f5402` |

Mulish is licensed under the SIL Open Font License 1.1, whose text is `ofl.txt`.
