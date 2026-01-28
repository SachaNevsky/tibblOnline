// ./app/routes/reverse.tsx
import type { Route } from "./+types/reverse";
import { useState } from 'react';

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Code to Visual - TIBBL Online" },
        { name: "description", content: "Convert TIBBL code to visual representation" }
    ];
}

const GITHUB_BASE = 'https://raw.githubusercontent.com/armbennett/tangible-11ty/main';

interface TileInfo {
    name: string;
    command: string;
    rotatable: boolean;
    rotationValues?: string[];
}

const TILE_INFO: Record<string, TileInfo> = {
    'add': { name: 'X = X + 1', command: 'x = x + 1', rotatable: false },
    'subtract': { name: 'X = X - 1', command: 'x = x - 1', rotatable: false },
    'delay': { name: 'Delay', command: 'delay', rotatable: true, rotationValues: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    'else': { name: 'Else', command: 'else', rotatable: false },
    'endfunction': { name: 'End Function', command: 'end function', rotatable: false },
    'endif': { name: 'End If', command: 'end if', rotatable: false },
    'endloop': { name: 'End Loop', command: 'end loop', rotatable: false },
    'function': { name: 'Function', command: 'function', rotatable: false },
    'functioncall': { name: 'Call Function', command: 'call function', rotatable: false },
    'if': { name: 'If X <', command: 'if x <', rotatable: true, rotationValues: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    'loop': { name: 'Loop', command: 'loop', rotatable: true, rotationValues: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    'play': { name: 'Play', command: 'play', rotatable: true, rotationValues: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    'playx': { name: 'Play X', command: 'play x', rotatable: false },
    'random': { name: 'X=Random', command: 'x = random', rotatable: false },
    'thread1': { name: 'Thread 1', command: 'thread 1', rotatable: false },
    'thread2': { name: 'Thread 2', command: 'thread 2', rotatable: false },
    'thread3': { name: 'Thread 3', command: 'thread 3', rotatable: false },
    'variable': { name: 'X =', command: 'x =', rotatable: true, rotationValues: ['1', '2', '3', '4', '5', '6', '7', '8'] }
};

interface GridTile {
    type: string;
    rotation: number;
}

interface ParseResult {
    success: boolean;
    grid: (GridTile | null)[][];
    error?: string;
}

/**
 * Parses TIBBL code text and converts it into a 5x7 grid of tiles.
 * 
 * @param codeText - Multi-line string containing TIBBL code commands
 * @returns A result object containing the grid and success status, or an error message
 * 
 * @example
 * ```typescript
 * const result = parseCodeToGrid("thread 1\nplay 1\nthread 2\nplay 2");
 * if (result.success) {
 *   console.log(result.grid); // 5x7 grid with tiles placed
 * } else {
 *   console.error(result.error); // Error message if parsing failed
 * }
 * ```
 */
function parseCodeToGrid(codeText: string): ParseResult {
    const grid: (GridTile | null)[][] = Array(7).fill(null).map(() => Array(5).fill(null));

    if (!codeText.trim()) {
        grid[0][0] = { type: 'thread1', rotation: 0 };
        grid[0][1] = { type: 'loop', rotation: 2 };
        grid[0][2] = { type: 'play', rotation: 1 };
        grid[0][3] = { type: 'endloop', rotation: 0 };
        return { success: true, grid };
    }

    const lines = codeText.toLowerCase().trim().split('\n').filter(line => line.trim());

    const parsedLines: { tile: GridTile | null; isThread: boolean; lineNum: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const result = parseLine(line);
        if (!result.success) {
            return { success: false, grid, error: `Line ${i + 1}: ${result.error}` };
        }

        const isThread = result.tile?.type === 'thread1' ||
            result.tile?.type === 'thread2' ||
            result.tile?.type === 'thread3';

        parsedLines.push({
            tile: result.tile || null,
            isThread,
            lineNum: i + 1
        });
    }

    const totalTiles = parsedLines.filter(p => p.tile !== null).length;
    const maxGridCapacity = 7 * 5;

    const hasThreads = parsedLines.some(p => p.isThread);

    let useThreadRows = false;
    if (hasThreads && totalTiles <= maxGridCapacity) {
        let simulatedRow = 0;
        let simulatedCol = 0;

        for (let i = 0; i < parsedLines.length; i++) {
            const parsed = parsedLines[i];
            if (!parsed.tile) continue;

            if (parsed.isThread && simulatedCol > 0) {
                simulatedRow++;
                simulatedCol = 0;
            }

            if (simulatedRow >= 7) {
                break;
            }

            if (simulatedCol >= 5) {
                simulatedRow++;
                simulatedCol = 0;
            }

            if (simulatedRow < 7) {
                simulatedCol++;
            }
        }

        useThreadRows = simulatedRow < 7;
    }

    let row = 0;
    let col = 0;

    for (let i = 0; i < parsedLines.length; i++) {
        const parsed = parsedLines[i];

        if (!parsed.tile) continue;

        if (useThreadRows && parsed.isThread && col > 0) {
            row++;
            col = 0;
        }

        if (row >= 7) {
            return { success: false, grid, error: 'Code exceeds grid size (7 rows maximum)' };
        }

        if (col >= 5) {
            row++;
            col = 0;

            if (row >= 7) {
                return { success: false, grid, error: 'Code exceeds grid size (7 rows maximum)' };
            }
        }

        grid[row][col] = parsed.tile;
        col++;
    }

    return { success: true, grid };
}

interface ParseLineResult {
    success: boolean;
    tile?: GridTile;
    error?: string;
}

/**
 * Parses a single line of TIBBL code and converts it to a grid tile.
 * 
 * @param line - A lowercase string containing a single TIBBL command
 * @returns A result object containing either a tile or an error message
 * 
 * @example
 * ```typescript
 * parseLine("play 3") // Returns { success: true, tile: { type: 'play', rotation: 2 } }
 * ```
 */
function parseLine(line: string): ParseLineResult {
    const parts = line.split(/\s+/);

    if (parts[0] === 'thread') {
        if (parts.length < 2) {
            return { success: false, error: 'Thread command requires a thread number (1, 2, or 3)' };
        }
        const threadNum = parts[1];
        if (threadNum === '1') {
            return { success: true, tile: { type: 'thread1', rotation: 0 } };
        } else if (threadNum === '2') {
            return { success: true, tile: { type: 'thread2', rotation: 0 } };
        } else if (threadNum === '3') {
            return { success: true, tile: { type: 'thread3', rotation: 0 } };
        } else {
            return { success: false, error: 'Thread number must be 1, 2, or 3' };
        }
    }

    if (parts[0] === 'loop') {
        if (parts.length < 2) {
            return { success: false, error: 'Loop command requires a number (1-8)' };
        }
        const times = parseInt(parts[1]);
        if (isNaN(times) || times < 1 || times > 8) {
            return { success: false, error: 'Loop number must be between 1 and 8' };
        }
        return { success: true, tile: { type: 'loop', rotation: times - 1 } };
    }

    if (parts[0] === 'end' && parts[1] === 'loop') {
        return { success: true, tile: { type: 'endloop', rotation: 0 } };
    }

    if (parts[0] === 'play') {
        if (parts.length < 2) {
            return { success: false, error: 'Play command requires a note number (1-8) or x' };
        }
        if (parts[1] === 'x') {
            return { success: true, tile: { type: 'playx', rotation: 0 } };
        }
        const note = parseInt(parts[1]);
        if (isNaN(note) || note < 1 || note > 8) {
            return { success: false, error: 'Play note must be between 1 and 8, or x' };
        }
        return { success: true, tile: { type: 'play', rotation: note - 1 } };
    }

    if (parts[0] === 'delay') {
        if (parts.length < 2) {
            return { success: false, error: 'Delay command requires a duration (1-8)' };
        }
        const duration = parseInt(parts[1]);
        if (isNaN(duration) || duration < 1 || duration > 8) {
            return { success: false, error: 'Delay duration must be between 1 and 8' };
        }
        return { success: true, tile: { type: 'delay', rotation: duration - 1 } };
    }

    if (parts[0] === 'x') {
        if (parts.length < 2 || parts[1] !== '=') {
            return { success: false, error: 'Variable command must be in format "x = ..." ' };
        }

        if (parts.length >= 3 && parts[2] === 'random') {
            return { success: true, tile: { type: 'random', rotation: 0 } };
        }

        if (parts.length >= 5 && parts[2] === 'x') {
            if (parts[3] === '+' && parts[4] === '1') {
                return { success: true, tile: { type: 'add', rotation: 0 } };
            } else if (parts[3] === '-' && parts[4] === '1') {
                return { success: true, tile: { type: 'subtract', rotation: 0 } };
            } else {
                return { success: false, error: 'Variable arithmetic must be "x = x + 1" or "x = x - 1"' };
            }
        }

        if (parts.length >= 3) {
            const value = parseInt(parts[2]);
            if (isNaN(value) || value < 1 || value > 8) {
                return { success: false, error: 'Variable value must be between 1 and 8' };
            }
            return { success: true, tile: { type: 'variable', rotation: value - 1 } };
        }

        return { success: false, error: 'Invalid variable command' };
    }

    if (parts[0] === 'if') {
        if (parts.length < 4 || parts[1] !== 'x' || parts[2] !== '<') {
            return { success: false, error: 'If command must be in format "if x < number"' };
        }
        const condition = parseInt(parts[3]);
        if (isNaN(condition) || condition < 1 || condition > 8) {
            return { success: false, error: 'If condition must be between 1 and 8' };
        }
        return { success: true, tile: { type: 'if', rotation: condition - 1 } };
    }

    if (parts[0] === 'else') {
        return { success: true, tile: { type: 'else', rotation: 0 } };
    }

    if (parts[0] === 'end' && parts[1] === 'if') {
        return { success: true, tile: { type: 'endif', rotation: 0 } };
    }

    if (parts[0] === 'function') {
        return { success: true, tile: { type: 'function', rotation: 0 } };
    }

    if (parts[0] === 'end' && parts[1] === 'function') {
        return { success: true, tile: { type: 'endfunction', rotation: 0 } };
    }

    if (parts[0] === 'call' && parts[1] === 'function') {
        return { success: true, tile: { type: 'functioncall', rotation: 0 } };
    }

    return { success: false, error: `Unknown command: "${line}"` };
}

/**
 * Generates a human-readable label for a tile to display in the UI.
 * 
 * @param tile - The grid tile containing type and rotation information
 * @returns A formatted string label for the tile
 * 
 * @example
 * ```typescript
 * getTileLabel({ type: 'play', rotation: 0 }) // Returns "Play 1"
 * getTileLabel({ type: 'thread1', rotation: 0 }) // Returns "Thread 1"
 * ```
 */
function getTileLabel(tile: GridTile): string {
    const info = TILE_INFO[tile.type];
    if (!info.rotatable) {
        return info.name;
    }

    const value = (tile.rotation % 8) + 1;
    return `${info.name} ${value}`;
}

export default function Reverse() {
    const [codeText, setCodeText] = useState('');
    const [grid, setGrid] = useState<(GridTile | null)[][]>(Array(7).fill(null).map(() => Array(5).fill(null)));
    const [error, setError] = useState<string | null>(null);

    /**
     * Handles the generate button click event to convert code text into visual tiles.
     * 
     * The function updates the `grid` state with the user input, and sets the `codeText` in case of an empty input.
     */
    const handleGenerate = () => {
        const result = parseCodeToGrid(codeText);

        if (!codeText) {
            setCodeText("thread 1\nloop 3 times\nplay 2\nend loop");
        }

        if (result.success) {
            setGrid(result.grid);
            setError(null);
        } else {
            setError(result.error || 'Unknown error');
        }
    };

    /**
     * Handles the clear button click event to reset the application state.
     * 
     * The function updates the `codeText` state to an empty string, the `grid` state to a grid of null.
     */
    const handleClear = () => {
        setCodeText('');
        setGrid(Array(7).fill(null).map(() => Array(5).fill(null)));
        setError(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-2/3 mx-auto">
                <div className="flex gap-2">
                    <h1 className="inline-flex items-center gap-2 text-2xl sm:text-3xl lg:text-4xl font-bold">
                        <img
                            src="tibbl-logo.png"
                            alt="Tibbl logo"
                            className="h-[1em] w-auto"
                        />
                        Reverse

                    </h1>
                    <a href="/tibblOnline/" className="pl-4 inline-flex items-center gap-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-500">Go to main</a>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="flex flex-col">
                        <label htmlFor="codeInput" className="text-lg font-semibold my-4">
                            Enter Code:
                        </label>
                        <textarea
                            id="codeInput"
                            value={codeText}
                            onChange={(e) => setCodeText(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:border-blue-500 min-h-75"
                            placeholder={`Example:\n\nthread 1\nloop 3 times\nplay 2\nend loop`}
                        />

                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={handleGenerate}
                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-semibold"
                            >
                                Generate Visual
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition"
                            >
                                Clear
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                                <p className="text-red-200 font-semibold">Error:</p>
                                <p className="text-red-300">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Visual Grid Section */}
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold my-4">Visual Representation:</h2>
                        <div className="bg-gray-800 p-6 rounded-lg flex-1 flex items-center justify-center">
                            <div className="grid grid-cols-5 gap-2 w-9/10" style={{ aspectRatio: '5/7' }}>
                                {grid.map((row, rowIdx) => (
                                    row.map((cell, colIdx) => (
                                        <div
                                            key={`${rowIdx}-${colIdx}`}
                                            className={`border border-dashed rounded flex flex-col items-center justify-center aspect-square ${cell
                                                ? 'border-green-500 bg-gray-700'
                                                : 'border-gray-600 bg-gray-750'
                                                }`}
                                        >
                                            {cell && (
                                                <div className="w-full h-full flex items-center justify-center p-1 select-none flex-col">
                                                    <img
                                                        src={`${GITHUB_BASE}/assets/demo-files/tiles/${cell.type}.png`}
                                                        alt={`${cell.type} tile`}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                    <div className="text-xs text-center text-gray-300 px-1">
                                                        {getTileLabel(cell)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}