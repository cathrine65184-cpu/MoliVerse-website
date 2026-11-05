/**
 * Layout of the 2D story board: stops are spread evenly from left to right and alternate between two rows,
 * so they never overlap (up to 7 stops on a phone) and the title above / story bubble below stay clear.
 * Positions are percentages of the board.
 */
export type StopSpot = { left: number; top: number };

export const BOARD_ROWS = { upper: 42, lower: 64 } as const;
export const MAX_CLEAR_STOPS = 7;

export function layoutStops(count: number): StopSpot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ left: 50, top: 54 }];
  return Array.from({ length: count }, (_, index) => ({
    left: 14 + (index * 72) / (count - 1),
    top: index % 2 === 0 ? BOARD_ROWS.lower : BOARD_ROWS.upper,
  }));
}
