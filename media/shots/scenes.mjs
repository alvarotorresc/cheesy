// ===== Scenes of media/shots =====
//
// One entry per screenshot. The runner writes media/out/<file>-<lang>.png for each language.
//
//   file        name of the PNG, without language or extension
//   path        route of the app (the same in both languages)
//   theme       'light' | 'dark'
//   mobile      true for the 360x780 viewport at 3x (PNG of 1080x2340)
//   storage     extra localStorage entries, with their full keys
//   progress    saved progress to seed before the app starts
//   prep        (page, lang) => leaves the page in the state to photograph, before settle()
//   after       (page, lang) => last touches after settle() (a hover, a focus)
//   keepScroll  true to keep the scroll position that prep left

export const SCENES = [];
