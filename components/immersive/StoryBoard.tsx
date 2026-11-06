"use client";

import { CourseWorld } from "@/lib/immersive/course";
import { layoutStops } from "@/lib/storyBoardLayout";
import BoardStops from "./BoardStops";

/**
 * 2D story board: a light, accessible replacement for the old 3D scene.
 * Every place in the world is a large tappable "stop" joined by a dotted path.
 * Selecting a stop shows its story text underneath, so the world is read, not just looked at.
 */

type Look = { from: string; to: string; ground: string };
const LOOKS: Record<CourseWorld["theme"], Look> = {
  blank: { from: "#f4f7ee", to: "#e2eadb", ground: "#d9e3d0" },
  market: { from: "#35505a", to: "#223a42", ground: "#5d6b62" },
  bakery: { from: "#8a7080", to: "#5f4a5a", ground: "#7d6c64" },
  forest: { from: "#2f5a50", to: "#1f3f39", ground: "#4a6a4d" },
  ocean: { from: "#3f8ea0", to: "#2a6678", ground: "#6a9e98" },
  space: { from: "#1a1f4a", to: "#0e1130", ground: "#47446a" },
  city: { from: "#3a5961", to: "#263f46", ground: "#5d6a60" },
  castle: { from: "#5a4f75", to: "#3e3558", ground: "#625c6c" },
  library: { from: "#4a5c58", to: "#34433f", ground: "#665f54" },
  museum: { from: "#5a5f68", to: "#40444c", ground: "#716b62" },
  farm: { from: "#7da3a3", to: "#5a8486", ground: "#62794c" },
  school: { from: "#6890a8", to: "#4a6f86", ground: "#65725e" },
  desert: { from: "#bd8a7c", to: "#9a6a5a", ground: "#b58552" },
};

const THEME_ICON: Record<CourseWorld["theme"], string> = {
  blank: "✨", market: "🏮", bakery: "🥐", forest: "🌲", ocean: "🐚", space: "🪐", city: "🏙️",
  castle: "🏰", library: "📚", museum: "🏛️", farm: "🌻", school: "🏫", desert: "🏜️",
};

const DECOR: Record<CourseWorld["theme"], string[]> = {
  blank: ["✨", "🌿", "☁️"], market: ["🏮", "🥭", "🌙"], bakery: ["🥐", "🍞", "⭐"], forest: ["🌲", "🍄", "✨"],
  ocean: ["🐚", "🐠", "🫧"], space: ["⭐", "🪐", "🌙"], city: ["🏙️", "☁️", "🌳"], castle: ["🏰", "⭐", "🕊️"],
  library: ["📚", "🕯️", "✨"], museum: ["🏛️", "🖼️", "✨"], farm: ["🌻", "☁️", "🌾"], school: ["✏️", "☁️", "🍎"],
  desert: ["🌵", "☀️", "🐪"],
};

// Friendly picture for common story words; anything else falls back to the theme icon.
const WORD_ICONS: Array<[RegExp, string]> = [
  [/seed|sprout|plant/i, "🌱"], [/glow|light|lantern|lamp|shine|spark/i, "✨"], [/path|road|way|trail|bridge/i, "🛤️"],
  [/quiet|silent|sleep|hush/i, "🤫"], [/soft|leaf|feather|gentle/i, "🍃"], [/cloud|cover|rain/i, "☁️"],
  [/home|return|house|door/i, "🏠"], [/tree|forest|wood/i, "🌳"], [/river|water|sea|ocean|boat|wave/i, "🌊"],
  [/book|story|library|read/i, "📖"], [/star|moon|night|sky/i, "🌙"], [/sun|day|morning/i, "☀️"],
  [/flower|garden|orchid|bloom/i, "🌸"], [/ice|cream|sweet|flavou?r/i, "🍦"], [/castle|tower|palace|gate/i, "🏰"],
  [/map|clue|treasure|find/i, "🗺️"], [/shell|coral|fish/i, "🐚"], [/friend|share|help|together/i, "🤝"],
  [/fruit|mango|market|stall/i, "🥭"], [/farm|barn|field|sunflower/i, "🌻"], [/mushroom|firefly/i, "🍄"],
  [/bread|bake|oven|cake/i, "🍞"], [/school|class|word/i, "🏫"],
];

function iconFor(label: string, theme: CourseWorld["theme"]) {
  return WORD_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? THEME_ICON[theme];
}

function hash(text: string) {
  let n = 17;
  for (let i = 0; i < text.length; i += 1) n = (n * 31 + text.charCodeAt(i)) >>> 0;
  return n;
}

export default function StoryBoard({ course, selected, target, onSelect }: {
  course: CourseWorld; selected: string; target?: string; onSelect: (id: string) => void;
}) {
  const look = LOOKS[course.theme] || LOOKS.city;
  const order = course.objects.map((object, index) => {
    const taskIndex = course.tasks.findIndex(task => task.objectId === object.id);
    return { object, rank: taskIndex < 0 ? 100 + index : taskIndex };
  }).sort((a, b) => a.rank - b.rank).map(item => item.object);
  const layout = layoutStops(order.length);
  const spots = order.map((object, index) => ({ object, ...layout[index] }));
  const path = spots.map((spot, index) => `${index ? "L" : "M"}${spot.left.toFixed(1)} ${spot.top.toFixed(1)}`).join(" ");
  const seed = hash(`${course.title}${course.theme}`);
  const decor = DECOR[course.theme] || DECOR.city;
  const picked = course.objects.find(object => object.id === selected) || course.objects[0];

  return <div className="story-board" style={{ background: `linear-gradient(180deg, ${look.from} 0%, ${look.to} 62%, ${look.ground} 62%, ${look.ground} 100%)` }}>
    <div className="sb-decor" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ left: `${(seed * (i + 3) * 37) % 92 + 2}%`, top: `${(seed * (i + 5) * 17) % 26 + 4}%`, fontSize: `${18 + ((seed >> i) % 3) * 8}px` }}>{decor[i % decor.length]}</span>)}
    </div>
    <svg className="sb-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={path} /></svg>
    <BoardStops ids={spots.map(s=>s.object.id)} label="Places in this story">{(_,index) => {
        const {object}=spots[index];
        const isTarget = object.id === target;
        return <button className={`sb-stop ${selected === object.id ? "is-selected" : ""} ${isTarget ? "is-target" : ""}`} aria-pressed={selected === object.id} onClick={() => onSelect(object.id)} style={{ ["--stop" as string]: object.color }}>
            <span className="sb-icon">{object.kind === "mentor" ? <img src="/mascot.png" alt="" /> : iconFor(object.label, course.theme)}</span>
            <span className="sb-label">{object.label}</span>
            {isTarget && <small>Next stop</small>}
          </button>;
      }}</BoardStops>
    {picked && <div className="sb-bubble" role="status" aria-live="polite"><strong>{picked.label}</strong><p>{picked.dialogue}</p></div>}
  </div>;
}
