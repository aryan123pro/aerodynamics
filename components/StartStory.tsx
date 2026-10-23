"use client";
import { Play } from "lucide-react";
import { useShell } from "./Shell";

export default function StartStory() {
  const { startStory } = useShell();
  return <button className="btn primary" onClick={startStory}><Play size={15} /> Start the story <span className="kbd" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>S</span></button>;
}
