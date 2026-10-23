export interface PageInfo { id: string; href: string; k: string; title: string; sub: string }
export type Cell = "lobby" | "owl" | "fish" | "shark" | "sum";

export const CHAPTERS: PageInfo[] = [
  { id: "ch1", href: "/owl", k: "I", title: "The silent owl", sub: "How the feathers of a hunting owl taught jet engines to roar less" },
  { id: "ch2", href: "/boxfish", k: "II", title: "The box that swims", sub: "A boxy reef fish, a wind tunnel and the Mercedes-Benz Bionic Car" },
  { id: "ch3", href: "/shark", k: "III", title: "Skin like teeth", sub: "Shark denticles calm the flow along a hull and quieten a sonar" },
  { id: "ch4", href: "/summary", k: "IV", title: "No free lunch", sub: "What the three have in common, and what comes next" },
];

export const LABS: PageInfo[] = [
  { id: "nozzle", href: "/nozzle-lab", k: "L1", title: "Nozzle Lab", sub: "Cut your own chevrons, run the engine, and listen from the ground" },
  { id: "tunnel", href: "/wind-tunnel", k: "L2", title: "Wind Tunnel", sub: "Sculpt a car body in smoke and drive it 100 km" },
  { id: "tank", href: "/towing-tank", k: "L3", title: "Towing Tank", sub: "Design riblets for a hull and tune them to the speed" },
];

export const REFS: PageInfo[] = [
  { id: "ref", href: "/references#sources", k: "R", title: "Sources", sub: "Every number on this site, with its paper" },
  { id: "ref", href: "/references#slides", k: "R", title: "Presentation", sub: "The original slide deck" },
  { id: "ref", href: "/references#team", k: "R", title: "Team", sub: "C155 · C158 · C170" },
];

export const TRACKED = [...CHAPTERS, ...LABS];

/* Each chapter is a different test cell; the page accent follows it. */
export const CELLS: Record<string, Cell> = {
  "/": "lobby", "/owl": "owl", "/nozzle-lab": "owl", "/boxfish": "fish", "/wind-tunnel": "fish",
  "/shark": "shark", "/towing-tank": "shark", "/summary": "sum", "/references": "lobby",
};

/* The presentation, in order. Each stop is one model on screen. Step titles must match the
   <Step title> props in each chapter, because story navigation addresses steps by index. */
export interface StoryPage { href: string; k: string; title: string; steps: string[] }
export const STORY: StoryPage[] = [
  { href: "/owl", k: "I", title: "The silent owl", steps: ["The takeoff roar", "The silent wing", "Inside the jet", "Teeth on the nozzle", "Owl numbers"] },
  { href: "/boxfish", k: "II", title: "The box that swims", steps: ["Meet the boxfish", "Into the wind tunnel", "Fish into car", "The twist", "Car numbers"] },
  { href: "/shark", k: "III", title: "Skin like teeth", steps: ["Zoom into shark skin", "Riblets tame the wall", "Why ships are loud", "A quieter sonar", "Shark numbers"] },
  { href: "/summary", k: "IV", title: "No free lunch", steps: ["The trade-off space", "What comes next"] },
  { href: "/nozzle-lab", k: "L1", title: "Nozzle Lab", steps: ["Nozzle Lab"] },
  { href: "/wind-tunnel", k: "L2", title: "Wind Tunnel", steps: ["Wind Tunnel"] },
  { href: "/towing-tank", k: "L3", title: "Towing Tank", steps: ["Towing Tank"] },
  { href: "/references", k: "R", title: "Meet the team", steps: ["Meet the team"] },
];
export const STORY_MINUTES = 20;

export function store<T>(key: string, val?: T): T | null {
  try {
    if (val === undefined) { const raw = localStorage.getItem("silentwake." + key); return raw ? (JSON.parse(raw) as T) : null; }
    localStorage.setItem("silentwake." + key, JSON.stringify(val));
  } catch { /* storage blocked: the site works without it */ }
  return null;
}
