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
    <div className="shelf-item">
      <div className="activity-pair">
        <LivingAvatar ref={aRef} seed={`act-${name}-a`} className="avatar avatar-md" />
        <LivingAvatar ref={bRef} seed={`act-${name}-b`} className="avatar avatar-md" />
      </div>
      <button type="button" className="activity-replay" onClick={play}>
        ▶ {LABELS[name] ?? name}
      </button>
    </div>
  );
}
