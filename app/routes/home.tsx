// ./app/routes/home.tsx
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
	return [
		{ title: "TIBBL Online" },
		{ name: "description", content: "TIBBL tangible programming online" },
	];
}

import { useState, useEffect } from 'react';

const GITHUB_BASE = 'https://raw.githubusercontent.com/armbennett/tangible-11ty/main';

const TILE_ROWS = [
	['play', 'playx', 'loop', 'endloop'],
	['thread1', 'thread2', 'thread3', 'delay'],
	['variable', 'random', 'add', 'subtract'],
	['if', 'else', 'endif'],
	['function', 'endfunction', 'functioncall']
];

const TILE_COMMANDS: Record<string, string> = {
	'add': 'x = x + 1',
	'subtract': 'x = x - 1',
	'delay': 'delay 1',
	'else': 'else',
	'endfunction': 'end function',
	'endif': 'end if',
	'endloop': 'end loop',
	'function': 'function',
	'functioncall': 'call function',
	'if': 'if x < 5',
	'loop': 'loop 3 times',
	'play': 'play 1',
	'playx': 'play x',
	'random': 'x = random',
	'thread1': 'thread 1',
	'thread2': 'thread 2',
	'thread3': 'thread 3',
	'variable': 'x = 1'
};

interface TangibleInstance {
	soundSets: Record<string, string>;
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
		Howl: unknown;
	}
}

export default function Home() {
	const [grid, setGrid] = useState<(string | null)[][]>(Array(6).fill(null).map(() => Array(5).fill(null)));
	const [draggedTile, setDraggedTile] = useState<string | null>(null);
	const [tangibleInstance, setTangibleInstance] = useState<TangibleInstance | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRunning, setIsRunning] = useState(false);
	const [threadOutputs, setThreadOutputs] = useState<string[]>(['', '', '']);

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

	const handleDragStart = (e: React.DragEvent, tile: string) => {
		setDraggedTile(tile);
		e.dataTransfer.effectAllowed = 'copy';
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	};

	const handleDrop = (e: React.DragEvent, rowIdx: number, colIdx: number) => {
		e.preventDefault();
		if (draggedTile) {
			const newGrid = grid.map(row => [...row]);
			newGrid[rowIdx][colIdx] = draggedTile;
			setGrid(newGrid);
			setDraggedTile(null);
		}
	};

	const handleClearCell = (rowIdx: number, colIdx: number) => {
		const newGrid = grid.map(row => [...row]);
		newGrid[rowIdx][colIdx] = null;
		setGrid(newGrid);
	};

	const generateCode = () => {
		const threads: string[][] = [[], [], []];
		let currentThread = 0;

		for (let row = 0; row < grid.length; row++) {
			for (let col = 0; col < grid[row].length; col++) {
				const tile = grid[row][col];
				if (tile) {
					const command = TILE_COMMANDS[tile];
					if (tile === 'thread1') {
						currentThread = 0;
					} else if (tile === 'thread2') {
						currentThread = 1;
					} else if (tile === 'thread3') {
						currentThread = 2;
					}
					threads[currentThread].push(command);
				}
			}
		}

		return threads;
	};

	const preloadsWithGitHub = (instance: TangibleInstance, soundSet: string, t: number) => {
		const thread = new (window.Howl as new (config: unknown) => { stop: () => void })({
			src: [`${GITHUB_BASE}/assets/sound/${soundSet}.mp3`],
			volume: 0.2,
			sprite: instance.soundSets[soundSet]
		});
		instance.threads[t] = thread;
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
				preloadsWithGitHub(instance, "LowAndFX", 0);
				preloadsWithGitHub(instance, "High", 1);
				preloadsWithGitHub(instance, "Drums", 2);
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
		setGrid(Array(6).fill(null).map(() => Array(5).fill(null)));
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
				<h1 className="inline-flex items-center gap-2 text-4xl font-bold mb-6 shrink-0">
					<img
						src="tibbl-logo.png"
						alt="Tibbl logo"
						className="h-[1em] w-auto"
					/>
					Online
				</h1>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
					{/* Tile Palette */}
					<div className="lg:col-span-1 flex flex-col min-h-0">
						<div className="bg-gray-800 p-4 rounded-lg space-y-3 overflow-auto h-full">
							{TILE_ROWS.map((row, rowIdx) => (
								<div key={rowIdx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
									{row.map((tile) => (
										<div
											key={tile}
											draggable
											onDragStart={(e) => handleDragStart(e, tile)}
											className="cursor-grab active:cursor-grabbing bg-gray-700 rounded p-2 hover:bg-gray-600 transition"
										>
											<img
												src={`${GITHUB_BASE}/assets/demo-files/tiles/${tile}.png`}
												alt={tile}
												className="w-full h-auto mb-1"
											/>
											<div className="text-xs sm:text-xs text-center text-gray-300">{tile}</div>
										</div>
									))}
								</div>
							))}
						</div>
					</div>

					{/* Programming Grid */}
					<div className="lg:col-span-2 flex flex-col min-h-0">
						<div className="bg-gray-800 p-4 rounded-lg h-full flex items-center justify-center">
							<div className="grid grid-cols-5 gap-2 h-full w-auto" style={{ aspectRatio: '5/6' }}>
								{grid.map((row, rowIdx) => (
									row.map((cell, colIdx) => (
										<div
											key={`${rowIdx}-${colIdx}`}
											onDragOver={handleDragOver}
											onDrop={(e) => handleDrop(e, rowIdx, colIdx)}
											onClick={() => cell && handleClearCell(rowIdx, colIdx)}
											className={`border-2 border-dashed rounded flex items-center justify-center aspect-square ${cell
												? 'border-green-500 bg-gray-700 cursor-pointer hover:bg-gray-600'
												: 'border-gray-600 bg-gray-750'
												}`}
										>
											{cell && (
												<img
													src={`${GITHUB_BASE}/assets/demo-files/tiles/${cell}.png`}
													alt={cell}
													className="w-full h-full object-contain p-1"
												/>
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
								<div className="grid grid-cols-3 gap-4">
									{threadOutputs.map((output, idx) => (
										<div key={idx}>
											{output && (
												<pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
													{output}
												</pre>
											)}
										</div>
									))}
								</div>
							</div>
						) : (<div className="bg-gray-800 p-4 rounded-lg flex-1 overflow-auto min-h-0">
						</div>)}
					</div>
				</div>
			</div>
		</div>
	);
}