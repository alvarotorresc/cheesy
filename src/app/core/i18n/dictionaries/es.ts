import type { Messages } from './en';

export const es: Messages = {
  app: {
    name: 'Chess Playground',
    skipToContent: 'Saltar al contenido',
    mainNavigation: 'Navegación principal',
    language: 'Idioma',
  },
  nav: {
    home: 'Inicio',
    openings: 'Aperturas',
    endgames: 'Finales',
    positions: 'Posiciones',
    analysis: 'Análisis',
  },
  home: {
    title: 'Practica ajedrez contra el ordenador',
    intro:
      'Juega aperturas, finales y posiciones tácticas en tu navegador. El tablero siempre se puede jugar: haz cualquier jugada legal y mira qué pasa.',
    openings: 'Juega una apertura y repasa sus líneas principales.',
    endgames: 'Gana los finales ganados y defiende los de tablas.',
    positions: 'Encuentra la mejor jugada en posiciones tácticas.',
    analysis: 'Monta un tablero libre y explora cualquier idea.',
  },
  placeholder: {
    comingSoon: 'Esta sección está en camino.',
  },
  analysis: {
    title: 'Tablero de análisis',
    whiteToMove: 'Juegan blancas',
    blackToMove: 'Juegan negras',
    check: 'Jaque',
    checkmateWhiteWins: 'Jaque mate. Ganan blancas.',
    checkmateBlackWins: 'Jaque mate. Ganan negras.',
    stalemate: 'Rey ahogado. Tablas.',
    insufficientMaterial: 'Material insuficiente. Tablas.',
    moves: 'Jugadas',
    noMoves: 'Todavía no hay jugadas.',
    controls: 'Controles del tablero',
    first: 'Primera jugada',
    previous: 'Jugada anterior',
    next: 'Jugada siguiente',
    last: 'Última jugada',
    undo: 'Deshacer',
    flip: 'Girar tablero',
    reset: 'Reiniciar',
  },
  board: {
    promotion: 'Elige la pieza de promoción',
    queen: 'Dama',
    rook: 'Torre',
    bishop: 'Alfil',
    knight: 'Caballo',
    cancel: 'Cancelar',
  },
};
