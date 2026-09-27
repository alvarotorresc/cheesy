export const en = {
  app: {
    name: 'Chess Playground',
    skipToContent: 'Skip to content',
    mainNavigation: 'Main navigation',
    language: 'Language',
  },
  nav: {
    home: 'Home',
    openings: 'Openings',
    endgames: 'Endgames',
    positions: 'Positions',
    analysis: 'Analysis',
  },
  home: {
    title: 'Practice chess against the computer',
    intro:
      'Play openings, endgames and tactical positions right in your browser. The board is always playable: make any legal move and see what happens.',
    openings: 'Play an opening and drill its main lines.',
    endgames: 'Convert winning endgames and hold the drawn ones.',
    positions: 'Find the best move in tactical positions.',
    analysis: 'Set up a free board and explore any idea.',
  },
  placeholder: {
    comingSoon: 'This section is on its way.',
  },
  analysis: {
    title: 'Analysis board',
    whiteToMove: 'White to move',
    blackToMove: 'Black to move',
    check: 'Check',
    checkmateWhiteWins: 'Checkmate. White wins.',
    checkmateBlackWins: 'Checkmate. Black wins.',
    stalemate: 'Stalemate. Draw.',
    insufficientMaterial: 'Insufficient material. Draw.',
    moves: 'Moves',
    noMoves: 'No moves yet.',
    controls: 'Board controls',
    first: 'First move',
    previous: 'Previous move',
    next: 'Next move',
    last: 'Last move',
    undo: 'Undo',
    flip: 'Flip board',
    reset: 'Reset',
  },
  board: {
    promotion: 'Choose promotion piece',
    queen: 'Queen',
    rook: 'Rook',
    bishop: 'Bishop',
    knight: 'Knight',
    cancel: 'Cancel',
  },
};

export type Messages = typeof en;
