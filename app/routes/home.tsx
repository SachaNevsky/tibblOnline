// ./app/routes/home.tsx
import type { Route } from "./+types/home";
import { useState, useEffect } from 'react';

export function meta({ }: Route.MetaArgs) {
	return [
		{ title: "TIBBL Online" },
		{ name: "description", content: "TIBBL tangible programming online" }
	];
}

export function links() {
	return [
		{
			rel: "icon",
			href: "/tibblOnline/favicon.ico",
			type: "image/ico",
		},
	];
}

const GITHUB_BASE = 'https://raw.githubusercontent.com/armbennett/tangible-11ty/main';

const TILE_ROWS = [
	['play', 'playx', 'loop', 'endloop'],
	['thread1', 'thread2', 'thread3', 'delay'],
	['variable', 'random', 'add', 'subtract'],
	['if', 'else', 'endif'],
	['function', 'endfunction', 'functioncall']
];

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
	'random': { name: 'X = Random', command: 'x = random', rotatable: false },
	'thread1': { name: 'Thread 1', command: 'thread 1', rotatable: false },
	'thread2': { name: 'Thread 2', command: 'thread 2', rotatable: false },
	'thread3': { name: 'Thread 3', command: 'thread 3', rotatable: false },
	'variable': { name: 'X =', command: 'x =', rotatable: true, rotationValues: ['1', '2', '3', '4', '5', '6', '7', '8'] }
};

interface GridTile {
	type: string;
	rotation: number;
}

interface TangibleInstance {
	soundSets: Record<string, unknown>;
	threads: unknown[];
	codeThreads: unknown[][];
	parseTextAsJavascript: (code: string) => string;
	evalTile: (code: string, context: unknown) => boolean;
	playStart: (sound: unknown, list: unknown[]) => void;
	currThread: number;
}

declare global {
	interface Window {
		Tangible: new () => TangibleInstance;
		Howl: new (config: unknown) => { stop: () => void };
	}
}

const SOUND_SETS = [
	{ value: 'MusicLoops1', label: 'Music Loops 1' },
	{ value: 'Mystery', label: 'Mystery' },
	{ value: 'Numbers', label: 'Numbers' },
	{ value: 'Notifications', label: 'Notifications' },
	{ value: 'OdeToJoy', label: 'Ode to Joy' },
	{ value: 'FurElise', label: 'Für Elise' }
];

export default function Home() {
	const [grid, setGrid] = useState<(GridTile | null)[][]>(Array(7).fill(null).map(() => Array(5).fill(null)));
	const [draggedTile, setDraggedTile] = useState<{ type: string; fromGrid: boolean; gridPos?: { row: number; col: number } } | null>(null);
	const [tangibleInstance, setTangibleInstance] = useState<TangibleInstance | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRunning, setIsRunning] = useState(false);
	const [threadOutputs, setThreadOutputs] = useState<string[]>(['', '', '']);
	const [soundSets, setSoundSets] = useState<string[]>(['Numbers', 'Mystery', 'Notifications']);

	useEffect(() => {
		const loadScripts = async () => {
			try {
				const howlerScript = document.createElement('script');
				howlerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js';
				document.head.appendChild(howlerScript);

				await new Promise<void>((resolve) => {
					howlerScript.onload = () => resolve();
				});

				const response = await fetch(`${GITHUB_BASE}/assets/js/tangible.js`);
				const tangibleCode = await response.text();
				const modifiedCode = tangibleCode.replace('export default class Tangible', 'window.Tangible = class Tangible');
				const script = document.createElement('script');
				script.textContent = modifiedCode;
				document.head.appendChild(script);

				setIsLoading(false);
			} catch (error) {
				console.error('Error loading scripts:', error);
			}
		};

		loadScripts();
	}, []);

	const handleDragStart = (e: React.DragEvent, tile: string, fromGrid = false, gridPos?: { row: number; col: number }) => {
		setDraggedTile({ type: tile, fromGrid, gridPos });
		e.dataTransfer.effectAllowed = 'copy';
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	};

	const handleDrop = (e: React.DragEvent, rowIdx: number, colIdx: number) => {
		e.preventDefault();
		e.stopPropagation();
		if (draggedTile) {
			const newGrid = grid.map(row => [...row]);

			// If dragging from grid, remove from original position
			if (draggedTile.fromGrid && draggedTile.gridPos) {
				const originalTile = grid[draggedTile.gridPos.row][draggedTile.gridPos.col];
				newGrid[draggedTile.gridPos.row][draggedTile.gridPos.col] = null;
				// Place tile at new position (overwrite existing), preserving rotation
				newGrid[rowIdx][colIdx] = originalTile;
			} else {
				// New tile from palette, start with rotation 0
				newGrid[rowIdx][colIdx] = { type: draggedTile.type, rotation: 0 };
			}

			setGrid(newGrid);
			setDraggedTile(null);
		}
	};

	const handleDropOnPalette = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (draggedTile && draggedTile.fromGrid && draggedTile.gridPos) {
			const newGrid = grid.map(row => [...row]);
			newGrid[draggedTile.gridPos.row][draggedTile.gridPos.col] = null;
			setGrid(newGrid);
			setDraggedTile(null);
		}
	};

	const handleRotateTile = (rowIdx: number, colIdx: number) => {
		const tile = grid[rowIdx][colIdx];
		if (tile && TILE_INFO[tile.type].rotatable) {
			const newGrid = grid.map(row => [...row]);
			const maxRotation = TILE_INFO[tile.type].rotationValues?.length || 8;
			newGrid[rowIdx][colIdx] = {
				...tile,
				rotation: (tile.rotation + 1) % maxRotation
			};
			setGrid(newGrid);
		}
	};

	const getTileLabel = (tile: GridTile): string => {
		const info = TILE_INFO[tile.type];
		if (!info.rotatable) {
			return info.name;
		}

		const rotationValue = info.rotationValues?.[tile.rotation] || '1';

		switch (tile.type) {
			case 'play':
				return `Play ${rotationValue}`;
			case 'loop':
				return `Loop ${rotationValue} Times`;
			case 'delay':
				return `Delay ${rotationValue}`;
			case 'variable':
				return `X = ${rotationValue}`;
			case 'if':
				return `If X < ${rotationValue}`;
			default:
				return info.name;
		}
	};

	const getTileCommand = (tile: GridTile): string => {
		const info = TILE_INFO[tile.type];
		if (!info.rotatable) {
			return info.command;
		}

		const rotationValue = info.rotationValues?.[tile.rotation] || '1';

		switch (tile.type) {
			case 'play':
				return `play ${rotationValue}`;
			case 'loop':
				return `loop ${rotationValue} times`;
			case 'delay':
				return `delay ${rotationValue}`;
			case 'variable':
				return `x = ${rotationValue}`;
			case 'if':
				return `if x < ${rotationValue}`;
			default:
				return info.command;
		}
	};

	const generateCode = () => {
		const threads: string[][] = [[], [], []];
		let currentThread = 0;

		for (let row = 0; row < grid.length; row++) {
			for (let col = 0; col < grid[row].length; col++) {
				const tile = grid[row][col];
				if (tile) {
					const command = getTileCommand(tile);
					if (tile.type === 'thread1') {
						currentThread = 0;
					} else if (tile.type === 'thread2') {
						currentThread = 1;
					} else if (tile.type === 'thread3') {
						currentThread = 2;
					}
					threads[currentThread].push(command);
				}
			}
		}

		return threads;
	};

	const preloadsWithGitHub = (instance: TangibleInstance, soundSet: string, t: number) => {
		const thread = new window.Howl({
			src: [`${GITHUB_BASE}/assets/sound/${soundSet}.mp3`],
			volume: 0.2,
			sprite: instance.soundSets[soundSet]
		});
		instance.threads[t] = thread;
	};

	const handleSoundSetChange = (threadIndex: number, soundSet: string) => {
		const newSoundSets = [...soundSets];
		newSoundSets[threadIndex] = soundSet;
		setSoundSets(newSoundSets);

		if (tangibleInstance) {
			preloadsWithGitHub(tangibleInstance, soundSet, threadIndex);
		}
	};

	const runCode = () => {
		if (!window.Tangible) {
			return;
		}

		try {
			const threads = generateCode();
			const hasCode = threads.some(thread => thread.length > 0);

			if (!hasCode) {
				setThreadOutputs(['', '', '']);
				return;
			}

			setIsRunning(true);
			setThreadOutputs(threads.map(thread => thread.join('\n')));

			if (!tangibleInstance) {
				const instance = new window.Tangible();
				preloadsWithGitHub(instance, soundSets[0], 0);
				preloadsWithGitHub(instance, soundSets[1], 1);
				preloadsWithGitHub(instance, soundSets[2], 2);
				setTangibleInstance(instance);

				setTimeout(() => {
					const fullCode = threads.flat().join('\n');
					const parsedJS = instance.parseTextAsJavascript(fullCode);
					instance.evalTile(parsedJS, instance);

					let longestDuration = 0;
					for (let i = 0; i < instance.codeThreads.length; i++) {
						if (instance.codeThreads[i].length > 0) {
							instance.playStart(instance.threads[i], instance.codeThreads[i]);
							longestDuration = Math.max(longestDuration, instance.codeThreads[i].length);
						}
					}

					setTimeout(() => {
						setIsRunning(false);
					}, longestDuration * 1000);
				}, 500);
			} else {
				const fullCode = threads.flat().join('\n');
				const parsedJS = tangibleInstance.parseTextAsJavascript(fullCode);
				tangibleInstance.evalTile(parsedJS, tangibleInstance);

				let longestDuration = 0;
				for (let i = 0; i < tangibleInstance.codeThreads.length; i++) {
					if (tangibleInstance.codeThreads[i].length > 0) {
						tangibleInstance.playStart(tangibleInstance.threads[i], tangibleInstance.codeThreads[i]);
						longestDuration = Math.max(longestDuration, tangibleInstance.codeThreads[i].length);
					}
				}

				setTimeout(() => {
					setIsRunning(false);
				}, longestDuration * 1000);
			}
		} catch (error) {
			const err = error as Error;
			setThreadOutputs([`Error: ${err.message}`, '', '']);
			setIsRunning(false);
			console.error(error);
		}
	};

	const stopCode = () => {
		if (tangibleInstance) {
			for (let i = 0; i < tangibleInstance.threads.length; i++) {
				const thread = tangibleInstance.threads[i] as { stop: () => void } | undefined;
				if (thread) {
					thread.stop();
				}
			}
			tangibleInstance.codeThreads = [[], [], []];
			setIsRunning(false);
		}
	};

	const clearGrid = () => {
		setGrid(Array(7).fill(null).map(() => Array(5).fill(null)));
		setThreadOutputs(['', '', '']);
		setIsRunning(false);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
				<div className="text-xl">Loading TIBBL system...</div>
			</div>
		);
	}

	const hasOutput = threadOutputs.some(output => output.length > 0);

	return (
		<div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
			<div className="w-full h-[90vh] flex flex-col">
				<div className="grid grid-cols-4 items-center mb-6 shrink-0 gap-8">
					<h1 className="inline-flex items-center gap-2 text-4xl font-bold">
						<img
							src="tibbl-logo.png"
							alt="Tibbl logo"
							className="h-[1em] w-auto"
						/>
						Online
					</h1>

					<div className="col-start-4 flex items-center gap-4 w-full">
						<div className="flex flex-col w-full">
							<label className="text-white font-bold mb-1">Thread 1:</label>
							<select
								value={soundSets[0]}
								onChange={(e) => handleSoundSetChange(0, e.target.value)}
								className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
							>
								{SOUND_SETS.map(set => (
									<option key={set.value} value={set.value}>{set.label}</option>
								))}
							</select>
						</div>

						<div className="flex flex-col w-full">
							<label className="text-white font-bold mb-1">Thread 2:</label>
							<select
								value={soundSets[1]}
								onChange={(e) => handleSoundSetChange(1, e.target.value)}
								className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
							>
								{SOUND_SETS.map(set => (
									<option key={set.value} value={set.value}>{set.label}</option>
								))}
							</select>
						</div>

						<div className="flex flex-col w-full">
							<label className="text-white font-bold mb-1">Thread 3:</label>
							<select
								value={soundSets[2]}
								onChange={(e) => handleSoundSetChange(2, e.target.value)}
								className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
							>
								{SOUND_SETS.map(set => (
									<option key={set.value} value={set.value}>{set.label}</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
					{/* Tile Palette */}
					<div className="lg:col-span-1 flex flex-col min-h-0">
						<div
							className="bg-gray-800 p-4 rounded-lg space-y-3 overflow-auto h-full"
							onDrop={handleDropOnPalette}
							onDragOver={(e) => e.preventDefault()}
						>
							{TILE_ROWS.map((row, rowIdx) => (
								<div key={rowIdx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
									{row.map((tile) => (
										<div
											key={tile}
											draggable
											onDragStart={(e) => handleDragStart(e, tile)}
											className="cursor-grab active:cursor-grabbing bg-gray-700 rounded p-2 hover:bg-gray-600 transition select-none"
										>
											<img
												src={`${GITHUB_BASE}/assets/demo-files/tiles/${tile}.png`}
												alt={tile}
												className="w-full h-auto mb-1 pointer-events-none"
											/>
											<div className="text-xs sm:text-xs text-center text-gray-300">{TILE_INFO[tile].name}</div>
										</div>
									))}
								</div>
							))}
						</div>
					</div>

					{/* Programming Grid */}
					<div className="lg:col-span-2 flex flex-col min-h-0">
						<div className="bg-gray-800 p-4 rounded-lg h-full flex items-center justify-center">
							<div className="grid grid-cols-5 gap-2 h-full w-auto" style={{ aspectRatio: '5/7' }}>
								{grid.map((row, rowIdx) => (
									row.map((cell, colIdx) => (
										<div
											key={`${rowIdx}-${colIdx}`}
											onDragOver={handleDragOver}
											onDrop={(e) => handleDrop(e, rowIdx, colIdx)}
											onClick={() => cell && handleRotateTile(rowIdx, colIdx)}
											className={`border-2 border-dashed rounded flex flex-col items-center justify-center aspect-square ${cell
												? `border-green-500 bg-gray-700 ${TILE_INFO[cell.type].rotatable ? 'cursor-pointer hover:bg-gray-600' : 'cursor-move'}`
												: 'border-gray-600 bg-gray-750'
												}`}
										>
											{cell && (
												<>
													<div
														className="w-full h-full flex items-center justify-center p-1 select-none flex-col"
														draggable
														onDragStart={(e) => {
															e.stopPropagation();
															handleDragStart(e, cell.type, true, { row: rowIdx, col: colIdx });
														}}
													>
														<img
															src={`${GITHUB_BASE}/assets/demo-files/tiles/${cell.type}.png`}
															alt={cell.type}
															className="w-full h-full object-contain pointer-events-none"
														/>
														<div className="text-xs sm:text-xs text-center text-gray-300">{getTileLabel(cell)}</div>
													</div>
												</>
											)}
										</div>
									))
								))}
							</div>
						</div>
					</div>

					{/* Code and controls */}
					<div className="lg:col-span-1 flex flex-col min-h-0">
						<div className="flex flex-col gap-2 mb-4 shrink-0">
							<button
								onClick={runCode}
								className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition font-semibold"
							>
								Run Code
							</button>
							<button
								onClick={stopCode}
								className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition font-semibold"
							>
								Stop
							</button>
							<button
								onClick={clearGrid}
								className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
							>
								Clear Grid
							</button>
						</div>

						{/* Output */}
						{hasOutput ? (
							<div className="bg-gray-800 p-4 rounded-lg flex-1 overflow-auto min-h-0">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-xl font-semibold">Code:</h3>
									{isRunning && (
										<span className="text-sm text-green-400 font-semibold">Running...</span>
									)}
								</div>
								{threadOutputs.map((output, idx) => (
									<div key={idx} className="pb-4">
										{output && (
											<pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
												{output}
											</pre>
										)}
									</div>
								))}
							</div>
						) : (
							<div className="bg-gray-800 p-4 rounded-lg flex-1 overflow-auto min-h-0" />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}