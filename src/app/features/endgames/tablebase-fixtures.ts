import type { Chess } from 'chessops';
import { parsePosition } from '../../core/game';
import { parseTablebaseResponse, type TablebaseResult } from '../../core/tablebase';

/**
 * Answers of the Lichess tablebase recorded on 2026-09-29 for the positions of the practice
 * games simulated in `rival-move.spec.ts` (the player plays the first move Lichess lists, the
 * rival plays with and without the draw tie-break). One entry per FEN (the move number does not matter):
 * `category dtz dtm checkmate stalemate|uci category dtz dtm|...`, moves in the order Lichess
 * lists them and `-` for a distance it does not give. Nothing here touches the network.
 */
const ANSWERS: Record<string, string> = {
  '8/8/4k3/8/7P/8/6K1/8 b - - 0 1':
    'draw 0 0 0 0|e6d5 draw 0 0|e6e5 draw 0 0|e6f5 draw 0 0|e6d6 draw 0 0|e6f6 draw 0 0|e6d7 draw 0 0|e6e7 draw 0 0|e6f7 draw 0 0',
  '8/8/8/3k4/7P/8/6K1/8 w - - 1 2':
    'draw 0 0 0 0|h4h5 draw 0 0|g2f1 draw 0 0|g2g1 draw 0 0|g2h1 draw 0 0|g2f2 draw 0 0|g2h2 draw 0 0|g2f3 draw 0 0|g2g3 draw 0 0|g2h3 draw 0 0',
  '8/8/8/3k3P/8/8/6K1/8 b - - 0 2':
    'draw 0 0 0 0|d5e5 draw 0 0|d5e6 draw 0 0|d5c4 win 1 21|d5d4 win 1 21|d5e4 win 1 21|d5c5 win 1 21|d5c6 win 1 21|d5d6 win 1 21',
  '8/8/8/4k2P/8/8/6K1/8 w - - 1 3':
    'draw 0 0 0 0|h5h6 draw 0 0|g2f1 draw 0 0|g2g1 draw 0 0|g2h1 draw 0 0|g2f2 draw 0 0|g2h2 draw 0 0|g2f3 draw 0 0|g2g3 draw 0 0|g2h3 draw 0 0',
  '8/8/7P/4k3/8/8/6K1/8 b - - 0 3':
    'draw 0 0 0 0|e5f6 draw 0 0|e5d4 win 1 19|e5e4 win 1 19|e5f4 win 1 19|e5d5 win 1 19|e5f5 win 1 19|e5d6 win 1 19|e5e6 win 1 19',
  '8/8/5k1P/8/8/8/6K1/8 w - - 1 4':
    'draw 0 0 0 0|h6h7 draw 0 0|g2f1 draw 0 0|g2g1 draw 0 0|g2h1 draw 0 0|g2f2 draw 0 0|g2h2 draw 0 0|g2f3 draw 0 0|g2g3 draw 0 0|g2h3 draw 0 0',
  '8/7P/5k2/8/8/8/6K1/8 b - - 0 4':
    'draw 0 0 0 0|f6g7 draw 0 0|f6e5 win 1 17|f6e6 win 1 17|f6e7 win 1 17|f6f7 win 1 17|f6f5 win 1 15|f6g5 win 1 15|f6g6 win 1 15',
  '8/6kP/8/8/8/8/6K1/8 w - - 1 5':
    'draw 0 0 0 0|h7h8b draw 0 0|h7h8n draw 0 0|h7h8q draw 0 0|h7h8r draw 0 0|g2f1 draw 0 0|g2g1 draw 0 0|g2h1 draw 0 0|g2f2 draw 0 0|g2h2 draw 0 0|g2f3 draw 0 0|g2g3 draw 0 0|g2h3 draw 0 0',
  '8/6kP/8/8/8/8/8/5K2 b - - 2 5':
    'draw 0 0 0 0|g7h7 draw 0 0|g7h8 draw 0 0|g7f6 win 1 17|g7g6 win 1 17|g7f7 win 1 17|g7f8 win 1 17|g7h6 win 1 15',
  '8/8/8/6k1/1P6/8/8/7K b - - 0 1':
    'draw 0 0 0 0|g5f4 draw 0 0|g5f5 draw 0 0|g5f6 draw 0 0|g5g4 win 1 25|g5h4 win 1 25|g5h5 win 1 25|g5g6 win 1 25|g5h6 win 1 25',
  '8/8/8/8/1P3k2/8/8/7K w - - 1 2':
    'draw 0 0 0 0|b4b5 draw 0 0|h1g1 draw 0 0|h1g2 draw 0 0|h1h2 draw 0 0',
  '8/8/8/1P6/5k2/8/8/7K b - - 0 2':
    'draw 0 0 0 0|f4e5 draw 0 0|f4e3 win 1 23|f4f3 win 1 23|f4g3 win 1 23|f4e4 win 1 23|f4g4 win 1 23|f4f5 win 1 23|f4g5 win 1 23',
  '8/8/8/1P2k3/8/8/8/7K w - - 1 3':
    'draw 0 0 0 0|b5b6 draw 0 0|h1g1 draw 0 0|h1g2 draw 0 0|h1h2 draw 0 0',
  '8/8/1P6/4k3/8/8/8/7K b - - 0 3':
    'draw 0 0 0 0|e5d6 draw 0 0|e5d4 win 1 21|e5e4 win 1 21|e5f4 win 1 21|e5d5 win 1 21|e5f5 win 1 21|e5e6 win 1 21|e5f6 win 1 21',
  '8/8/1P1k4/8/8/8/8/7K w - - 1 4':
    'draw 0 0 0 0|b6b7 draw 0 0|h1g1 draw 0 0|h1g2 draw 0 0|h1h2 draw 0 0',
  '8/1P6/3k4/8/8/8/8/7K b - - 0 4':
    'draw 0 0 0 0|d6c7 draw 0 0|d6c5 win 1 19|d6d5 win 1 19|d6e5 win 1 19|d6c6 win 1 19|d6e6 win 1 19|d6d7 win 1 19|d6e7 win 1 19',
  '8/1Pk5/8/8/8/8/8/7K w - - 1 5':
    'draw 0 0 0 0|b7b8b draw 0 0|b7b8n draw 0 0|b7b8q draw 0 0|b7b8r draw 0 0|h1g1 draw 0 0|h1g2 draw 0 0|h1h2 draw 0 0',
  '8/1Pk5/8/8/8/8/8/6K1 b - - 2 5':
    'draw 0 0 0 0|c7b7 draw 0 0|c7b8 draw 0 0|c7b6 win 1 17|c7c6 win 1 17|c7d6 win 1 17|c7d7 win 1 17|c7d8 win 1 17',
  'R7/6k1/P4r2/8/8/8/8/6K1 b - - 0 1':
    'draw 0 0 0 0|f6f3 draw 0 0|f6f4 draw 0 0|f6f5 draw 0 0|f6b6 draw 0 0|f6c6 draw 0 0|f6d6 draw 0 0|f6e6 draw 0 0|f6g6 draw 0 0|f6h6 draw 0 0|f6f7 draw 0 0|g7h7 draw 0 0|g7f7 win 1 43|g7g6 win 1 37|g7h6 win 1 35|f6a6 win 1 25|f6f8 win 1 21|f6f1 win 1 15|f6f2 win 1 15',
  'R7/6k1/P7/8/8/5r2/8/6K1 w - - 1 2':
    'draw 0 0 0 0|a6a7 draw 0 0|a8a7 draw 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|g1h1 draw 0 0|g1g2 draw 0 0|g1h2 draw 0 0|a8g8 win 1 31|a8h8 win 1 31|a8f8 win 1 27',
  'R7/P5k1/8/8/8/5r2/8/6K1 b - - 0 2':
    'draw 0 0 0 0|f3a3 draw 0 0|f3g3 draw 0 0|f3f7 win 3 59|f3b3 win 3 31|f3d3 win 3 31|f3e3 win 3 31|f3h3 win 3 31|f3f4 win 3 31|f3f5 win 3 31|f3f6 win 3 31|f3c3 win 3 29|g7f7 win 3 23|g7h7 win 3 21|g7g6 win 3 19|f3f8 win 1 19|g7h6 win 3 17|g7f6 win 3 15|f3f1 win 1 13|f3f2 win 1 13',
  'R7/P5k1/8/8/8/r7/8/6K1 w - - 1 3':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|g1f2 draw 0 0|g1g2 draw 0 0|g1h2 draw 0 0|a8f8 win 1 31|a8g8 win 1 31|a8h8 win 1 31',
  '1R6/P5k1/8/8/8/r7/8/6K1 b - - 2 3':
    'draw 0 0 0 0|a3a7 draw 0 0|a3a1 draw 0 0|g7f6 win 1 33|g7f7 win 1 31|a3g3 win 3 29|a3a2 win 1 29|a3a4 win 1 29|a3a5 win 1 29|a3a6 win 1 29|g7g6 win 1 29|g7h6 win 1 29|g7h7 win 1 29|a3c3 win 1 19|a3d3 win 1 17|a3e3 win 1 17|a3f3 win 1 15|a3h3 win 1 15|a3b3 win 1 11',
  '1R6/r5k1/8/8/8/8/8/6K1 w - - 0 4':
    'draw 0 0 0 0|b8b1 draw 0 0|b8b2 draw 0 0|b8b3 draw 0 0|b8b4 draw 0 0|b8b5 draw 0 0|b8b6 draw 0 0|b8c8 draw 0 0|b8d8 draw 0 0|b8e8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|g1f2 draw 0 0|g1g2 draw 0 0|g1h2 draw 0 0|b8f8 win 1 25|b8g8 win 1 25|b8h8 win 1 25|b8b7 win 1 23|b8a8 win 1 23',
  '8/r5k1/8/8/8/8/8/1R4K1 b - - 1 4':
    'draw 0 0 0 0|a7a2 draw 0 0|a7a3 draw 0 0|a7a4 draw 0 0|a7a5 draw 0 0|a7a6 draw 0 0|a7c7 draw 0 0|a7d7 draw 0 0|a7e7 draw 0 0|a7f7 draw 0 0|a7a8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|a7b7 win 1 31|a7a1 win 1 27',
  '8/6k1/8/8/8/8/r7/1R4K1 w - - 2 5':
    'draw 0 0 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|b1a1 win 1 25|b1b2 win 1 19',
  '8/6k1/8/8/8/8/r7/2R3K1 b - - 3 5':
    'draw 0 0 0 0|a2b2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|a2a1 win 1 27|a2c2 win 1 27|a2f2 win 1 23|a2g2 win 1 23|a2h2 win 1 23',
  '8/6k1/8/8/8/8/1r6/2R3K1 w - - 4 6':
    'draw 0 0 0 0|c1a1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1c3 draw 0 0|c1c4 draw 0 0|c1c5 draw 0 0|c1c6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|c1b1 win 1 27|c1c2 win 1 19',
  '8/6k1/8/8/8/8/1r6/R5K1 b - - 5 6':
    'draw 0 0 0 0|b2c2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|b2b1 win 1 27|b2a2 win 1 27|b2f2 win 1 23|b2g2 win 1 23|b2h2 win 1 23',
  '8/6k1/8/8/8/8/2r5/R5K1 w - - 6 7':
    'draw 0 0 0 0|a1b1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|a1c1 win 1 27|a1a2 win 1 17',
  '8/6k1/8/8/8/8/2r5/1R4K1 b - - 7 7':
    'draw 0 0 0 0|c2a2 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2c3 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|c2c1 win 1 27|c2b2 win 1 27|c2f2 win 1 23|c2g2 win 1 23|c2h2 win 1 23',
  '8/6k1/8/8/8/8/r7/1R4K1 w - - 8 8':
    'draw 0 0 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|b1a1 win 1 25|b1b2 win 1 19',
  '8/6k1/8/8/8/8/r7/2R3K1 b - - 9 8':
    'draw 0 0 0 0|a2b2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|a2a1 win 1 27|a2c2 win 1 27|a2f2 win 1 23|a2g2 win 1 23|a2h2 win 1 23',
  '8/6k1/8/8/8/8/1r6/2R3K1 w - - 10 9':
    'draw 0 0 0 0|c1a1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1c3 draw 0 0|c1c4 draw 0 0|c1c5 draw 0 0|c1c6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|c1b1 win 1 27|c1c2 win 1 19',
  '8/6k1/8/8/8/8/1r6/R5K1 b - - 11 9':
    'draw 0 0 0 0|b2c2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|b2b1 win 1 27|b2a2 win 1 27|b2f2 win 1 23|b2g2 win 1 23|b2h2 win 1 23',
  '8/6k1/8/8/8/8/2r5/R5K1 w - - 12 10':
    'draw 0 0 0 0|a1b1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|a1c1 win 1 27|a1a2 win 1 17',
  '8/6k1/8/8/8/8/2r5/1R4K1 b - - 13 10':
    'draw 0 0 0 0|c2a2 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2c3 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|c2c1 win 1 27|c2b2 win 1 27|c2f2 win 1 23|c2g2 win 1 23|c2h2 win 1 23',
  '8/6k1/8/8/8/8/r7/1R4K1 w - - 14 11':
    'draw 0 0 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|b1a1 win 1 25|b1b2 win 1 19',
  '8/6k1/8/8/8/8/r7/2R3K1 b - - 15 11':
    'draw 0 0 0 0|a2b2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|a2a1 win 1 27|a2c2 win 1 27|a2f2 win 1 23|a2g2 win 1 23|a2h2 win 1 23',
  '8/6k1/8/8/8/8/1r6/2R3K1 w - - 16 12':
    'draw 0 0 0 0|c1a1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1c3 draw 0 0|c1c4 draw 0 0|c1c5 draw 0 0|c1c6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|c1b1 win 1 27|c1c2 win 1 19',
  '8/6k1/8/8/8/8/1r6/R5K1 b - - 17 12':
    'draw 0 0 0 0|b2c2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|b2b1 win 1 27|b2a2 win 1 27|b2f2 win 1 23|b2g2 win 1 23|b2h2 win 1 23',
  '8/6k1/8/8/8/8/2r5/R5K1 w - - 18 13':
    'draw 0 0 0 0|a1b1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|a1c1 win 1 27|a1a2 win 1 17',
  '8/6k1/8/8/8/8/2r5/1R4K1 b - - 19 13':
    'draw 0 0 0 0|c2a2 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2c3 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|c2c1 win 1 27|c2b2 win 1 27|c2f2 win 1 23|c2g2 win 1 23|c2h2 win 1 23',
  '8/6k1/8/8/8/8/r7/1R4K1 w - - 20 14':
    'draw 0 0 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|b1a1 win 1 25|b1b2 win 1 19',
  '8/6k1/8/8/8/8/r7/2R3K1 b - - 21 14':
    'draw 0 0 0 0|a2b2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|a2a1 win 1 27|a2c2 win 1 27|a2f2 win 1 23|a2g2 win 1 23|a2h2 win 1 23',
  '8/6k1/8/8/8/8/1r6/2R3K1 w - - 22 15':
    'draw 0 0 0 0|c1a1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1c3 draw 0 0|c1c4 draw 0 0|c1c5 draw 0 0|c1c6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|g1f1 draw 0 0|g1h1 draw 0 0|c1b1 win 1 27|c1c2 win 1 19',
  '8/6k1/8/8/8/8/1r6/R5K1 b - - 23 15':
    'draw 0 0 0 0|b2c2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|g7f6 draw 0 0|g7g6 draw 0 0|g7h6 draw 0 0|g7f7 draw 0 0|g7h7 draw 0 0|g7f8 draw 0 0|g7g8 draw 0 0|g7h8 draw 0 0|b2b1 win 1 27|b2a2 win 1 27|b2f2 win 1 23|b2g2 win 1 23|b2h2 win 1 23',
  'R7/P5k1/8/8/8/r7/8/5K2 b - - 2 3':
    'draw 0 0 0 0|a3a1 draw 0 0|a3a2 draw 0 0|a3f3 draw 0 0|a3a4 draw 0 0|a3a5 draw 0 0|a3a6 draw 0 0|g7h7 draw 0 0|g7f7 win 11 41|g7f6 win 3 33|g7g6 win 3 33|a3b3 win 3 31|a3d3 win 3 31|a3e3 win 3 31|a3g3 win 3 31|a3h3 win 3 31|g7h6 win 3 31|a3c3 win 3 29|a3a7 win 1 29',
  'R7/P5k1/8/8/8/8/8/r4K2 w - - 3 4': 'draw 0 0 0 0|f1e2 draw 0 0|f1f2 draw 0 0|f1g2 draw 0 0',
  'R7/P5k1/8/8/8/8/4K3/r7 b - - 4 4':
    'draw 0 0 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|g7h7 draw 0 0|g7f7 win 9 39|g7f6 win 3 31|g7g6 win 3 31|a1b1 win 3 29|a1g1 win 3 29|g7h6 win 3 29|a1c1 win 3 27|a1a7 win 1 27|a1h1 win 3 19|a1d1 win 1 13|a1e1 win 1 13|a1f1 win 1 13',
  'R7/P5k1/8/8/8/8/r3K3/8 w - - 5 5':
    'draw 0 0 0 0|e2d1 draw 0 0|e2e1 draw 0 0|e2f1 draw 0 0|e2d3 draw 0 0|e2e3 draw 0 0|e2f3 draw 0 0',
  'R7/P5k1/8/8/8/8/r7/3K4 b - - 6 5':
    'draw 0 0 0 0|a2a1 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|g7h7 draw 0 0|g7f7 win 7 37|g7f6 win 3 33|g7g6 win 3 33|g7h6 win 3 33|a2f2 win 3 31|a2h2 win 3 31|a2b2 win 3 29|a2a7 win 1 29|a2g2 win 3 21|a2c2 win 1 13|a2d2 win 1 13|a2e2 win 1 13',
  'R7/P5k1/8/8/8/8/8/r2K4 w - - 7 6': 'draw 0 0 0 0|d1c2 draw 0 0|d1d2 draw 0 0|d1e2 draw 0 0',
  'R7/P5k1/8/8/8/8/2K5/r7 b - - 8 6':
    'draw 0 0 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|g7h7 draw 0 0|g7f7 win 5 35|a1e1 win 3 31|a1f1 win 3 31|a1g1 win 3 31|g7f6 win 3 31|g7g6 win 3 31|g7h6 win 3 31|a1a7 win 1 27|a1h1 win 3 21|a1b1 win 1 13|a1c1 win 1 13|a1d1 win 1 13',
  'R7/P5k1/8/8/8/8/r1K5/8 w - - 9 7':
    'draw 0 0 0 0|c2b1 draw 0 0|c2c1 draw 0 0|c2d1 draw 0 0|c2b3 draw 0 0|c2c3 draw 0 0|c2d3 draw 0 0',
  'R7/P5k1/8/8/8/8/r7/1K6 b - - 10 7':
    'draw 0 0 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2d2 win 3 33|a2f2 win 3 33|a2h2 win 3 33|a2e2 win 3 31|a2a7 win 1 29|a2g2 win 3 23|g7f6 win 1 15|g7f7 win 1 15|a2a1 win 1 13|a2b2 win 1 13|a2c2 win 1 13|g7g6 win 1 13|g7h6 win 1 13|g7h7 win 1 13',
  'R7/P5k1/8/8/8/r7/8/1K6 w - - 11 8':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|b1c1 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|a8h8 win 1 33|a8f8 win 1 31|a8g8 win 1 31',
  'R7/P5k1/8/8/8/r7/8/2K5 b - - 12 8':
    'draw 0 0 0 0|a3a1 draw 0 0|a3a2 draw 0 0|a3a4 draw 0 0|a3a5 draw 0 0|a3a6 draw 0 0|g7h7 draw 0 0|a3c3 win 5 59|g7f7 win 5 35|a3d3 win 3 33|a3e3 win 3 33|a3f3 win 3 33|a3g3 win 3 33|a3h3 win 3 33|g7f6 win 3 33|g7g6 win 3 33|g7h6 win 3 33|a3b3 win 3 29|a3a7 win 1 29',
  'R7/P5k1/8/8/8/8/8/r1K5 w - - 13 9': 'draw 0 0 0 0|c1b2 draw 0 0|c1c2 draw 0 0|c1d2 draw 0 0',
  'R7/P5k1/8/8/8/8/1K6/r7 b - - 14 9':
    'draw 0 0 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1d1 win 3 31|a1e1 win 3 31|a1f1 win 3 31|a1a7 win 1 29|a1g1 win 3 23|a1h1 win 3 21|g7f6 win 1 15|g7f7 win 1 15|a1b1 win 1 13|a1c1 win 1 13|a1a2 win 1 13|a1a3 win 1 13|g7g6 win 1 13|g7h6 win 1 13|g7h7 win 1 13',
  'R7/P5k1/8/8/r7/8/1K6/8 w - - 15 10':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|b2b1 draw 0 0|b2c1 draw 0 0|b2c2 draw 0 0|b2b3 draw 0 0|b2c3 draw 0 0|a8h8 win 1 33|a8f8 win 1 31|a8g8 win 1 31',
  'R7/P5k1/8/8/r7/8/8/1K6 b - - 16 10':
    'draw 0 0 0 0|a4a3 draw 0 0|a4b4 draw 0 0|a4a5 draw 0 0|a4a6 draw 0 0|g7h7 draw 0 0|g7f7 win 7 35|a4f4 win 3 33|a4g4 win 3 33|a4h4 win 3 33|g7f6 win 3 33|g7g6 win 3 33|g7h6 win 3 33|a4c4 win 3 31|a4a7 win 1 29|a4d4 win 3 23|a4e4 win 3 21|a4a1 win 1 13|a4a2 win 1 13',
  'R7/P5k1/8/8/8/r7/8/1K6 w - - 17 11':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|b1c1 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|a8h8 win 1 33|a8f8 win 1 31|a8g8 win 1 31',
  'R7/P5k1/8/8/8/r7/8/2K5 b - - 18 11':
    'draw 0 0 0 0|a3a1 draw 0 0|a3a2 draw 0 0|a3a4 draw 0 0|a3a5 draw 0 0|a3a6 draw 0 0|g7h7 draw 0 0|a3c3 win 5 59|g7f7 win 5 35|a3d3 win 3 33|a3e3 win 3 33|a3f3 win 3 33|a3g3 win 3 33|a3h3 win 3 33|g7f6 win 3 33|g7g6 win 3 33|g7h6 win 3 33|a3b3 win 3 29|a3a7 win 1 29',
  'R7/P5k1/8/8/8/8/8/r1K5 w - - 19 12': 'draw 0 0 0 0|c1b2 draw 0 0|c1c2 draw 0 0|c1d2 draw 0 0',
  'R7/P5k1/8/8/8/8/1K6/r7 b - - 20 12':
    'draw 0 0 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1d1 win 3 31|a1e1 win 3 31|a1f1 win 3 31|a1a7 win 1 29|a1g1 win 3 23|a1h1 win 3 21|g7f6 win 1 15|g7f7 win 1 15|a1b1 win 1 13|a1c1 win 1 13|a1a2 win 1 13|a1a3 win 1 13|g7g6 win 1 13|g7h6 win 1 13|g7h7 win 1 13',
  'R7/P5k1/8/8/r7/8/1K6/8 w - - 21 13':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|b2b1 draw 0 0|b2c1 draw 0 0|b2c2 draw 0 0|b2b3 draw 0 0|b2c3 draw 0 0|a8h8 win 1 33|a8f8 win 1 31|a8g8 win 1 31',
  'R7/P5k1/8/8/r7/8/8/1K6 b - - 22 13':
    'draw 0 0 0 0|a4a3 draw 0 0|a4b4 draw 0 0|a4a5 draw 0 0|a4a6 draw 0 0|g7h7 draw 0 0|g7f7 win 7 35|a4f4 win 3 33|a4g4 win 3 33|a4h4 win 3 33|g7f6 win 3 33|g7g6 win 3 33|g7h6 win 3 33|a4c4 win 3 31|a4a7 win 1 29|a4d4 win 3 23|a4e4 win 3 21|a4a1 win 1 13|a4a2 win 1 13',
  'R7/P5k1/8/8/8/r7/8/1K6 w - - 23 14':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|b1c1 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|a8h8 win 1 33|a8f8 win 1 31|a8g8 win 1 31',
  'R7/P5k1/8/8/8/r7/1K6/8 b - - 24 14':
    'draw 0 0 0 0|a3a4 draw 0 0|a3a5 draw 0 0|a3a6 draw 0 0|a3d3 win 3 31|a3e3 win 3 31|a3f3 win 3 31|a3h3 win 3 31|a3a7 win 1 29|a3g3 win 3 23|g7f6 win 1 15|g7f7 win 1 15|a3a1 win 1 13|a3a2 win 1 13|a3b3 win 1 13|a3c3 win 1 13|g7g6 win 1 13|g7h6 win 1 13|g7h7 win 1 13',
  'R7/P5k1/8/8/r7/8/1K6/8 w - - 25 15':
    'draw 0 0 0 0|a8b8 draw 0 0|a8c8 draw 0 0|a8d8 draw 0 0|a8e8 draw 0 0|b2b1 draw 0 0|b2c1 draw 0 0|b2c2 draw 0 0|b2b3 draw 0 0|b2c3 draw 0 0|a8h8 win 1 33|a8f8 win 1 31|a8g8 win 1 31',
  'R7/P5k1/8/8/r7/8/8/2K5 b - - 26 15':
    'draw 0 0 0 0|a4a1 draw 0 0|a4a2 draw 0 0|a4a3 draw 0 0|a4c4 draw 0 0|a4a5 draw 0 0|a4a6 draw 0 0|g7h7 draw 0 0|g7f7 win 7 35|a4b4 win 3 33|a4f4 win 3 33|a4g4 win 3 33|a4h4 win 3 33|g7f6 win 3 33|g7g6 win 3 33|g7h6 win 3 33|a4a7 win 1 29|a4d4 win 3 23|a4e4 win 3 19',
  '4k3/7R/r7/3KP3/8/8/8/8 b - - 0 1':
    'draw 0 0 0 0|a6a1 draw 0 0|a6a2 draw 0 0|a6a3 draw 0 0|a6a4 draw 0 0|a6a5 draw 0 0|a6b6 draw 0 0|a6g6 draw 0 0|e8d8 draw 0 0|e8f8 draw 0 0|a6a8 win 3 17|a6h6 win 1 15|a6c6 win 1 13|a6e6 win 1 11|a6a7 win 1 11|a6d6 win 1 9|a6f6 win 1 7',
  '4k3/7R/8/3KP3/8/8/8/r7 w - - 1 2':
    'draw 0 0 0 0|e5e6 draw 0 0|h7h2 draw 0 0|h7h3 draw 0 0|h7h4 draw 0 0|h7h5 draw 0 0|h7h6 draw 0 0|h7b7 draw 0 0|h7c7 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5c6 draw 0 0|d5d6 draw 0 0|d5e6 draw 0 0|h7h1 win 1 33|h7a7 win 1 33|h7d7 win 1 29|h7e7 win 1 29|h7f7 win 1 29',
  '4k3/7R/4P3/3K4/8/8/8/r7 b - - 0 2':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d8 draw 0 0|e8f8 draw 0 0|a1a8 win 3 15|a1h1 win 1 11|a1a7 win 1 9',
  '4k3/7R/4P3/3K4/8/8/8/1r6 w - - 1 3':
    'draw 0 0 0 0|e6e7 draw 0 0|h7h2 draw 0 0|h7h3 draw 0 0|h7h4 draw 0 0|h7h6 draw 0 0|h7a7 draw 0 0|h7c7 draw 0 0|h7d7 draw 0 0|h7f7 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|d5d6 draw 0 0|h7h5 win 3 35|h7b7 win 1 33|h7h1 win 1 31|h7e7 win 1 27',
  '4k3/4P2R/8/3K4/8/8/8/1r6 b - - 0 3':
    'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1b2 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|e8d7 draw 0 0|b1b7 win 3 27|b1b8 win 3 23|b1h1 win 1 17',
  '4k3/4P2R/8/3K4/8/8/8/r7 w - - 1 4':
    'draw 0 0 0 0|h7h2 draw 0 0|h7h3 draw 0 0|h7h4 draw 0 0|h7h6 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|d5d6 draw 0 0|d5e6 draw 0 0|h7h5 win 3 35|h7h1 win 1 31|h7f7 win 1 31',
  '4k3/4P3/8/3K4/8/8/7R/r7 b - - 2 4':
    'draw 0 0 0 0|e8e7 draw 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|e8f7 draw 0 0|a1a7 win 3 27|a1a8 win 3 23|a1h1 win 1 17|a1a2 win 1 17',
  '8/4k3/8/3K4/8/8/7R/r7 w - - 0 5':
    'draw 0 0 0 0|h2b2 draw 0 0|h2c2 draw 0 0|h2d2 draw 0 0|h2e2 draw 0 0|h2f2 draw 0 0|h2g2 draw 0 0|h2h3 draw 0 0|h2h4 draw 0 0|h2h6 draw 0 0|h2h7 draw 0 0|h2h8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|h2h5 win 3 29|h2h1 win 1 27|h2a2 win 1 27',
  '8/4k3/8/3K4/8/8/1R6/r7 b - - 1 5':
    'draw 0 0 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1h1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|a1b1 win 1 21|a1a2 win 1 21',
  '8/4k3/8/3K4/8/8/1R6/2r5 w - - 2 6':
    'draw 0 0 0 0|b2a2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2f2 draw 0 0|b2g2 draw 0 0|b2h2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5e5 draw 0 0|b2c2 win 1 29|b2b1 win 1 27',
  '8/4k3/8/3K4/8/8/R7/2r5 b - - 3 6':
    'draw 0 0 0 0|c1b1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1g1 draw 0 0|c1h1 draw 0 0|c1c3 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|c1c4 win 1 25|c1c5 win 1 25|c1a1 win 1 21|c1c2 win 1 21|c1c6 win 1 21',
  '8/4k3/8/3K4/8/8/R7/1r6 w - - 4 7':
    'draw 0 0 0 0|a2c2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2f2 draw 0 0|a2g2 draw 0 0|a2h2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|a2b2 win 1 29|a2a1 win 1 27',
  '8/4k3/8/3K4/8/8/2R5/1r6 b - - 5 7':
    'draw 0 0 0 0|b1a1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|b1c1 win 1 21|b1b2 win 1 21',
  '8/4k3/8/3K4/8/8/2R5/r7 w - - 6 8':
    'draw 0 0 0 0|c2b2 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2f2 draw 0 0|c2g2 draw 0 0|c2h2 draw 0 0|c2c3 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|c2c1 win 1 27|c2a2 win 1 27',
  '8/4k3/8/3K4/8/8/1R6/r7 b - - 7 8':
    'draw 0 0 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1h1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|a1b1 win 1 21|a1a2 win 1 21',
  '8/4k3/8/3K4/8/8/1R6/2r5 w - - 8 9':
    'draw 0 0 0 0|b2a2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2f2 draw 0 0|b2g2 draw 0 0|b2h2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5e5 draw 0 0|b2c2 win 1 29|b2b1 win 1 27',
  '8/4k3/8/3K4/8/8/R7/2r5 b - - 9 9':
    'draw 0 0 0 0|c1b1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1g1 draw 0 0|c1h1 draw 0 0|c1c3 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|c1c4 win 1 25|c1c5 win 1 25|c1a1 win 1 21|c1c2 win 1 21|c1c6 win 1 21',
  '8/4k3/8/3K4/8/8/R7/1r6 w - - 10 10':
    'draw 0 0 0 0|a2c2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2f2 draw 0 0|a2g2 draw 0 0|a2h2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|a2b2 win 1 29|a2a1 win 1 27',
  '8/4k3/8/3K4/8/8/2R5/1r6 b - - 11 10':
    'draw 0 0 0 0|b1a1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|b1c1 win 1 21|b1b2 win 1 21',
  '8/4k3/8/3K4/8/8/2R5/r7 w - - 12 11':
    'draw 0 0 0 0|c2b2 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2f2 draw 0 0|c2g2 draw 0 0|c2h2 draw 0 0|c2c3 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|c2c1 win 1 27|c2a2 win 1 27',
  '8/4k3/8/3K4/8/8/1R6/r7 b - - 13 11':
    'draw 0 0 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1h1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|a1b1 win 1 21|a1a2 win 1 21',
  '8/4k3/8/3K4/8/8/1R6/2r5 w - - 14 12':
    'draw 0 0 0 0|b2a2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2f2 draw 0 0|b2g2 draw 0 0|b2h2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5e5 draw 0 0|b2c2 win 1 29|b2b1 win 1 27',
  '8/4k3/8/3K4/8/8/R7/2r5 b - - 15 12':
    'draw 0 0 0 0|c1b1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1g1 draw 0 0|c1h1 draw 0 0|c1c3 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|c1c4 win 1 25|c1c5 win 1 25|c1a1 win 1 21|c1c2 win 1 21|c1c6 win 1 21',
  '8/4k3/8/3K4/8/8/R7/1r6 w - - 16 13':
    'draw 0 0 0 0|a2c2 draw 0 0|a2d2 draw 0 0|a2e2 draw 0 0|a2f2 draw 0 0|a2g2 draw 0 0|a2h2 draw 0 0|a2a3 draw 0 0|a2a4 draw 0 0|a2a5 draw 0 0|a2a6 draw 0 0|a2a7 draw 0 0|a2a8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|a2b2 win 1 29|a2a1 win 1 27',
  '8/4k3/8/3K4/8/8/2R5/1r6 b - - 17 13':
    'draw 0 0 0 0|b1a1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 draw 0 0|b1b8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|b1c1 win 1 21|b1b2 win 1 21',
  '8/4k3/8/3K4/8/8/2R5/r7 w - - 18 14':
    'draw 0 0 0 0|c2b2 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2f2 draw 0 0|c2g2 draw 0 0|c2h2 draw 0 0|c2c3 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|c2c1 win 1 27|c2a2 win 1 27',
  '8/4k3/8/3K4/8/8/1R6/r7 b - - 19 14':
    'draw 0 0 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1h1 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|a1a7 draw 0 0|a1a8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|a1b1 win 1 21|a1a2 win 1 21',
  '8/4k3/8/3K4/8/8/1R6/2r5 w - - 20 15':
    'draw 0 0 0 0|b2a2 draw 0 0|b2d2 draw 0 0|b2e2 draw 0 0|b2f2 draw 0 0|b2g2 draw 0 0|b2h2 draw 0 0|b2b3 draw 0 0|b2b4 draw 0 0|b2b5 draw 0 0|b2b6 draw 0 0|b2b7 draw 0 0|b2b8 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5e5 draw 0 0|b2c2 win 1 29|b2b1 win 1 27',
  '8/4k3/8/3K4/8/8/R7/2r5 b - - 21 15':
    'draw 0 0 0 0|c1b1 draw 0 0|c1d1 draw 0 0|c1e1 draw 0 0|c1f1 draw 0 0|c1g1 draw 0 0|c1h1 draw 0 0|c1c3 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|e7f6 draw 0 0|e7d7 draw 0 0|e7f7 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f8 draw 0 0|c1c4 win 1 25|c1c5 win 1 25|c1a1 win 1 21|c1c2 win 1 21|c1c6 win 1 21',
  '4k3/4P1R1/8/3K4/8/8/8/r7 b - - 2 4':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1h1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|a1a7 win 3 27|a1a8 win 3 23|a1g1 win 1 17',
  '4k3/4P1R1/8/3K4/8/8/8/1r6 w - - 3 5':
    'draw 0 0 0 0|g7g2 draw 0 0|g7g3 draw 0 0|g7g4 draw 0 0|g7g6 draw 0 0|g7h7 draw 0 0|g7g8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|d5d6 draw 0 0|d5e6 draw 0 0|g7g5 win 3 35|g7g1 win 1 31|g7f7 win 1 31',
  '4k3/4P2R/8/3K4/8/8/8/1r6 b - - 4 5':
    'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1b2 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|e8d7 draw 0 0|b1b7 win 3 27|b1b8 win 3 23|b1h1 win 1 17',
  '4k3/4P2R/8/3K4/8/8/8/r7 w - - 5 6':
    'draw 0 0 0 0|h7h2 draw 0 0|h7h3 draw 0 0|h7h4 draw 0 0|h7h6 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|d5d6 draw 0 0|d5e6 draw 0 0|h7h5 win 3 35|h7h1 win 1 31|h7f7 win 1 31',
  '4k3/4P1R1/8/3K4/8/8/8/r7 b - - 6 6':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1h1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|a1a7 win 3 27|a1a8 win 3 23|a1g1 win 1 17',
  '4k3/4P1R1/8/3K4/8/8/8/1r6 w - - 7 7':
    'draw 0 0 0 0|g7g2 draw 0 0|g7g3 draw 0 0|g7g4 draw 0 0|g7g6 draw 0 0|g7h7 draw 0 0|g7g8 draw 0 0|d5c4 draw 0 0|d5d4 draw 0 0|d5e4 draw 0 0|d5c5 draw 0 0|d5e5 draw 0 0|d5c6 draw 0 0|d5d6 draw 0 0|d5e6 draw 0 0|g7g5 win 3 35|g7g1 win 1 31|g7f7 win 1 31',
  '4k3/4P1R1/8/8/2K5/8/8/1r6 b - - 8 7':
    'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1h1 draw 0 0|b1b2 draw 0 0|b1b6 draw 0 0|e8d7 draw 0 0|b1b7 win 3 29|b1b8 win 3 27|b1g1 win 1 23|b1b3 win 1 19|b1b4 win 1 17|b1b5 win 1 17',
  '4k3/4P1R1/8/8/2K5/8/8/r7 w - - 9 8':
    'draw 0 0 0 0|g7g2 draw 0 0|g7g3 draw 0 0|g7g5 draw 0 0|g7g6 draw 0 0|g7h7 draw 0 0|g7g8 draw 0 0|c4b3 draw 0 0|c4c3 draw 0 0|c4d3 draw 0 0|c4b4 draw 0 0|c4d4 draw 0 0|c4b5 draw 0 0|c4c5 draw 0 0|c4d5 draw 0 0|g7g4 win 3 35|g7f7 win 1 31|g7g1 win 1 29',
  '4k3/4P2R/8/8/2K5/8/8/r7 b - - 10 8':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|a1a7 win 3 29|a1a8 win 3 27|a1h1 win 1 23',
  '4k3/4P2R/8/8/2K5/8/8/1r6 w - - 11 9':
    'draw 0 0 0 0|h7h2 draw 0 0|h7h3 draw 0 0|h7h4 draw 0 0|h7h5 draw 0 0|h7h6 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|c4c3 draw 0 0|c4d3 draw 0 0|c4d4 draw 0 0|c4c5 draw 0 0|c4d5 draw 0 0|h7f7 win 1 33|h7h1 win 1 31',
  '4k3/4P1R1/8/8/2K5/8/8/1r6 b - - 12 9':
    'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1h1 draw 0 0|b1b2 draw 0 0|b1b6 draw 0 0|e8d7 draw 0 0|b1b7 win 3 29|b1b8 win 3 27|b1g1 win 1 23|b1b3 win 1 19|b1b4 win 1 17|b1b5 win 1 17',
  '4k3/4P1R1/8/8/2K5/8/8/r7 w - - 13 10':
    'draw 0 0 0 0|g7g2 draw 0 0|g7g3 draw 0 0|g7g5 draw 0 0|g7g6 draw 0 0|g7h7 draw 0 0|g7g8 draw 0 0|c4b3 draw 0 0|c4c3 draw 0 0|c4d3 draw 0 0|c4b4 draw 0 0|c4d4 draw 0 0|c4b5 draw 0 0|c4c5 draw 0 0|c4d5 draw 0 0|g7g4 win 3 35|g7f7 win 1 31|g7g1 win 1 29',
  '4k3/4P2R/8/8/2K5/8/8/r7 b - - 14 10':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1g1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|a1a7 win 3 29|a1a8 win 3 27|a1h1 win 1 23',
  '4k3/4P2R/8/8/2K5/8/8/1r6 w - - 15 11':
    'draw 0 0 0 0|h7h2 draw 0 0|h7h3 draw 0 0|h7h4 draw 0 0|h7h5 draw 0 0|h7h6 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|c4c3 draw 0 0|c4d3 draw 0 0|c4d4 draw 0 0|c4c5 draw 0 0|c4d5 draw 0 0|h7f7 win 1 33|h7h1 win 1 31',
  '4k3/4P2R/8/8/8/2K5/8/1r6 b - - 16 11':
    'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|e8d7 draw 0 0|b1b7 win 3 31|b1b8 win 3 27|b1h1 win 1 23|b1b2 win 1 19|b1b3 win 1 19|b1b4 win 1 17',
  '4k3/4P2R/8/8/8/2K5/8/r7 w - - 17 12':
    'draw 0 0 0 0|h7h2 draw 0 0|h7h4 draw 0 0|h7h5 draw 0 0|h7h6 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|c3b2 draw 0 0|c3c2 draw 0 0|c3d2 draw 0 0|c3b3 draw 0 0|c3d3 draw 0 0|c3b4 draw 0 0|c3c4 draw 0 0|c3d4 draw 0 0|h7h3 win 3 33|h7h1 win 1 31|h7f7 win 1 31',
  '4k3/4P1R1/8/8/8/2K5/8/r7 b - - 18 12':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1h1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|a1a7 win 3 31|a1a8 win 3 27|a1g1 win 1 25',
  '4k3/4P1R1/8/8/8/2K5/8/1r6 w - - 19 13':
    'draw 0 0 0 0|g7g2 draw 0 0|g7g3 draw 0 0|g7g4 draw 0 0|g7g5 draw 0 0|g7g6 draw 0 0|g7h7 draw 0 0|g7g8 draw 0 0|c3c2 draw 0 0|c3d2 draw 0 0|c3d3 draw 0 0|c3c4 draw 0 0|c3d4 draw 0 0|g7f7 win 1 33|g7g1 win 1 29',
  '4k3/4P2R/8/8/8/2K5/8/1r6 b - - 20 13':
    'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0|b1d1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|e8d7 draw 0 0|b1b7 win 3 31|b1b8 win 3 27|b1h1 win 1 23|b1b2 win 1 19|b1b3 win 1 19|b1b4 win 1 17',
  '4k3/4P2R/8/8/8/2K5/8/r7 w - - 21 14':
    'draw 0 0 0 0|h7h2 draw 0 0|h7h4 draw 0 0|h7h5 draw 0 0|h7h6 draw 0 0|h7g7 draw 0 0|h7h8 draw 0 0|c3b2 draw 0 0|c3c2 draw 0 0|c3d2 draw 0 0|c3b3 draw 0 0|c3d3 draw 0 0|c3b4 draw 0 0|c3c4 draw 0 0|c3d4 draw 0 0|h7h3 win 3 33|h7h1 win 1 31|h7f7 win 1 31',
  '4k3/4P1R1/8/8/8/2K5/8/r7 b - - 22 14':
    'draw 0 0 0 0|a1b1 draw 0 0|a1c1 draw 0 0|a1d1 draw 0 0|a1e1 draw 0 0|a1f1 draw 0 0|a1h1 draw 0 0|a1a2 draw 0 0|a1a3 draw 0 0|a1a4 draw 0 0|a1a5 draw 0 0|a1a6 draw 0 0|e8d7 draw 0 0|a1a7 win 3 31|a1a8 win 3 27|a1g1 win 1 25',
  '4k3/4P1R1/8/8/8/2K5/8/1r6 w - - 23 15':
    'draw 0 0 0 0|g7g2 draw 0 0|g7g3 draw 0 0|g7g4 draw 0 0|g7g5 draw 0 0|g7g6 draw 0 0|g7h7 draw 0 0|g7g8 draw 0 0|c3c2 draw 0 0|c3d2 draw 0 0|c3d3 draw 0 0|c3c4 draw 0 0|c3d4 draw 0 0|g7f7 win 1 33|g7g1 win 1 29',
  '4k3/4P1R1/8/8/8/8/2K5/1r6 b - - 24 15':
    'draw 0 0 0 0|b1a1 draw 0 0|b1e1 draw 0 0|b1f1 draw 0 0|b1h1 draw 0 0|b1b4 draw 0 0|b1b5 draw 0 0|b1b6 draw 0 0|b1b7 win 3 33|b1b8 win 3 29|b1g1 win 1 27|b1c1 win 1 21|b1d1 win 1 21|e8d7 win 1 21|b1b2 win 1 19|b1b3 win 1 19',
  '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1':
    'draw 0 0 0 0|d8e7 draw 0 0|d8c7 win 3 27|d8d7 win 3 27|d8c8 win 3 27|d8e8 win 3 25',
  '8/4k3/8/4K3/4P3/8/8/8 w - - 1 2':
    'draw 0 0 0 0|e5d4 draw 0 0|e5f4 draw 0 0|e5d5 draw 0 0|e5f5 draw 0 0',
  '8/4k3/8/8/3KP3/8/8/8 b - - 2 2':
    'draw 0 0 0 0|e7d6 draw 0 0|e7e6 draw 0 0|e7d8 draw 0 0|e7e8 draw 0 0|e7f6 win 7 31|e7d7 win 7 31|e7f7 win 7 31|e7f8 win 7 31',
  '8/8/3k4/8/3KP3/8/8/8 w - - 3 3':
    'draw 0 0 0 0|e4e5 draw 0 0|d4c3 draw 0 0|d4d3 draw 0 0|d4e3 draw 0 0|d4c4 draw 0 0',
  '8/8/3k4/4P3/3K4/8/8/8 b - - 0 3':
    'draw 0 0 0 0|d6c6 draw 0 0|d6e6 draw 0 0|d6c7 draw 0 0|d6d7 draw 0 0|d6e7 draw 0 0',
  '8/8/2k5/4P3/3K4/8/8/8 w - - 1 4':
    'draw 0 0 0 0|e5e6 draw 0 0|d4c3 draw 0 0|d4d3 draw 0 0|d4e3 draw 0 0|d4c4 draw 0 0|d4e4 draw 0 0',
  '8/8/2k1P3/8/3K4/8/8/8 b - - 0 4':
    'draw 0 0 0 0|c6d6 draw 0 0|c6c7 win 7 23|c6b5 win 1 13|c6b6 win 1 13|c6b7 win 1 13',
  '8/8/3kP3/8/3K4/8/8/8 w - - 1 5':
    'draw 0 0 0 0|e6e7 draw 0 0|d4c3 draw 0 0|d4d3 draw 0 0|d4e3 draw 0 0|d4c4 draw 0 0|d4e4 draw 0 0',
  '8/4P3/3k4/8/3K4/8/8/8 b - - 0 5':
    'draw 0 0 0 0|d6e7 draw 0 0|d6d7 draw 0 0|d6c6 win 1 11|d6e6 win 1 11|d6c7 win 1 11',
  'K7/8/8/8/8/1Q6/2p5/1k6 b - - 0 1': 'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0',
  'K7/8/8/8/8/1Q6/2p5/k7 w - - 1 2':
    'draw 0 0 0 0|b3c2 draw 0 0|b3a3 draw 0 0|b3c3 draw 0 0|b3d3 draw 0 0|b3e3 draw 0 0|b3f3 draw 0 0|b3g3 draw 0 0|b3h3 draw 0 0|b3a4 draw 0 0|b3b4 draw 0 0|b3c4 draw 0 0|b3b5 draw 0 0|b3d5 draw 0 0|b3b6 draw 0 0|b3e6 draw 0 0|b3b7 draw 0 0|b3f7 draw 0 0|b3b8 draw 0 0|b3g8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|b3a2 win 1 17|b3b2 win 1 17|b3b1 win 1 15',
  'K7/8/8/8/8/Q7/2p5/k7 b - - 2 2': 'draw 0 0 0 0|a1b1 draw 0 0',
  'K7/8/8/8/8/Q7/2p5/1k6 w - - 3 3':
    'draw 0 0 0 0|a3b3 draw 0 0|a3c3 draw 0 0|a3d3 draw 0 0|a3e3 draw 0 0|a3f3 draw 0 0|a3g3 draw 0 0|a3h3 draw 0 0|a3a4 draw 0 0|a3b4 draw 0 0|a3a5 draw 0 0|a3c5 draw 0 0|a3a6 draw 0 0|a3d6 draw 0 0|a3a7 draw 0 0|a3e7 draw 0 0|a3f8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|a3c1 win 1 21|a3a1 win 1 19|a3a2 win 1 17|a3b2 win 1 17',
  'K7/8/8/8/8/1Q6/2p5/1k6 b - - 4 3': 'draw 0 0 0 0|b1a1 draw 0 0|b1c1 draw 0 0',
  'K7/8/8/8/8/1Q6/2p5/k7 w - - 5 4':
    'draw 0 0 0 0|b3c2 draw 0 0|b3a3 draw 0 0|b3c3 draw 0 0|b3d3 draw 0 0|b3e3 draw 0 0|b3f3 draw 0 0|b3g3 draw 0 0|b3h3 draw 0 0|b3a4 draw 0 0|b3b4 draw 0 0|b3c4 draw 0 0|b3b5 draw 0 0|b3d5 draw 0 0|b3b6 draw 0 0|b3e6 draw 0 0|b3b7 draw 0 0|b3f7 draw 0 0|b3b8 draw 0 0|b3g8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|b3a2 win 1 17|b3b2 win 1 17|b3b1 win 1 15',
  'K7/8/8/8/8/Q7/2p5/k7 b - - 6 4': 'draw 0 0 0 0|a1b1 draw 0 0',
  'K7/8/8/8/8/Q7/2p5/1k6 w - - 7 5':
    'draw 0 0 0 0|a3b3 draw 0 0|a3c3 draw 0 0|a3d3 draw 0 0|a3e3 draw 0 0|a3f3 draw 0 0|a3g3 draw 0 0|a3h3 draw 0 0|a3a4 draw 0 0|a3b4 draw 0 0|a3a5 draw 0 0|a3c5 draw 0 0|a3a6 draw 0 0|a3d6 draw 0 0|a3a7 draw 0 0|a3e7 draw 0 0|a3f8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|a3c1 win 1 21|a3a1 win 1 19|a3a2 win 1 17|a3b2 win 1 17',
  'K7/8/8/8/8/2Q5/2p5/1k6 b - - 8 5':
    'draw 0 0 0 0|c2c1q draw 0 0|b1c1 draw 0 0|c2c1r win 45 53|c2c1n win 9 19|c2c1b win 17 17|b1a2 win 1 15',
  'K7/8/8/8/8/2Q5/8/1kq5 w - - 0 6':
    'draw 0 0 0 0|c3c1 draw 0 0|c3b3 draw 0 0|c3d3 draw 0 0|c3f3 draw 0 0|c3g3 draw 0 0|c3h3 draw 0 0|c3b4 draw 0 0|c3d4 draw 0 0|c3a5 draw 0 0|c3e5 draw 0 0|c3f6 draw 0 0|c3c7 draw 0 0|c3g7 draw 0 0|c3h8 draw 0 0|c3a1 win 1 17|c3e1 win 1 17|c3a3 win 1 17|c3e3 win 1 17|c3c4 win 1 17|a8a7 win 1 17|a8b8 win 1 17|c3c2 win 1 15|c3d2 win 1 15|c3c5 win 1 15|c3c6 win 1 15|a8b7 win 1 15|c3b2 win 1 13|c3c8 win 1 13',
  'K7/8/8/8/8/1Q6/8/1kq5 b - - 1 6': 'draw 0 0 0 0|b1a1 draw 0 0|c1b2 draw 0 0',
  'K7/8/8/8/8/1Q6/8/k1q5 w - - 2 7':
    'draw 0 0 0 0|b3d3 draw 0 0|b3f3 draw 0 0|b3g3 draw 0 0|b3h3 draw 0 0|b3a4 draw 0 0|b3b4 draw 0 0|b3b5 draw 0 0|b3d5 draw 0 0|b3b6 draw 0 0|b3e6 draw 0 0|b3b7 draw 0 0|b3f7 draw 0 0|b3b8 draw 0 0|b3g8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|b3c2 win 1 17|b3a3 win 1 17|b3c3 win 1 17|b3e3 win 1 17|b3c4 win 1 17|b3b1 win 1 15|b3d1 win 1 15|b3a2 win 1 15|b3b2 win 1 15',
  'K7/8/8/8/8/3Q4/8/k1q5 b - - 3 7':
    'draw 0 0 0 0|c1b1 draw 0 0|c1e1 draw 0 0|c1g1 draw 0 0|c1h1 draw 0 0|c1b2 draw 0 0|c1c2 draw 0 0|c1f4 draw 0 0|c1c5 draw 0 0|c1g5 draw 0 0|c1c6 draw 0 0|c1h6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|a1a2 draw 0 0|a1b2 draw 0 0|c1a3 win 1 17|c1d1 win 1 15|c1f1 win 1 15|c1c3 win 1 15|c1e3 win 1 15|c1c4 win 1 15|c1d2 win 1 13',
  'K7/8/8/8/8/3Q4/8/kq6 w - - 4 8':
    'draw 0 0 0 0|d3b1 draw 0 0|d3d2 draw 0 0|d3e2 draw 0 0|d3a3 draw 0 0|d3c3 draw 0 0|d3e3 draw 0 0|d3f3 draw 0 0|d3g3 draw 0 0|d3h3 draw 0 0|d3c4 draw 0 0|d3d4 draw 0 0|d3d5 draw 0 0|d3a6 draw 0 0|d3d6 draw 0 0|d3d7 draw 0 0|d3d8 draw 0 0|d3f1 win 1 17|d3c2 win 1 17|d3g6 win 1 17|d3d1 win 1 15|d3e4 win 1 15|d3f5 win 1 15|a8a7 win 1 15|d3b3 win 1 13|d3b5 win 1 13|d3h7 win 1 13',
  'K7/8/8/8/8/8/3Q4/kq6 b - - 5 8':
    'draw 0 0 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1a2 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|b1b3 draw 0 0|b1e4 draw 0 0|b1b5 draw 0 0|b1f5 draw 0 0|b1b6 draw 0 0|b1g6 draw 0 0|b1h7 draw 0 0|b1d1 win 1 15|b1e1 win 1 15|b1d3 win 1 15|b1c1 win 1 13|b1b4 win 1 13|b1b8 win 1 13|b1b7 win 1 11',
  'K7/8/8/8/8/8/3Q4/k4q2 w - - 6 9':
    'draw 0 0 0 0|d2c2 draw 0 0|d2h2 draw 0 0|d2c3 draw 0 0|d2e3 draw 0 0|d2b4 draw 0 0|d2d4 draw 0 0|d2a5 draw 0 0|d2d5 draw 0 0|d2g5 draw 0 0|d2d6 draw 0 0|d2h6 draw 0 0|d2d7 draw 0 0|d2d8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|d2c1 win 1 17|d2e1 win 1 17|d2e2 win 1 17|d2f2 win 1 17|d2f4 win 1 17|d2d1 win 1 15|d2a2 win 1 15|d2b2 win 1 15|d2g2 win 1 15|d2d3 win 1 15',
  'K7/8/8/8/8/8/2Q5/k4q2 b - - 7 9':
    'draw 0 0 0 0|f1b1 draw 0 0|f1e1 draw 0 0|f1g1 draw 0 0|f1h1 draw 0 0|f1f3 draw 0 0|f1h3 draw 0 0|f1f4 draw 0 0|f1b5 draw 0 0|f1a6 draw 0 0|f1f6 draw 0 0|f1f7 draw 0 0|f1f8 draw 0 0|f1f5 win 1 17|f1d1 win 1 15|f1d3 win 1 15|f1c4 win 1 15|f1c1 win 1 13|f1e2 win 1 13|f1f2 win 1 13|f1g2 win 1 13',
  'K7/8/8/8/8/8/2Q5/kq6 w - - 8 10':
    'draw 0 0 0 0|c2b1 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2f2 draw 0 0|c2g2 draw 0 0|c2h2 draw 0 0|c2c3 draw 0 0|c2a4 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|c2c1 win 1 17|c2g6 win 1 17|a8a7 win 1 17|c2d1 win 1 15|c2b2 win 1 15|c2d3 win 1 15|c2e4 win 1 15|c2f5 win 1 15|c2a2 win 1 13|c2b3 win 1 13|c2h7 win 1 13',
  'K7/8/8/8/8/8/3Q4/kq6 b - - 9 10':
    'draw 0 0 0 0|b1f1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1a2 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|b1b3 draw 0 0|b1e4 draw 0 0|b1b5 draw 0 0|b1f5 draw 0 0|b1b6 draw 0 0|b1g6 draw 0 0|b1h7 draw 0 0|b1d1 win 1 15|b1e1 win 1 15|b1d3 win 1 15|b1c1 win 1 13|b1b4 win 1 13|b1b8 win 1 13|b1b7 win 1 11',
  'K7/8/8/8/8/8/3Q4/k4q2 w - - 10 11':
    'draw 0 0 0 0|d2c2 draw 0 0|d2h2 draw 0 0|d2c3 draw 0 0|d2e3 draw 0 0|d2b4 draw 0 0|d2d4 draw 0 0|d2a5 draw 0 0|d2d5 draw 0 0|d2g5 draw 0 0|d2d6 draw 0 0|d2h6 draw 0 0|d2d7 draw 0 0|d2d8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|d2c1 win 1 17|d2e1 win 1 17|d2e2 win 1 17|d2f2 win 1 17|d2f4 win 1 17|d2d1 win 1 15|d2a2 win 1 15|d2b2 win 1 15|d2g2 win 1 15|d2d3 win 1 15',
  'K7/8/8/8/8/8/2Q5/k4q2 b - - 11 11':
    'draw 0 0 0 0|f1b1 draw 0 0|f1e1 draw 0 0|f1g1 draw 0 0|f1h1 draw 0 0|f1f3 draw 0 0|f1h3 draw 0 0|f1f4 draw 0 0|f1b5 draw 0 0|f1a6 draw 0 0|f1f6 draw 0 0|f1f7 draw 0 0|f1f8 draw 0 0|f1f5 win 1 17|f1d1 win 1 15|f1d3 win 1 15|f1c4 win 1 15|f1c1 win 1 13|f1e2 win 1 13|f1f2 win 1 13|f1g2 win 1 13',
  'K7/8/8/8/8/8/2Q5/kq6 w - - 12 12':
    'draw 0 0 0 0|c2b1 draw 0 0|c2d2 draw 0 0|c2e2 draw 0 0|c2f2 draw 0 0|c2g2 draw 0 0|c2h2 draw 0 0|c2c3 draw 0 0|c2a4 draw 0 0|c2c4 draw 0 0|c2c5 draw 0 0|c2c6 draw 0 0|c2c7 draw 0 0|c2c8 draw 0 0|c2c1 win 1 17|c2g6 win 1 17|a8a7 win 1 17|c2d1 win 1 15|c2b2 win 1 15|c2d3 win 1 15|c2e4 win 1 15|c2f5 win 1 15|c2a2 win 1 13|c2b3 win 1 13|c2h7 win 1 13',
  'K7/8/8/8/8/8/4Q3/kq6 b - - 13 12':
    'draw 0 0 0 0|b1c1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1a2 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1f5 draw 0 0|b1b6 draw 0 0|b1g6 draw 0 0|b1h7 draw 0 0|b1e4 win 1 17|b1d1 win 1 15|b1e1 win 1 15|b1f1 win 1 15|b1d3 win 1 15|b1b5 win 1 13|b1b8 win 1 13|b1b7 win 1 11',
  'K7/8/8/8/8/8/4Q3/k1q5 w - - 14 13':
    'draw 0 0 0 0|e2f2 draw 0 0|e2g2 draw 0 0|e2h2 draw 0 0|e2d3 draw 0 0|e2f3 draw 0 0|e2e4 draw 0 0|e2g4 draw 0 0|e2b5 draw 0 0|e2e5 draw 0 0|e2h5 draw 0 0|e2a6 draw 0 0|e2e6 draw 0 0|e2e7 draw 0 0|e2e8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|e2e1 win 1 17|e2f1 win 1 17|e2c2 win 1 17|e2e3 win 1 17|e2c4 win 1 17|e2d1 win 1 15|e2a2 win 1 15|e2b2 win 1 15|e2d2 win 1 15',
  'K7/8/8/8/8/8/5Q2/k1q5 b - - 15 13':
    'draw 0 0 0 0|c1b1 draw 0 0|c1d1 draw 0 0|c1h1 draw 0 0|c1b2 draw 0 0|c1c2 draw 0 0|c1a3 draw 0 0|c1c3 draw 0 0|c1c4 draw 0 0|c1g5 draw 0 0|c1c6 draw 0 0|c1h6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|a1b1 draw 0 0|c1c5 win 1 17|c1e1 win 1 15|c1f1 win 1 15|c1g1 win 1 15|c1e3 win 1 15|c1f4 win 1 15|c1d2 win 1 13',
  'K7/8/8/8/8/8/5Q2/kq6 w - - 16 14':
    'draw 0 0 0 0|f2d2 draw 0 0|f2e2 draw 0 0|f2g2 draw 0 0|f2h2 draw 0 0|f2e3 draw 0 0|f2f3 draw 0 0|f2g3 draw 0 0|f2d4 draw 0 0|f2f4 draw 0 0|f2h4 draw 0 0|f2c5 draw 0 0|f2b6 draw 0 0|f2f6 draw 0 0|f2a7 draw 0 0|f2f7 draw 0 0|f2f8 draw 0 0|a8a7 draw 0 0|f2e1 win 1 17|f2f1 win 1 17|f2g1 win 1 17|f2c2 win 1 17|f2b2 win 1 15|f2f5 win 1 15|f2a2 win 1 13',
  'K7/8/8/8/8/8/4Q3/kq6 b - - 17 14':
    'draw 0 0 0 0|b1c1 draw 0 0|b1g1 draw 0 0|b1h1 draw 0 0|b1a2 draw 0 0|b1b2 draw 0 0|b1c2 draw 0 0|b1b3 draw 0 0|b1b4 draw 0 0|b1f5 draw 0 0|b1b6 draw 0 0|b1g6 draw 0 0|b1h7 draw 0 0|b1e4 win 1 17|b1d1 win 1 15|b1e1 win 1 15|b1f1 win 1 15|b1d3 win 1 15|b1b5 win 1 13|b1b8 win 1 13|b1b7 win 1 11',
  'K7/8/8/8/8/8/4Q3/k1q5 w - - 18 15':
    'draw 0 0 0 0|e2f2 draw 0 0|e2g2 draw 0 0|e2h2 draw 0 0|e2d3 draw 0 0|e2f3 draw 0 0|e2e4 draw 0 0|e2g4 draw 0 0|e2b5 draw 0 0|e2e5 draw 0 0|e2h5 draw 0 0|e2a6 draw 0 0|e2e6 draw 0 0|e2e7 draw 0 0|e2e8 draw 0 0|a8a7 draw 0 0|a8b7 draw 0 0|a8b8 draw 0 0|e2e1 win 1 17|e2f1 win 1 17|e2c2 win 1 17|e2e3 win 1 17|e2c4 win 1 17|e2d1 win 1 15|e2a2 win 1 15|e2b2 win 1 15|e2d2 win 1 15',
  'K7/8/8/8/8/8/5Q2/k1q5 b - - 19 15':
    'draw 0 0 0 0|c1b1 draw 0 0|c1d1 draw 0 0|c1h1 draw 0 0|c1b2 draw 0 0|c1c2 draw 0 0|c1a3 draw 0 0|c1c3 draw 0 0|c1c4 draw 0 0|c1g5 draw 0 0|c1c6 draw 0 0|c1h6 draw 0 0|c1c7 draw 0 0|c1c8 draw 0 0|a1b1 draw 0 0|c1c5 win 1 17|c1e1 win 1 15|c1f1 win 1 15|c1g1 win 1 15|c1e3 win 1 15|c1f4 win 1 15|c1d2 win 1 13',
  '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1':
    'win 5 33 0 0|d1d5 loss -8 -32|d1a1 loss -4 -34|d1b1 loss -6 -36|d1d4 loss -12 -36|d1e1 loss -6 -40|d1d3 loss -14 -40|d1f1 loss -16 -42|d1g1 loss -16 -42|d1h1 loss -16 -42|b8a7 loss -16 -42|b8a8 loss -16 -42|d1c1 draw 0 0|d1d2 draw 0 0|d1d6 draw 0 0|d1d8 win 1 39|d1d7 win 1 35',
  '1K6/1P2k3/8/3R4/8/8/2r5/8 b - - 1 1':
    'loss -8 -32 0 0|e7e6 win 5 31|c2b2 win 7 29|c2c1 win 5 29|c2c3 win 5 29|c2c4 win 5 29|c2c6 win 5 29|e7f6 win 5 29|c2a2 win 7 27|c2e2 win 5 27|c2f2 win 5 27|c2g2 win 5 27|c2h2 win 5 27|e7f7 win 5 27|e7e8 win 5 25|e7f8 win 5 25|c2d2 win 1 13|c2c5 win 1 13|c2c7 win 1 11|c2c8 win 1 7',
  '1K6/1P2k3/8/3R4/8/8/1r6/8 w - - 2 2':
    'win 7 29 0 0|b8c7 loss -6 -28|b8a7 loss -6 -30|b8c8 loss -10 -36|d5a5 loss -6 -38|d5d4 loss -12 -38|d5c5 loss -8 -40|d5e5 loss -8 -40|d5f5 loss -8 -40|d5g5 loss -8 -40|d5h5 loss -8 -40|d5d1 loss -14 -40|d5d3 loss -14 -40|b8a8 loss -14 -42|d5d2 draw 0 0|d5b5 draw 0 0|d5d6 draw 0 0|d5d7 win 1 19|d5d8 win 1 19',
  '8/1PK1k3/8/3R4/8/8/1r6/8 b - - 3 2':
    'loss -6 -28 0 0|e7e6 win 3 27|b2b1 win 1 25|b2b3 win 1 25|b2b4 win 1 25|e7f6 win 1 25|e7f7 win 1 25|b2c2 win 5 23|e7e8 win 1 23|e7f8 win 1 23|b2b7 win 1 21|b2a2 win 1 19|b2e2 win 1 19|b2f2 win 1 19|b2g2 win 1 19|b2h2 win 1 19|b2d2 win 1 11|b2b5 win 1 11|b2b6 win 1 11',
  '8/1PK1k3/8/3R4/8/8/2r5/8 w - - 4 3':
    'win 5 23 0 0|c7b6 loss -4 -22|c7b8 loss -8 -32|d5c5 draw 0 0',
  '8/1P2k3/1K6/3R4/8/8/2r5/8 b - - 5 3':
    'loss -4 -22 0 0|c2b2 win 3 21|c2c1 win 1 19|c2a2 win 1 19|c2e2 win 1 19|c2f2 win 1 19|c2g2 win 1 19|c2h2 win 1 19|c2c3 win 1 19|c2c4 win 1 19|e7f6 win 1 19|e7f7 win 1 19|e7e6 win 1 17|c2d2 win 1 11|c2c5 win 1 11|c2c7 win 1 11|e7f8 win 1 11|c2c6 win 1 9|e7e8 win 1 9|c2c8 win 1 7',
  '8/1P2k3/1K6/3R4/8/8/1r6/8 w - - 6 4':
    'win 3 21 0 0|d5b5 loss -2 -20|b6a6 loss -6 -24|b6c6 loss -6 -24|b6c7 loss -6 -28|b6a7 loss -6 -30|b6a5 draw 0 0|b6c5 draw 0 0',
  '8/1P2k3/1K6/1R6/8/8/1r6/8 b - - 7 4':
    'loss -2 -20 0 0|b2b5 win 1 19|b2e2 win 1 17|b2f2 win 1 17|b2a2 win 1 15|b2c2 win 1 15|b2d2 win 1 15|b2g2 win 1 15|b2h2 win 1 15|e7e6 win 1 13|e7f6 win 1 13|b2b1 win 1 11|b2b3 win 1 11|b2b4 win 1 11|e7d6 win 1 11|e7d7 win 1 11|e7f7 win 1 11|e7d8 win 1 11|e7e8 win 1 11|e7f8 win 1 11',
  '8/1P2k3/1K6/1r6/8/8/8/8 w - - 0 5':
    'win 1 19 0 0|b6b5 loss -2 -18|b6a6 draw 0 0|b6c6 draw 0 0|b6a7 draw 0 0|b6c7 draw 0 0',
  '8/1P2k3/8/1K6/8/8/8/8 b - - 0 5':
    'loss -2 -18 0 0|e7f6 win 1 17|e7e6 win 1 15|e7f7 win 1 15|e7e8 win 1 15|e7f8 win 1 15|e7d6 win 1 13|e7d7 win 1 13|e7d8 win 1 11',
  '8/1P6/5k2/1K6/8/8/8/8 w - - 1 6':
    'win 1 17 0 0|b7b8q loss -16 -16|b5c4 loss -2 -16|b5c5 loss -2 -16|b5c6 loss -2 -16|b5b4 loss -2 -18|b5b6 loss -2 -18|b5a4 loss -2 -20|b5a5 loss -2 -20|b5a6 loss -2 -20|b7b8r loss -26 -26|b7b8b draw 0 0|b7b8n draw 0 0',
  '1Q6/8/5k2/1K6/8/8/8/8 b - - 0 6':
    'loss -16 -16 0 0|f6g5 win 15 15|f6f5 win 13 13|f6g6 win 13 13|f6f7 win 13 13|f6g7 win 13 13|f6e6 win 11 11|f6e7 win 9 9',
  '1Q6/8/8/1K4k1/8/8/8/8 w - - 1 7':
    'win 15 15 0 0|b8h2 loss -14 -14|b8g3 loss -14 -14|b8e5 loss -14 -14|b8d6 loss -14 -14|b8c7 loss -14 -14|b8d8 loss -14 -14|b8e8 loss -14 -14|b8f8 loss -14 -14|b8h8 loss -14 -14|b5c4 loss -14 -14|b5c5 loss -14 -14|b5c6 loss -14 -14|b8b6 loss -16 -16|b8a7 loss -16 -16|b8b7 loss -16 -16|b8a8 loss -16 -16|b8c8 loss -16 -16|b8g8 loss -16 -16|b5b4 loss -16 -16|b5b6 loss -16 -16|b5a4 loss -18 -18|b5a5 loss -18 -18|b5a6 loss -18 -18|b8f4 draw 0 0',
  '8/8/8/1K4k1/8/8/7Q/8 b - - 2 7':
    'loss -14 -14 0 0|g5g4 win 13 13|g5f5 win 13 13|g5g6 win 13 13|g5f6 win 11 11',
  '8/8/8/1K6/6k1/8/7Q/8 w - - 3 8':
    'win 13 13 0 0|b5c4 loss -12 -12|b5c5 loss -12 -12|h2h1 loss -14 -14|h2d2 loss -14 -14|h2e2 loss -14 -14|h2f2 loss -14 -14|h2g2 loss -14 -14|h2e5 loss -14 -14|h2d6 loss -14 -14|h2h6 loss -14 -14|h2h7 loss -14 -14|h2h8 loss -14 -14|b5b4 loss -14 -14|b5b6 loss -14 -14|b5c6 loss -14 -14|h2g1 loss -16 -16|h2a2 loss -16 -16|h2b2 loss -16 -16|h2c2 loss -16 -16|h2c7 loss -16 -16|h2b8 loss -16 -16|b5a4 loss -16 -16|b5a5 loss -16 -16|b5a6 loss -16 -16|h2g3 draw 0 0|h2h3 draw 0 0|h2f4 draw 0 0|h2h4 draw 0 0|h2h5 draw 0 0',
  '8/8/8/8/2K3k1/8/7Q/8 b - - 4 8': 'loss -12 -12 0 0|g4f3 win 11 11|g4f5 win 11 11|g4g5 win 11 11',
  '8/8/8/8/2K5/5k2/7Q/8 w - - 5 9':
    'win 11 11 0 0|h2h4 loss -10 -10|c4d3 loss -10 -10|c4d4 loss -10 -10|h2b2 loss -12 -12|h2c2 loss -12 -12|h2d2 loss -12 -12|h2h3 loss -12 -12|h2e5 loss -12 -12|h2h5 loss -12 -12|h2d6 loss -12 -12|h2h6 loss -12 -12|h2h7 loss -12 -12|h2h8 loss -12 -12|c4c5 loss -12 -12|c4d5 loss -12 -12|h2g1 loss -14 -14|h2h1 loss -14 -14|h2a2 loss -14 -14|h2c7 loss -14 -14|h2b8 loss -14 -14|c4b3 loss -14 -14|c4c3 loss -14 -14|c4b4 loss -14 -14|c4b5 loss -14 -14|h2e2 draw 0 0|h2f2 draw 0 0|h2g2 draw 0 0|h2g3 draw 0 0|h2f4 draw 0 0',
  '8/8/8/8/2K4Q/5k2/8/8 b - - 6 9': 'loss -10 -10 0 0|f3g2 win 9 9|f3e3 win 9 9|f3e2 win 7 7',
  '8/8/8/8/2K4Q/8/6k1/8 w - - 7 10':
    'win 9 9 0 0|h4g4 loss -8 -8|c4c3 loss -8 -8|c4d3 loss -8 -8|c4d4 loss -8 -8|h4d4 loss -10 -10|h4e4 loss -10 -10|h4f4 loss -10 -10|h4g5 loss -10 -10|h4f6 loss -10 -10|c4c5 loss -10 -10|c4d5 loss -10 -10|h4e1 loss -12 -12|h4h5 loss -12 -12|h4h6 loss -12 -12|h4e7 loss -12 -12|h4h7 loss -12 -12|h4d8 loss -12 -12|h4h8 loss -12 -12|c4b3 loss -12 -12|c4b4 loss -12 -12|c4b5 loss -12 -12|h4h1 draw 0 0|h4f2 draw 0 0|h4h2 draw 0 0|h4g3 draw 0 0|h4h3 draw 0 0',
  '8/8/8/8/2K3Q1/8/6k1/8 b - - 8 10':
    'loss -8 -8 0 0|g2f1 win 7 7|g2h1 win 7 7|g2h2 win 7 7|g2f2 win 5 5',
  '8/8/8/8/2K3Q1/8/8/5k2 w - - 9 11':
    'win 7 7 0 0|c4c3 loss -6 -6|c4d3 loss -6 -6|c4d4 loss -6 -6|g4g3 loss -8 -8|c4c5 loss -8 -8|c4d5 loss -8 -8|g4d1 loss -10 -10|g4f3 loss -10 -10|g4h3 loss -10 -10|g4d4 loss -10 -10|g4e4 loss -10 -10|g4f4 loss -10 -10|g4h4 loss -10 -10|g4f5 loss -10 -10|g4g5 loss -10 -10|g4h5 loss -10 -10|g4e6 loss -10 -10|g4g6 loss -10 -10|g4d7 loss -10 -10|g4g7 loss -10 -10|g4c8 loss -10 -10|g4g8 loss -10 -10|c4b3 loss -10 -10|c4b4 loss -10 -10|c4b5 loss -10 -10|g4g1 draw 0 0|g4e2 draw 0 0|g4g2 draw 0 0',
  '8/8/8/8/6Q1/2K5/8/5k2 b - - 10 11': 'loss -6 -6 0 0|f1f2 win 5 5|f1e1 win 3 3',
  '8/8/8/8/6Q1/2K5/5k2/8 w - - 11 12':
    'win 5 5 0 0|c3d2 loss -4 -4|c3d3 loss -4 -4|c3d4 loss -6 -6|g4h3 loss -8 -8|g4g5 loss -8 -8|c3b2 loss -8 -8|c3c2 loss -8 -8|c3b3 loss -8 -8|c3b4 loss -8 -8|c3c4 loss -8 -8|g4c4 loss -10 -10|g4d4 loss -10 -10|g4e4 loss -10 -10|g4f4 loss -10 -10|g4h4 loss -10 -10|g4f5 loss -10 -10|g4d1 loss -12 -12|g4a4 loss -12 -12|g4b4 loss -12 -12|g4h5 loss -12 -12|g4e6 loss -12 -12|g4g6 loss -12 -12|g4d7 loss -12 -12|g4g7 loss -12 -12|g4c8 loss -12 -12|g4g8 loss -12 -12|g4g1 draw 0 0|g4e2 draw 0 0|g4g2 draw 0 0|g4f3 draw 0 0|g4g3 draw 0 0',
  '8/8/8/8/6Q1/8/3K1k2/8 b - - 12 12': 'loss -4 -4 0 0|f2f1 win 3 3',
  '8/8/8/8/6Q1/8/3K4/5k2 w - - 13 13':
    'win 3 3 0 0|d2e3 loss -2 -2|g4e2 loss -6 -6|g4g5 loss -6 -6|g4g6 loss -6 -6|g4g7 loss -6 -6|g4g8 loss -6 -6|d2d1 loss -6 -6|d2c3 loss -6 -6|d2d3 loss -6 -6|g4d1 loss -8 -8|g4f3 loss -8 -8|g4h3 loss -8 -8|g4a4 loss -8 -8|g4b4 loss -8 -8|g4c4 loss -8 -8|g4d4 loss -8 -8|g4e4 loss -8 -8|g4f4 loss -8 -8|g4h4 loss -8 -8|g4f5 loss -8 -8|g4h5 loss -8 -8|g4e6 loss -8 -8|g4d7 loss -8 -8|g4c8 loss -8 -8|d2c1 loss -8 -8|d2c2 loss -8 -8|g4g3 draw 0 0|g4g1 draw 0 0|g4g2 draw 0 0',
  '8/8/8/8/6Q1/4K3/8/5k2 b - - 14 13': 'loss -2 -2 0 0|f1e1 win 1 1',
  '8/8/8/8/6Q1/4K3/8/4k3 w - - 15 14':
    'win 1 1 0 0|g4g1 loss -1 -|g4e2 loss -1 -|g4g2 loss -2 -2|g4e4 loss -2 -2|g4f5 loss -2 -2|g4h5 loss -2 -2|g4g3 loss -4 -4|g4h3 loss -4 -4|g4a4 loss -4 -4|g4b4 loss -4 -4|g4c4 loss -4 -4|g4d4 loss -4 -4|g4f4 loss -4 -4|g4h4 loss -4 -4|g4g5 loss -4 -4|g4e6 loss -4 -4|g4g6 loss -4 -4|g4d7 loss -4 -4|g4g7 loss -4 -4|g4c8 loss -4 -4|g4g8 loss -4 -4|e3d3 loss -6 -6|e3d4 loss -6 -6|e3f3 loss -8 -8|e3e4 loss -8 -8|e3f4 loss -12 -12|g4f3 draw 0 0|g4d1 draw 0 0',
};

/** The client asks with the move number reset to 1, so it is left out of the key. */
const answerKey = (fen: string): string => fen.split(' ').slice(0, 5).join(' ');

const BY_POSITION = new Map(Object.entries(ANSWERS).map(([fen, entry]) => [answerKey(fen), entry]));

const distance = (value: string): number | null => (value === '-' ? null : Number(value));

/** The recorded answer for `fen`, in the shape the API sends it. */
const rawAnswer = (fen: string): unknown => {
  const entry = BY_POSITION.get(answerKey(fen));
  if (entry === undefined) throw new Error(`No recorded tablebase answer for ${fen}`);
  const [head, ...moves] = entry.split('|');
  const [category, dtz, dtm, checkmate, stalemate] = head.split(' ');
  return {
    category,
    dtz: distance(dtz),
    dtm: distance(dtm),
    checkmate: checkmate === '1',
    stalemate: stalemate === '1',
    moves: moves.map((move) => {
      const [uci, moveCategory, moveDtz, moveDtm] = move.split(' ');
      return { uci, category: moveCategory, dtz: distance(moveDtz), dtm: distance(moveDtm) };
    }),
  };
};

/** Whether an answer was recorded for this position. */
export const hasRecordedAnswer = (fen: string): boolean => BY_POSITION.has(answerKey(fen));

/** The recorded answer for `fen`, parsed as the client does; throws when there is none. */
export const recordedResult = (fen: string): TablebaseResult => {
  const position: Chess | undefined = parsePosition(fen);
  const result = position && parseTablebaseResponse(rawAnswer(fen), position);
  if (!result) throw new Error(`Invalid recorded tablebase answer for ${fen}`);
  return result;
};

/** The recorded answer as the API's JSON, for a fake HTTP transport. */
export const recordedResponse = (fen: string): unknown => rawAnswer(fen);
