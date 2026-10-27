// Screen manifest — the single list of artboards. The gallery (index.html) and the `uis` CLI read it.
// One group per flow. Codes are <group letter><number> and match screens/<CODE>.html.
// device: phone (402×874) · tablet (834×1194) · desktop (1280×832) or any key in `devices`.
window.UIS = {
  name: "PlantPal",
  lang: "en",
  groups: [
    { id: "A", title: "Onboarding", device: "phone", screens: [
      ["A1", "Welcome"],
      ["A2", "Sign in with a code"],
    ] },
    { id: "B", title: "Daily care loop", device: "phone", screens: [
      ["B1", "Today"],
      ["B2", "Plant detail"],
      ["B3", "Log watering (sheet)"],
      ["B4", "Today — no plants yet"],
    ] },
    { id: "C", title: "Admin web", device: "desktop", screens: [
      ["C1", "Overview"],
    ] },
  ],
};
