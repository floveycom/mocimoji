import { useEffect, useRef } from "react";
import { LivingAvatar, triggerActivity } from "../../src/index";

export const ACTIVITY_LABELS: Record<string, string> = {
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

interface ActivityPairProps {
  name: string;
  active: boolean;
  onActivate: (name: string) => void;
}

export function ActivityPair({ name, active, onActivate }: ActivityPairProps) {
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);

  const play = () => {
    const started = triggerActivity(name, aRef.current, bRef.current);
    if (started) onActivate(name);
  };

  useEffect(() => {
    const t = setTimeout(play, 400 + Math.random() * 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button type="button" className={`activity-card${active ? " is-active" : ""}`} onClick={play} aria-pressed={active}>
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
        {ACTIVITY_LABELS[name] ?? name}
      </span>
    </button>
  );
}
