import { compactMove } from './compact-move';

describe('compactMove', () => {
  it('should draw the piece of the side to move and write × for a capture', () => {
    expect(compactMove('Nxf7+', 'white')).toEqual([
      { kind: 'piece', code: 'wN' },
      { kind: 'text', text: '×f7+' },
    ]);
    expect(compactMove('Qh4', 'black')).toEqual([
      { kind: 'piece', code: 'bQ' },
      { kind: 'text', text: 'h4' },
    ]);
  });

  it('should keep the disambiguation next to the icon', () => {
    expect(compactMove('Rad1', 'white')).toEqual([
      { kind: 'piece', code: 'wR' },
      { kind: 'text', text: 'ad1' },
    ]);
  });

  it('should write pawn moves without an icon', () => {
    expect(compactMove('e4', 'white')).toEqual([{ kind: 'text', text: 'e4' }]);
    expect(compactMove('exd5', 'black')).toEqual([{ kind: 'text', text: 'e×d5' }]);
  });

  it('should draw the new piece of a promotion', () => {
    expect(compactMove('e8=Q+', 'white')).toEqual([
      { kind: 'text', text: 'e8=' },
      { kind: 'piece', code: 'wQ' },
      { kind: 'text', text: '+' },
    ]);
    expect(compactMove('bxa1=N', 'black')).toEqual([
      { kind: 'text', text: 'b×a1=' },
      { kind: 'piece', code: 'bN' },
    ]);
  });

  it('should leave castling, annotations and unknown text as written', () => {
    expect(compactMove('O-O-O+', 'black')).toEqual([{ kind: 'text', text: 'O-O-O+' }]);
    expect(compactMove('Nf3!?', 'white')).toEqual([
      { kind: 'piece', code: 'wN' },
      { kind: 'text', text: 'f3!?' },
    ]);
    expect(compactMove('--', 'white')).toEqual([{ kind: 'text', text: '--' }]);
  });
});
