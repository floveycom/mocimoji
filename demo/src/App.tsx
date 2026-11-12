import { useEffect, useRef, useState } from "react";
import { LivingAvatar, ALL_EXPRESSIONS, SCENARIO_NAMES, PALETTES } from "../../src/index";
import { ActivityPair } from "./ActivityPair";
import "./App.css";

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

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
          <LivingAvatar
            key={seed}
            ref={(el) => {
              if (el) avatarEls.current.set(seed, el);
              else avatarEls.current.delete(seed);
            }}
            seed={seed}
            lookAt={lookAt}
            className="avatar community-item"
          />
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

const HERO_SEEDS = ["nadia", "budi", "sari", "rafi", "tasya"];

// A real community for the closing section, right before the footer — no
// `expression` prop, so every one of these is fully alive: idle blinking,
// registered with the interaction coordinator, actually hugging/fighting/
// whispering with whoever's nearby. That liveliness is the point, so this
// stays a crowd, not the "hundreds" a purely decorative static wall could
// afford.
const COMMUNITY_SIZE = 55;
const COMMUNITY = Array.from({ length: COMMUNITY_SIZE }, (_, i) => `community-${i}`);

const FEATURES: Array<{ title: string; body: string }> = [
  {
    title: "37 expressions",
    body: "All 6 universal emotions, plus the ones people actually use in comments — smug, touched, tipsy, cheeky, and more.",
  },
  {
    title: "20+ ways to interact",
    body: "Avatars hug, fight, whisper, high-five, and dance with whoever's nearby — automatic, or triggered on demand.",
  },
  {
    title: "Reads the room",
    body: "A small local keyword/emoji lexicon picks a matching expression from text — no API key, no network call, no latency.",
  },
  {
    title: "Zero assets",
    body: "Every face is drawn procedurally from a hash of its seed. No image files, no avatar CDN, no backend to run.",
  },
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

function CopyInstall() {
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
    <button type="button" className="install-pill" onClick={copy}>
      <span className="install-prompt">$</span> {command}
      <span className="install-copy">{copied ? "copied" : "copy"}</span>
    </button>
  );
}

export default function App() {
  const [liveText, setLiveText] = useState("");
  const [liveColor, setLiveColor] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLiveColor((c) => c + 1), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <nav className="nav">
        <span className="nav-logo">mocimoji</span>
        <span className="nav-tag">MIT licensed</span>
      </nav>

      <header className="hero">
        <div className="hero-avatars">
          {HERO_SEEDS.map((seed) => (
            <LivingAvatar key={seed} seed={seed} className="avatar hero-avatar" />
          ))}
        </div>
        <h1>Avatars with a pulse.</h1>
        <p className="hero-sub">
          Generated from a seed — no images, no backend. It blinks, drifts through 37 expressions on
          its own, reacts to whatever you type, and occasionally hugs, fights, or whispers to the
          avatar next to it.
        </p>
        <div className="hero-cta">
          <CopyInstall />
          <a href="#try-it" className="hero-link">
            See it react ↓
          </a>
        </div>
      </header>

      <section className="features">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="section" id="try-it">
        <h2>Type something. Watch it react.</h2>
        <p className="section-sub">
          No AI call — just a local keyword/emoji lexicon matching your text to one of 37 expressions, instantly.
        </p>
        <div className="live-row">
          <LivingAvatar seed="you" text={liveText} paletteIndex={liveColor} className="avatar avatar-lg" />
          <input
            value={liveText}
            onChange={(e) => setLiveText(e.target.value)}
            placeholder="Type a comment… try 'this is hilarious 😂' or 'I love this so much ❤️'"
            className="live-input"
          />
        </div>
      </section>

      <section className="section">
        <h2>Drop it into a chat</h2>
        <p className="section-sub">One component, two props — the rest is automatic.</p>
        <pre className="code-block">
          <code>{`import { LivingAvatar } from "mocimoji";

<LivingAvatar seed={author} text={message} className="h-10 w-10" />`}</code>
        </pre>
        <p className="hint">
          Every member here is a different seed. Avatars near each other will occasionally bump, hug,
          or whisper on their own — more people in the room, more going on.
        </p>

        <div className="chat-window">
          <div className="chat-window-header">
            <div className="chat-window-avatars">
              {GROUP_MEMBERS.map((seed) => (
                <LivingAvatar key={seed} seed={seed} className="avatar chat-window-avatar" />
              ))}
            </div>
            <div>
              <div className="chat-window-title">mocimoji fans</div>
              <div className="chat-window-sub">{GROUP_MEMBERS.length + 1} members</div>
            </div>
          </div>
          <div className="chat-window-body">
            {SAMPLE_CHAT.map((m, i) => (
              <div className={`chat-row ${m.side}`} key={i}>
                <LivingAvatar seed={m.author} text={m.text} className="avatar avatar-md" />
                <div className="chat-bubble">
                  {m.side === "left" && <div className="chat-name">{m.author}</div>}
                  <div className="chat-text">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-window-input">
            <input disabled placeholder="Message mocimoji fans…" />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>They don't just sit there</h2>
        <p className="section-sub">
          Put two avatars near each other and they'll notice. {SCENARIO_NAMES.length} activities play
          automatically, or trigger one yourself — click a label to replay it.
        </p>
        <div className="shelf-display">
          {chunk(SCENARIO_NAMES, 5).map((row, i) => (
            <div className="shelf-row" key={i}>
              <div className="shelf-items">
                {row.map((name) => (
                  <ActivityPair key={name} name={name} />
                ))}
              </div>
              <div className="shelf-ledge" />
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{ALL_EXPRESSIONS.length} expressions, {PALETTES.length} colorways</h2>
        <p className="section-sub">Every face is generated, not drawn by hand — the whole catalog, every time.</p>
        <div className="expr-grid">
          {ALL_EXPRESSIONS.map((e) => (
            <div className="expr-cell" key={e}>
              <LivingAvatar seed={`expr-${e}`} expression={e} className="avatar avatar-md" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section community-section">
        <h2>A community of {COMMUNITY_SIZE}</h2>
        <p className="section-sub">
          Every one of these is fully alive — idle, blinking, reacting to whoever's standing next to
          it, and the nearby ones will even turn to look at your cursor.
        </p>
        <CommunityWall seeds={COMMUNITY} />
      </section>

      <footer className="footer">
        <CopyInstall />
        <a
          href="https://buymeacoffee.com/mocimoji"
          target="_blank"
          rel="noopener noreferrer"
          className="coffee-pill"
        >
          ☕ Buy me a coffee
        </a>
        <p>MIT licensed · built for comment threads, chat, and community products.</p>
      </footer>
    </div>
  );
}
