# mocimoji

Living, emotion-aware generative avatars for comments, chat, and community UIs.

Each avatar is generated deterministically from a `seed` string (no images, no
backend) — the same seed always renders the same face and color palette. Left
alone, avatars blink and drift through 37 expressions on their own, occasionally
bump into (or hug, fight, dance with, whisper to...) each other if they're
near one another on the page, and react to whatever text you pass them (a chat
message, a comment) by picking a matching expression from a local
English/Indonesian keyword+emoji lexicon — no API key, no network call, no LLM
cost.

## Install

```bash
npm install mocimoji
```

`react` and `react-dom` (>=18) are peer dependencies.

## Usage

```tsx
import { LivingAvatar } from "mocimoji";

function Comment({ author, message }: { author: string; message: string }) {
  return (
    <div className="flex items-center gap-2">
      <LivingAvatar seed={author} text={message} className="h-10 w-10" />
      <span>{message}</span>
    </div>
  );
}
```

Render several `LivingAvatar`s near each other (a comment list, a chat feed)
and they'll occasionally interact on their own — no extra wiring needed, they
coordinate through the module automatically. Click/tap an avatar to nudge one
yourself.

## What it can do

- **37 expressions** — the 6 Ekman basics (happy, sad, angry, surprised,
  disgusted, scared) plus social/meme ones apps actually need: loving, shy,
  starstruck, sleepy, confused, bored, smug, worried, dizzy, angelic,
  devilish, moneyEyes, zany, cool, nerdy, thinking, yawning, wink, excited,
  embarrassed, relieved, touched, proud, skeptical, tipsy, cheeky, and more.
  See `ALL_EXPRESSIONS`.
- **Local text → emotion matching** — `detectEmotion()` runs a small
  English/Indonesian keyword+emoji lexicon synchronously in the browser.
  Gaze direction is coupled to the matched expression (a "thinking" face
  actually looks up and away; "smug" glances aside), not forced to stare
  straight ahead.
- **20 two-avatar activities** — fight, hug, highFive, handshake,
  danceTogether, staringContest, mimic, chase, tugOfWar, piggyback,
  secretHandshake, photoPose, armWrestle, jumpTogether, slowClap, comfort,
  huddle, mirrorMove, pointAndLaugh, bonk — plus a bespoke `whisper`
  interaction with its own speech-bubble. See `SCENARIO_NAMES`. These play
  automatically between nearby avatars, or on demand via `triggerActivity()`.
- **Physics-flavored micro-interactions** — a small manual gravity sim
  (headbutt / fall-onto / roll-and-peek) runs alongside the step-based
  activity system above; every animation is time-bounded by construction, so
  nothing can drift or get stuck.

## API

### `<LivingAvatar seed text expression className faceStyle ref />`

| Prop         | Type                       | Required | Notes                                                                                  |
| ------------ | -------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `seed`       | `string`                   | yes      | Identity — same seed, same face & palette.                                              |
| `text`       | `string`                   | no       | Latest message; drives the emotion-matching reaction.                                   |
| `expression` | `Expression`                | no       | Force a specific expression and suspend idle/text reactions. Good for a picker/showcase. |
| `className`  | `string`                   | no       | Sizing/layout — the avatar fills its container (e.g. `h-10 w-10`).                      |
| `faceStyle`  | `"flat-pill" \| "cartoon"` | no       | Eye rendering style. Defaults to `"flat-pill"`.                                         |

`LivingAvatar` forwards its ref to the underlying wrapper `<div>`, so you can
grab a DOM reference for `triggerActivity()`.

### `detectEmotion(text: string): Expression | null`

The same local lexicon the component uses internally, exported standalone in
case you want to drive the expression yourself (e.g. from a server-rendered
chat log) instead of passing `text`.

### `triggerActivity(name: string, elA: HTMLElement | null, elB: HTMLElement | null): boolean`

Directly plays a named activity (any key from `SCENARIO_NAMES`, or
`"whisper"`) between two specific `LivingAvatar` instances — useful for an
explicit "react with a hug" button, or a showcase that demonstrates one
activity at a time, rather than waiting for proximity-based auto-play.
Returns `false` if either element isn't a registered avatar or either one is
already mid-animation.

```tsx
const a = useRef<HTMLDivElement>(null);
const b = useRef<HTMLDivElement>(null);

<LivingAvatar ref={a} seed="nadia" />
<LivingAvatar ref={b} seed="budi" />
<button onClick={() => triggerActivity("hug", a.current, b.current)}>Hug</button>
```

### Other exports

- `ALL_EXPRESSIONS: Expression[]` — every expression the face can render
  (`"blink"` included), handy for a picker/showcase UI.
- `SCENARIO_NAMES: string[]` — the 20 two-avatar activity names.
- `PALETTES`, `hashSeed` — the generative color system, if you want to reuse
  it elsewhere (e.g. to color-match a username badge to its avatar).

## Development

```bash
npm install        # install library deps
npm run build       # bundle to dist/ (ESM + CJS + .d.ts) via tsup
npm test            # run the Vitest suite (logic-level: emotion matching,
                     # hash/palette determinism, activity safety bounds,
                     # expression-list consistency)

cd demo
npm install
npm run dev          # live demo at http://localhost:5173, imports straight
                     # from ../src so it reflects source changes immediately
```

## What's not here yet

This is a v0.1 core: the generative face + idle animation + physics
interactions + local emotion matching. It is **not** a browser extension and
does not inject into Instagram/Twitter/TikTok — those platforms have no
plugin surface for this. It's meant to be installed by developers into their
own apps (chat, comments, community products), the same way you'd install
any other UI library.

## License

MIT
