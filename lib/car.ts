/* The boxfish and the Bionic Car.

   Drag:   F = ½ ρ v² Cd A          (ρ = 1.2 kg/m³)
   Rolling resistance: F = Crr m g  (Crr = 0.009)
   Fuel:   energy at the wheels over 100 km, divided by an engine efficiency, plus a fixed overhead for
           accelerating, idling and accessories. The two constants are fitted so the Bionic Car gives the
           deck's 4.3 L/100 km and a comparable compact car 5.4 L/100 km, at a steady 80 km/h equivalent.
   Cd anchors: boxfish model 0.06, 1:4 clay car 0.095, Bionic Car 0.19 (Mercedes-Benz, 2005);
           ordinary cars 0.25–0.35 (deck slide 25); a brick about 1.05.                                  */

export const RHO_AIR = 1.2, G = 9.81, CRR = 0.009, DIESEL_MJ_PER_L = 35.8;
const ETA = 0.2235, OVERHEAD_L = 1.46, V_EQ = 80 / 3.6;

export interface Vehicle { id: string; name: string; cd: number; area: number; mass: number; color: string; note: string }
export const VEHICLES: Vehicle[] = [
  { id: "fish", name: "Boxfish model", cd: 0.06, area: 2.2, mass: 1170, color: "#ffd84a", note: "An accurate boxfish model in the wind tunnel. No wheels, no road, no mirrors." },
  { id: "clay", name: "1:4 clay car", cd: 0.095, area: 2.2, mass: 1170, color: "#d9a066", note: "The first car-shaped model of the fish, still without wheels." },
  { id: "bionic", name: "Bionic Car", cd: 0.19, area: 2.2, mass: 1170, color: "#9fe0a6", note: "The real 4.24 m concept, with wheels, mirrors and a road underneath." },
  { id: "normal", name: "Normal compact", cd: 0.3, area: 2.25, mass: 1300, color: "#9aa0b4", note: "A typical compact car of 2005 (Cd 0.25–0.35)." },
  { id: "brick", name: "A brick", cd: 1.05, area: 2.2, mass: 1300, color: "#d4644a", note: "A box with sharp edges: the air cannot follow it round." },
];
export const vehicle = (id: string) => VEHICLES.find((v) => v.id === id) || VEHICLES[2];

export const dragN = (cd: number, area: number, v: number) => 0.5 * RHO_AIR * v * v * cd * area;
export const rollN = (mass: number) => CRR * mass * G;

/** Diesel use, L per 100 km, at a cycle-equivalent steady speed. */
export function fuelL100(cd: number, area: number, mass: number, v = V_EQ) {
  const f = dragN(cd, area, v) + rollN(mass);
  return (f * 1e5) / 1e6 / (ETA * DIESEL_MJ_PER_L) + OVERHEAD_L;
}
/** Electric range on a 60 kWh pack, km: 85% drivetrain, 1.5 kWh/100 km for heating and electronics. */
export function evRangeKm(cd: number, area: number, mass: number, v = V_EQ, kwh = 60) {
  const f = dragN(cd, area, v) + rollN(mass);
  const kwhPer100 = (f * 1e5) / 3.6e6 / 0.85 + 1.5;
  return (kwh / kwhPer100) * 100;
}

/* ---- the sculptable body used by the Wind Tunnel ----
   Each slider is a feature engineers actually change. The drag build-up below is a teaching model,
   calibrated so the presets land on the anchors above. */
export interface Body { nose: number; roof: number; tail: number; wheels: number; ride: number; keel: number }
export const PRESETS: Record<string, { name: string; body: Body }> = {
  fish: { name: "Boxfish", body: { nose: 0.95, roof: 0.75, tail: 0.95, wheels: 0, ride: 1, keel: 1 } },
  bionic: { name: "Bionic Car", body: { nose: 0.85, roof: 0.75, tail: 0.75, wheels: 0.55, ride: 0.3, keel: 0.8 } },
  normal: { name: "Normal compact", body: { nose: 0.7, roof: 0.5, tail: 0.45, wheels: 0.7, ride: 0.35, keel: 0 } },
  brick: { name: "Brick", body: { nose: 0, roof: 0, tail: 0, wheels: 0, ride: 1, keel: 0 } },
};

/** Drag coefficient of a sculpted body, split into where the drag comes from. */
export function bodyCd(b: Body) {
  const friction = 0.04;
  const fore = 0.62 * Math.pow(1 - b.nose, 2.2);              // a sharp front edge: flow separates at once
  const roof = 0.03 * (1 - b.roof);                             // a bluff windscreen and roof
  const base = 0.28 * Math.pow(1 - b.tail, 1.8) + 0.02;          // the wake behind a square-cut tail
  const keel = -0.012 * b.keel;                                  // the boxfish's keels keep the side flow attached
  const wheels = 0.13 * b.wheels;                                // open wheels and wheel arches
  const ground = 0.045 * (1 - b.ride) * (b.wheels > 0 ? 1 : 0.4); // a road underneath, a rough underbody
  const cd = friction + fore + roof + base + keel + wheels + ground;
  return { cd: Math.max(0.05, cd), parts: { friction, fore, roof, base: base + keel, wheels, ground } };
}

/** Wind and buffeting noise heard in the tunnel, dB (illustrative): dipole scaling U^6, more for a bigger wake. */
export function windNoise(v: number, cd: number) {
  return 78 + 60 * Math.log10(Math.max(1, v) / 30) + 10 * Math.log10(0.4 + cd);
}

/* ---- the twist: yaw stability ----
   Van Wassenbergh et al. (2015) measured the moments on a boxfish in a flow tank: when it turns, the flow
   pushes it to turn further (destabilising). That is why it can spin on the spot in a reef. A dart with a
   tail fin feels the opposite (restoring). Cars are mildly destabilising too; tyres hold them straight. */
export const YAW = {
  fish: { name: "Boxfish", k: 0.9, note: "The flow turns it further: built to manoeuvre" },
  dart: { name: "Dart with tail fin", k: -1, note: "The flow turns it back: a weathervane" },
  car: { name: "Bionic Car", k: 0.35, note: "Mildly destabilising; the tyres keep it straight" },
};
export const yawMoment = (k: number, betaDeg: number) => k * Math.sin((2 * betaDeg * Math.PI) / 180);
