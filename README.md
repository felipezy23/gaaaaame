# Castelo do Deserto — Protótipo com Sentry

Este protótipo usa **exatamente a imagem original enviada como mapa visual** e a folha de sprites enviada para o vilão.

## Vilão
O Sentry fica posicionado próximo ao templo central e usa as 26 poses da folha de sprites.

Sequências:
- `idle`: 5 poses
- `attack`: 4 poses
- `attack2`: 4 poses
- `turn`: 5 poses
- `walk`: 5 poses
- `walk2`: 3 poses

As poses foram preservadas da folha original e são animadas no jogo.

## Controles
- WASD ou setas: andar
- Shift: correr
- E: interagir
- J: atacar

## Combate
Ao chegar perto do Sentry, ele percebe o jogador, persegue, alterna ataques e possui barra de vida.
O jogador pode atacá-lo quando estiver próximo.

## Próxima evolução
A etapa seguinte é fazer a colisão/altura seguir com precisão cada detalhe da imagem: ruas, escadas, pontes, bordas dos penhascos e entradas do templo/castelo. Depois podemos colocar o interior e a subida até o topo.
