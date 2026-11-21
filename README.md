# Coin Quest Play

Five short mini-games for the Willow Coding Club (grades 7-9). Try each lesson's mechanic here, then build it yourself in GDevelop.
Live site: https://coinquest-play.danielpro.dev

## How to play
| | Keyboard | Phone / tablet |
|---|---|---|
| Move | Arrow keys or A / D | on-screen left / right buttons |
| Jump | Space, Up arrow or W (hold = higher) | JUMP button |
| Restart | R or the Restart button | Restart button, or tap the game when a level ends |
| Sound | M or the Sound button | Sound button |
| Theme | Light / Dark button (follows your device, remembers your choice) | same |

Keys only control the game while the game screen is selected. If you click Restart, Sound or a slider, those keep Space / Enter / arrows for themselves; click the game screen to play again.

## The levels
1. **Move & Jump** - reach the flag. Drag the sliders to change gravity and jump speed.
2. **Coins & Score** - collect every coin; Score is a variable.
3. **Enemies & Lives** - jump on slimes to stomp them; touching them costs a heart.
4. **Moving Platforms & Timer** - ride the planks before the clock runs out (falling costs 5 s).
5. **Menu, Sounds & Win** - Menu, Game and Win scenes, music and sound effects.

Next to every game, **What you are learning** shows the GDevelop events (condition + action) lighting up as you play, plus a short "Your turn in GDevelop" list.

## For teachers / developers
- Static site: open `index.html` or run `python3 -m http.server` and visit http://localhost:8000. No build step, no external assets.
- Tests: `npm test` (needs only Node): game logic and physics, keyboard handling, and the one-outcome rule for game over vs flag.
- Code map: `js/logic.js` (pure logic), `js/levels.js` (levels as text), `js/engine.js` (loop, input, sound, art), `js/world.js` (shared world), `js/game1..5.js` (rules per level), `js/ui.js` (theme toggle and the Controls card).
- Progress (stars) is stored only in the browser's localStorage. No accounts, no tracking.

---

# site-template — sites novos em *.danielpro.dev

Modelo para o Dots (Codex) criar e publicar um site estático novo sozinho.

## 3 passos do Daniel
1. **GitHub → New repository → Repository template: `danielcodemoz/site-template`**, escolhe um nome e deixa **Public**.
2. **Codex → Environments → Create environment** para esse repositório.
3. **Escreve a tarefa** no Codex (ex.: "Constrói o site de X e publica em x.danielpro.dev").

O Dots lê o `AGENTS.md`, põe o subdomínio em `danielpro-site.json`, abre o PR num ramo `codex/...`,
o workflow faz o merge e o servidor publica em poucos minutos com HTTPS.

Para desligar a criação automática no servidor: `systemctl disable --now novo-site-auto.timer`.
