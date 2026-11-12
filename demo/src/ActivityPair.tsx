import { useEffect, useRef } from "react";
import { LivingAvatar, triggerActivity } from "../../src/index";

const LABELS: Record<string, string> = {
  fight: "fight",
  hug: "hug",
  highFive: "high five",
  handshake: "handshake",
  danceTogether: "dance together",
  staringContest: "staring contest",
  mimic: "mimic",
  chase: "chase",
  tugOfWar: "tug of war",
  piggyback: "piggyback",
  secretHandshake: "secret handshake",
  photoPose: "photo pose",
  armWrestle: "arm wrestle",
  jumpTogether: "jump together",
  slowClap: "slow clap",
  comfort: "comfort",
  huddle: "huddle",
  mirrorMove: "mirror move",
  pointAndLaugh: "point and laugh",
  bonk: "bonk",
};

export function ActivityPair({ name }: { name: string }) {
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);

  const play = () => {
    triggerActivity(name, aRef.current, bRef.current);
  };

  useEffect(() => {
    const t = setTimeout(play, 400 + Math.random() * 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button type="button" className="activity-card" onClick={play}>
      <div className="activity-pair">
        <div className="activity-face">
          <LivingAvatar ref={aRef} seed={`act-${name}-a`} className="avatar" />
        </div>
        <div className="activity-face">
          <LivingAvatar ref={bRef} seed={`act-${name}-b`} className="avatar" />
        </div>
      </div>
      <span className="activity-card-label">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 1l7 4-7 4z" fill="currentColor" />
        </svg>
        {LABELS[name] ?? name}
      </span>
    </button>
  );
}
