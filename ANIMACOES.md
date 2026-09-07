# Animações do Sentry

A sprite sheet original foi separada em **26 imagens individuais** dentro de `sentry_frames/`.

- `frame_00` a `frame_04`: guarda/espera
- `frame_05` a `frame_08`: ataque 1
- `frame_09` a `frame_12`: ataque 2
- `frame_13` a `frame_17`: mudança de postura
- `frame_18` a `frame_25`: caminhada

O `main.js` carrega cada PNG individual e desenha somente **um frame por vez**. Isso evita que todas as poses apareçam juntas.
