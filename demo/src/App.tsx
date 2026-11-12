import { useEffect, useRef, useState } from "react";
import { LivingAvatar, ALL_EXPRESSIONS, SCENARIO_NAMES, PALETTES, detectEmotion, type Expression } from "../../src/index";
import { ActivityPair, ACTIVITY_LABELS } from "./ActivityPair";
import "./App.css";

// How close the cursor needs to be (in px) to an avatar's center before
// that avatar turns to look at it. Avatars further away are untouched —
// "the nearby ones", not the whole crowd at once.
const LOOK_RADIUS = 110;

function CommunityWall({ seeds }: { seeds: string[] }) {
  const avatarEls = useRef(new Map<string, HTMLDivElement>());
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;
    const y = e.clientY;
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      setCursor({ x, y });
    });
  };

  const handleMouseLeave = () => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setCursor(null);
  };

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="community-wall" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {seeds.map((seed) => {
        let lookAt: { x: number; y: number } | null = null;
        if (cursor) {
          const el = avatarEls.current.get(seed);
          if (el) {
            const rect = el.getBoundingClientRect();
            const dist = Math.hypot(cursor.x - (rect.left + rect.width / 2), cursor.y - (rect.top + rect.height / 2));
            if (dist < LOOK_RADIUS) lookAt = cursor;
          }
        }
        return (
          <div className="community-item" key={seed}>
            <LivingAvatar
              ref={(el) => {
                if (el) avatarEls.current.set(seed, el);
                else avatarEls.current.delete(seed);
              }}
              seed={seed}
              lookAt={lookAt}
              className="avatar"
            />
          </div>
        );
      })}
    </div>
  );
}

type ChatSide = "left" | "right";

// A group chat, not a 1:1 — "you" is the only one on the right, everyone
// else gets their own name + avatar on the left, same as a real group app.
const GROUP_MEMBERS = ["nadia", "budi", "sari", "rafi", "tasya", "dimas"];

const SAMPLE_CHAT: Array<{ author: string; text: string; side: ChatSide }> = [
  { author: "nadia", text: "omg this is amazing!! ✨", side: "left" },
  { author: "budi", text: "lol this is hilarious 😂", side: "left" },
  { author: "you", text: "right?? I can't stop staring at it", side: "right" },
  { author: "sari", text: "I love this so much ❤️", side: "left" },
  { author: "rafi", text: "wow, I didn't expect it to be this good", side: "left" },
  { author: "you", text: "same, it reacts to literally everything", side: "right" },
  { author: "tasya", text: "thanks so much for making this 🙏", side: "left" },
  { author: "dimas", text: "aww it's so cute", side: "left" },
];

// A real community for the closing section — no `expression` prop, so
// every one of these is fully alive: idle, blinking, registered with the
// interaction coordinator, actually hugging/fighting/whispering.
const COMMUNITY_SIZE = 55;
const COMMUNITY = Array.from({ length: COMMUNITY_SIZE }, (_, i) => `community-${i}`);

const SUGGESTIONS = [
  "haha this is hilarious",
  "I love this so much",
  "ugh, so sad right now",
  "wow, didn't expect that",
  "so sleepy right now",
  "thanks for making this",
  "told you so",
  "this is so cool",
];

// The hero avatar forces through this list, one every 1.8s, each paired
// with a "now feeling X" status pill.
const HERO_CYCLE: Expression[] = ["happy", "wink", "surprised", "loving", "smug", "laugh", "sleepy", "starstruck", "cool", "angelic"];

// No forced `expression` here — left alone, each one blinks, drifts
// through its own expressions, and can hug/fight/whisper with its
// neighbors on its own, same as the community wall below.
const CTA_FACES: Array<{ seed: string; palette: number; anim: string }> = [
  { seed: "cta-a", palette: 2, anim: "bob" },
  { seed: "cta-b", palette: 1, anim: "bob2" },
  { seed: "cta-c", palette: 11, anim: "bob3" },
  { seed: "cta-d", palette: 5, anim: "bob" },
  { seed: "cta-e", palette: 8, anim: "bob2" },
];

function legacyCopy(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  return ok;
}

function CopyInstall({ onDark = false }: { onDark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const command = "npm install mocimoji";

  const copy = async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard API blocked (permission denied, insecure context, older
      // browser) — fall back to the legacy selection-based copy command.
      ok = legacyCopy(command);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button type="button" className={`install-pill mono${onDark ? " on-dark" : ""}`} onClick={copy}>
      <span>
        <span className="install-prompt">$</span> {command}
      </span>
      <span className="install-copy">{copied ? "COPIED" : "COPY"}</span>
    </button>
  );
}

export default function App() {
  const [liveText, setLiveText] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);
  // Whichever activity most recently started playing — set by either a
  // card's own auto-trigger on mount or a manual click. Stays put (no
  // auto-revert) until a different one takes over.
  const [activeActivity, setActiveActivity] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_CYCLE.length), 1800);
    return () => clearInterval(id);
  }, []);

  const detectedExpr = detectEmotion(liveText);

  return (
    <div className="landing-full">
      <nav className="nav">
        <a href="#top" className="nav-brand">
          <div style={{ width: 32, height: 32 }}>
            <LivingAvatar seed="mocimoji-logo" expression="happy" paletteIndex={5} className="avatar" />
          </div>
          <span className="disp nav-logo">mocimoji</span>
        </a>
        <div className="nav-links">
          <a href="#demo" className="nav-link">Demo</a>
          <a href="#interactions" className="nav-link">Interactions</a>
          <a href="#expressions" className="nav-link">Expressions</a>
          <a href="#usage" className="nav-link">Docs</a>
          <span className="nav-tag">MIT licensed</span>
        </div>
      </nav>

      <header id="top" className="hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-new">New</span>
            {ALL_EXPRESSIONS.length} expressions · {SCENARIO_NAMES.length}+ interactions · 0 assets
          </div>
          <h1 className="disp">
            Avatars with
            <br />a pulse.
          </h1>
          <p className="hero-sub">
            Generated from a seed — no images, no backend. Each one blinks, drifts through moods, reacts to
            whatever you type, and now and then hugs, fights or whispers to the avatar next to it.
          </p>
          <div className="hero-cta">
            <CopyInstall />
            <a href="#demo" className="hero-link">See it react ↓</a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="disp hero-stat-num">{ALL_EXPRESSIONS.length}</div>
              <div className="hero-stat-label">expressions</div>
            </div>
            <div>
              <div className="disp hero-stat-num">{SCENARIO_NAMES.length}+</div>
              <div className="hero-stat-label">interactions</div>
            </div>
            <div>
              <div className="disp hero-stat-num">{PALETTES.length}</div>
              <div className="hero-stat-label">colorways</div>
            </div>
            <div>
              <div className="disp hero-stat-num">0</div>
              <div className="hero-stat-label">image files</div>
            </div>
          </div>
        </div>

        <div className="hero-scene dots">
          <div className="hero-scene-main bob">
            <LivingAvatar seed="hero-main" expression={HERO_CYCLE[heroIdx]} paletteIndex={5} className="avatar" />
          </div>
          <div className="hero-scene-status">
            <span className="hero-scene-dot" />
            <span>
              now feeling <strong>{HERO_CYCLE[heroIdx]}</strong>
            </span>
          </div>

          <div className="hero-chat bob2">
            <div className="orbit-a">
              <LivingAvatar seed="hero-chat" expression="laugh" paletteIndex={1} className="avatar" />
            </div>
            <div className="hero-bubble">lol this is hilarious</div>
          </div>

          <div className="hero-highfive bob3">
            <div style={{ display: "flex", gap: 4 }}>
              <div className="orbit-b nudgeL">
                <LivingAvatar seed="hero-hf-a" expression="happy" paletteIndex={2} className="avatar" />
              </div>
              <div className="orbit-c nudgeR">
                <LivingAvatar seed="hero-hf-b" expression="wink" paletteIndex={7} className="avatar" />
              </div>
            </div>
            <span className="hero-pair-pill">high five!</span>
          </div>

          <div className="hero-seed bob">
            <div className="orbit-d">
              <LivingAvatar seed="budi" expression="sleepy" paletteIndex={12} className="avatar" />
            </div>
            <span className="hero-seed-label mono">seed: "budi"</span>
          </div>

          <div className="hero-thanks bob2">
            <div className="orbit-e">
              <LivingAvatar seed="hero-thanks" expression="angelic" paletteIndex={8} className="avatar" />
            </div>
            <span className="hero-pair-pill">thanks so much</span>
          </div>
        </div>
      </header>

      <section className="features">
        <div className="feature-card">
          <div className="disp feature-num">{ALL_EXPRESSIONS.length}</div>
          <div className="feature-title">Expressions</div>
          <p>All six universal emotions, plus the ones people actually use in comments — smug, touched, tipsy, cheeky and more.</p>
        </div>
        <div className="feature-card">
          <div className="disp feature-num">{SCENARIO_NAMES.length}+</div>
          <div className="feature-title">Ways to interact</div>
          <p>Avatars hug, fight, whisper, high-five and dance with whoever's nearby — automatically, or on demand.</p>
        </div>
        <div className="feature-card">
          <div className="disp feature-num">0 ms</div>
          <div className="feature-title">Reads the room</div>
          <p>A small local keyword and emoji lexicon picks the matching expression — no API key, no network call, no latency.</p>
        </div>
        <div className="feature-card is-dark">
          <div className="disp feature-num">0 kB</div>
          <div className="feature-title">Of assets</div>
          <p>Every face is drawn procedurally from a hash of its seed. No image files, no avatar CDN, no backend to run.</p>
        </div>
      </section>

      <section id="demo" className="demo-section">
        <div className="demo-wrap">
          <div className="demo-copy">
            <span className="eyebrow mono">01 — Live demo</span>
            <h2 className="disp section-title">
              Type something.
              <br />Watch it react.
            </h2>
            <p>No AI call — just a local keyword lexicon matching your text to one of {ALL_EXPRESSIONS.length} expressions, instantly. Try one of these:</p>
            <div className="chip-row">
              {SUGGESTIONS.map((s) => (
                <button type="button" className="chip" key={s} onClick={() => setLiveText(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="demo-card">
            <div className="demo-stage dots">
              <div className="bob" style={{ width: 180, height: 180 }}>
                <LivingAvatar seed="demo" text={liveText} paletteIndex={5} className="avatar" />
              </div>
              <div className="demo-tag left mono">expression: {detectedExpr ?? "neutral"}</div>
            </div>
            <label htmlFor="demo-input" className="demo-input">Your comment</label>
            <input
              id="demo-input"
              value={liveText}
              onChange={(e) => setLiveText(e.target.value)}
              placeholder={'Type a comment… try "lol this is hilarious" or "I love this so much"'}
              className="demo-field"
            />
          </div>
        </div>
      </section>

      <section id="usage" className="usage-section">
        <div className="usage-copy">
          <span className="eyebrow mono">02 — Drop it into a chat</span>
          <h2 className="disp section-title">
            One component.
            <br />Two props.
          </h2>
          <p>
            Pass a seed and the message — the rest is automatic. Every member gets a different face, and avatars
            near each other bump, hug or whisper on their own. More people in the room, more going on.
          </p>
          <div className="code-window">
            <div className="code-window-bar">
              <span className="code-window-dot" />
              <span className="code-window-dot" />
              <span className="code-window-dot" />
              <span className="mono code-window-name">Chat.tsx</span>
            </div>
            <pre className="mono">
              <span className="tok-kw">import</span> {"{ LivingAvatar }"} <span className="tok-kw">from</span>{" "}
              <span className="tok-str">"mocimoji"</span>;
              {"\n\n"}
              {"<"}
              <span className="tok-tag">LivingAvatar</span>
              {"\n  seed={author}\n  text={message}\n  className="}
              <span className="tok-str">"h-10 w-10"</span>
              {"\n/>"}
            </pre>
          </div>
          <div className="badge-row">
            <span className="badge-pill">React</span>
            <span className="badge-pill">Tailwind-friendly</span>
            <span className="badge-pill">SSR-safe</span>
            <span className="badge-pill">Respects reduced motion</span>
          </div>
        </div>

        <div className="chat-card">
          <div className="chat-card-header">
            <div className="chat-card-avatars">
              {GROUP_MEMBERS.map((seed) => (
                <div className="chat-card-avatar" key={seed}>
                  <LivingAvatar seed={seed} className="avatar" />
                </div>
              ))}
            </div>
            <div>
              <div className="chat-card-title">mocimoji fans</div>
              <div className="chat-card-sub">{GROUP_MEMBERS.length + 1} members</div>
            </div>
          </div>
          <div className="chat-card-body">
            {SAMPLE_CHAT.map((m, i) => (
              <div className={`chat-row ${m.side}`} key={i}>
                <div className="chat-row-avatar">
                  <LivingAvatar seed={m.author} text={m.text} className="avatar" />
                </div>
                <div className="chat-bubble">
                  {m.side === "left" && <div className="chat-name">{m.author}</div>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="chat-card-input">
            <div className="chat-card-input-field">Message mocimoji fans…</div>
            <button type="button" aria-label="Send message" className="chat-card-send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section id="interactions" className="interactions-section">
        <div className="interactions-wrap">
          <div className="interactions-head">
            <div className="interactions-head-copy">
              <span className="eyebrow on-dark mono">03 — Interactions</span>
              <h2 className="disp section-title">They don't just sit there.</h2>
              <p>
                Put two avatars near each other and they'll notice. {SCENARIO_NAMES.length} activities play
                automatically — or pick one to trigger it yourself.
              </p>
            </div>
            <div className="playing-pill">
              Playing: <strong>{activeActivity ? ACTIVITY_LABELS[activeActivity] ?? activeActivity : "—"}</strong>
            </div>
          </div>
          <div className="interactions-grid">
            {SCENARIO_NAMES.map((name) => (
              <ActivityPair key={name} name={name} active={activeActivity === name} onActivate={setActiveActivity} />
            ))}
          </div>
        </div>
      </section>

      <section id="expressions" className="expressions-section">
        <div className="expressions-head">
          <div className="expressions-head-copy">
            <span className="eyebrow mono">04 — The catalog</span>
            <h2 className="disp section-title">
              {ALL_EXPRESSIONS.length} expressions.
              <br />{PALETTES.length} colorways.
            </h2>
          </div>
          <p>Every face is generated, not drawn by hand — the whole catalog, every time. Scroll to explore →</p>
        </div>
        <div className="expr-gallery">
          <div className="expr-gallery-track">
            {ALL_EXPRESSIONS.map((e, i) => (
              <div className="expr-card" key={e}>
                <div className="expr-card-face">
                  <LivingAvatar seed={`expr-${e}`} expression={e} paletteIndex={i} className="avatar" />
                </div>
                <span className="mono expr-card-name">{e}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="community-section">
        <div className="community-card">
          <div className="community-card-copy">
            <h2 className="disp">A community of {COMMUNITY_SIZE}</h2>
            <p>Every one of these is fully alive — idle, blinking, reacting to whoever's standing next to it.</p>
          </div>
          <CommunityWall seeds={COMMUNITY} />
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-card">
          <div className="cta-faces">
            {CTA_FACES.map((f) => (
              <div className={`cta-face ${f.anim}`} key={f.seed}>
                <LivingAvatar seed={f.seed} paletteIndex={f.palette} className="avatar" />
              </div>
            ))}
          </div>
          <h2 className="disp">
            Give every user
            <br />a face that feels.
          </h2>
          <p>Built for comment threads, chat and community products. Free and open source.</p>
          <div className="cta-buttons">
            <CopyInstall onDark />
            <a href="https://buymeacoffee.com/mocimoji" target="_blank" rel="noopener noreferrer" className="coffee-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
                <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
                <path d="M8 3v2M12 3v2" />
              </svg>
              Buy me a coffee
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>
          <strong className="disp footer-brand">mocimoji</strong> · MIT licensed
        </span>
        <span>Built for comment threads, chat and community products.</span>
      </footer>
    </div>
  );
}
