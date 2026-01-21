import fs from "fs";
import path from "path";
import https from "https";
import { CreateChartID } from "../../util.js";

interface SekaiMusic {
	id: number;
	title: string;
	composer?: string;
	arranger?: string;
	lyricist?: string;
	publishedAt?: number;
	categories?: string[];
	assetbundleName?: string;
}

interface SekaiDifficulty {
	id: number;
	musicId: number;
	musicDifficulty: string;
	playLevel: number;
	totalNoteCount: number;
	releaseConditionId?: number;
}

interface TachiSong {
	altTitles: string[];
	artist: string;
	data: {
		genre?: string;
	};
	id: number;
	searchTerms: string[];
	title: string;
}

interface TachiChart {
	chartID: string;
	data: {
		inGameID: number;
		notecount?: number;
	};
	difficulty: string;
	level: string;
	levelNum: number;
	playtype: string;
	songID: number;
	versions: string[];
	isPrimary: boolean;
}

// Fetch JSON from URL
function fetchJSON<T>(url: string): Promise<T> {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => {
					try {
						resolve(JSON.parse(data));
					} catch (err) {
						reject(err);
					}
				});
			})
			.on("error", reject);
	});
}

// Normalize for search
function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "");
}

// Fetch Google Sheets as CSV
function fetchGoogleSheet(sheetId: string, gid: string): Promise<string[][]> {
	const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
	
	return new Promise((resolve, reject) => {
		https
			.get(url, { 
				headers: {
					'User-Agent': 'Mozilla/5.0'
				}
			}, (res) => {
				// Handle redirects
				if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
					if (res.headers.location) {
						https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (redirectRes) => {
							let data = "";
							redirectRes.on("data", (chunk) => (data += chunk));
							redirectRes.on("end", () => {
								try {
									const rows = parseCSV(data);
									resolve(rows);
								} catch (err) {
									reject(err);
								}
							});
						}).on("error", reject);
						return;
					}
				}
				
				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => {
					try {
						const rows = parseCSV(data);
						resolve(rows);
					} catch (err) {
						reject(err);
					}
				});
			})
			.on("error", reject);
	});
}

function parseCSV(data: string): string[][] {
	return data.split("\n").map(row => {
		const cells: string[] = [];
		let current = "";
		let inQuotes = false;
		
		for (let i = 0; i < row.length; i++) {
			const char = row[i];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				cells.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		cells.push(current.trim());
		return cells;
	});
}

const outputDir = "../../../collections/";

const MUSICS_JP_URL =
	"https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/musics.json";
const MUSICS_EN_URL =
	"https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/musics.json";
const DIFFICULTIES_URL =
	"https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/musicDifficulties.json";

const GOOGLE_SHEET_ID = "1B8tX9VL2PcSJKyuHFVd2UT_8kYlY4ZdwHwg9MfWOPug";
const GOOGLE_SHEET_GID = "1855810409";

// Main function
(async () => {
	console.log("Fetching data from GitHub and Google Sheets...");

	let musicsJP: SekaiMusic[];
	let musicsEN: SekaiMusic[];
	let difficultiesData: SekaiDifficulty[];
	let constantsSheet: string[][];

	try {
		console.log("Fetching JP musics.json...");
		musicsJP = await fetchJSON<SekaiMusic[]>(MUSICS_JP_URL);
		console.log(`✓ Loaded ${musicsJP.length} JP songs from GitHub`);
	} catch (err) {
		console.error(`Error fetching JP musics.json:`, (err as Error).message);
		process.exit(1);
	}

	try {
		console.log("Fetching EN musics.json...");
		musicsEN = await fetchJSON<SekaiMusic[]>(MUSICS_EN_URL);
		console.log(`✓ Loaded ${musicsEN.length} EN songs from GitHub`);
	} catch (err) {
		console.error(`Error fetching EN musics.json:`, (err as Error).message);
		process.exit(1);
	}

	try {
		console.log("Fetching musicDifficulties.json...");
		difficultiesData = await fetchJSON<SekaiDifficulty[]>(DIFFICULTIES_URL);
		console.log(`✓ Loaded ${difficultiesData.length} difficulties from GitHub`);
	} catch (err) {
		console.error(`Error fetching musicDifficulties.json:`, (err as Error).message);
		process.exit(1);
	}

	try {
		console.log("Fetching constants from Google Sheets...");
		constantsSheet = await fetchGoogleSheet(GOOGLE_SHEET_ID, GOOGLE_SHEET_GID);
		console.log(`✓ Loaded ${constantsSheet.length} rows from Google Sheets`);
	} catch (err) {
		console.error(`Error fetching Google Sheets:`, (err as Error).message);
		process.exit(1);
	}

	// Parse constants from Google Sheets
	// Column layout: A=Song(EN), B=Song(JP), C=Constant, D=Level, E=Note Count, F=Difficulty
	const constantsMap = new Map<string, { constant: number; notecount: number }>();
	
	for (let i = 1; i < constantsSheet.length; i++) {
		const row = constantsSheet[i];
		if (!row || row.length < 6) continue;
		
		const songNameJP = row[1]?.trim(); // Column B - Japanese title
		const constantStr = row[2]?.trim(); // Column C - Constant value
		const notecountStr = row[4]?.trim(); // Column E - Note Count
		const difficulty = row[5]?.trim().toUpperCase(); // Column F - Difficulty
		
		if (!songNameJP || !difficulty || !constantStr) continue;
		
		const constant = parseFloat(constantStr);
		const notecount = parseInt(notecountStr || "0", 10);
		
		if (isNaN(constant)) continue;
		
		const key = `${songNameJP}|||${difficulty}`;
		constantsMap.set(key, { constant, notecount: isNaN(notecount) ? 0 : notecount });
	}
	
	console.log(`✓ Parsed ${constantsMap.size} constants from Google Sheets`);

	// Build EN title lookup (only for songs that exist in JP)
	const enTitleMap = new Map<number, string>();
	const jpSongIds = new Set(musicsJP.map((m) => m.id));
	musicsEN.forEach((m) => {
		// Only add EN title if the song exists in JP database
		if (jpSongIds.has(m.id)) {
			enTitleMap.set(m.id, m.title);
		}
	});

	const songsOutputPath = path.join(outputDir, "songs-proseka.json");
	const chartsOutputPath = path.join(outputDir, "charts-proseka.json");

	// Load existing data if it exists
	let existingSongs: TachiSong[] = [];
	let existingCharts: TachiChart[] = [];

	if (fs.existsSync(songsOutputPath)) {
		try {
			existingSongs = JSON.parse(fs.readFileSync(songsOutputPath, "utf8"));
			console.log(`\n✓ Loaded ${existingSongs.length} existing songs`);
		} catch (err) {
			console.warn(`Warning: Could not read existing songs file:`, (err as Error).message);
		}
	}

	if (fs.existsSync(chartsOutputPath)) {
		try {
			existingCharts = JSON.parse(fs.readFileSync(chartsOutputPath, "utf8"));
			console.log(`✓ Loaded ${existingCharts.length} existing charts`);
		} catch (err) {
			console.warn(`Warning: Could not read existing charts file:`, (err as Error).message);
		}
	}

	// Create a set of valid song IDs from difficulties (only create songs that have charts)
	const validSongIds = new Set(difficultiesData.map((d) => d.musicId));

	// Parse songs - merge with existing
	console.log("\nParsing songs...");
	const existingSongMap = new Map(existingSongs.map((s) => [s.id, s]));
	let newSongsCount = 0;
	let updatedSongsCount = 0;
	let skippedSongsCount = 0;

	const songs: TachiSong[] = musicsJP
		.filter((music) => {
			if (!validSongIds.has(music.id)) {
				skippedSongsCount++;
				return false;
			}
			return true;
		})
		.map((music) => {
			const existing = existingSongMap.get(music.id);
			const enTitle = enTitleMap.get(music.id);

			// Build altTitles and searchTerms
			const altTitles: string[] = [];
			const searchTerms: string[] = [normalize(music.title)];

			if (enTitle && enTitle !== music.title) {
				altTitles.push(enTitle);
				searchTerms.push(normalize(enTitle));
			}

			if (existing) {
				// Song exists - preserve any manual edits, but update core fields and merge altTitles/searchTerms
				updatedSongsCount++;
				return {
					...existing,
					title: music.title,
					artist: music.composer || music.arranger || "Unknown",
					altTitles: Array.from(new Set([...(existing.altTitles || []), ...altTitles])),
					searchTerms: Array.from(new Set([...(existing.searchTerms || []), ...searchTerms])),
					data: {
						...existing.data,
						genre:
							existing.data.genre ||
							(music.categories && music.categories.length > 0
								? music.categories[0]
								: undefined),
					},
				};
			} else {
				// New song
				newSongsCount++;
				return {
					altTitles,
					artist: music.composer || music.arranger || "Unknown",
					data: {
						genre:
							music.categories && music.categories.length > 0
								? music.categories[0]
								: undefined,
					},
					id: music.id,
					searchTerms,
					title: music.title,
				};
			}
		});

	console.log(
		`✓ Parsed ${songs.length} songs (${newSongsCount} new, ${updatedSongsCount} updated, ${skippedSongsCount} skipped - no charts)`
	);

	// Create song title lookup for constants matching
	const songTitleMap = new Map<number, string>();
	songs.forEach((s) => songTitleMap.set(s.id, s.title));

	// Parse charts with UPPERCASE difficulties matching your config
	console.log("\nParsing charts...");
	const difficultyMap: Record<string, string> = {
		easy: "EASY",
		normal: "NORMAL",
		hard: "HARD",
		expert: "EXPERT",
		master: "MASTER",
		append: "APPEND",
	};

	// Create a set of valid song IDs from our songs
	const songIds = new Set(songs.map((s) => s.id));

	// Create a map of existing charts by inGameID
	const existingChartMap = new Map(existingCharts.map((c) => [c.data.inGameID, c]));
	let newChartsCount = 0;
	let updatedChartsCount = 0;
	let orphanedChartsCount = 0;
	let constantsMatchedCount = 0;

	const charts: TachiChart[] = difficultiesData
		.filter((diff) => {
			if (!songIds.has(diff.musicId)) {
				orphanedChartsCount++;
				return false;
			}
			return true;
		})
		.map((diff) => {
			const diffName = difficultyMap[diff.musicDifficulty] || diff.musicDifficulty.toUpperCase();
			const existing = existingChartMap.get(diff.id);

			// Try to match with Google Sheets constants
			const songTitle = songTitleMap.get(diff.musicId);
			const constantKey = `${songTitle}|||${diffName}`;
			const constantData = constantsMap.get(constantKey);

			let level = String(diff.playLevel);
			let levelNum = diff.playLevel;
			let notecount = diff.totalNoteCount;

			if (constantData) {
				constantsMatchedCount++;
				levelNum = constantData.constant;
				// level is just the integer part (e.g., "26" for 26.9)
				level = String(Math.floor(constantData.constant));
				if (constantData.notecount > 0) {
					notecount = constantData.notecount;
				}
			}

			if (existing) {
				// Chart exists - update with new constant data if available
				updatedChartsCount++;
				return {
					...existing,
					level,
					levelNum,
					data: {
						...existing.data,
						inGameID: diff.id,
						notecount,
					},
				};
			} else {
				// New chart
				newChartsCount++;
				return {
					chartID: CreateChartID(),
					data: {
						inGameID: diff.id,
						notecount,
					},
					difficulty: diffName,
					level,
					levelNum,
					playtype: "Single",
					songID: diff.musicId,
					versions: ["proseka"],
					isPrimary: true,
				};
			}
		});

	console.log(
		`✓ Parsed ${charts.length} charts (${newChartsCount} new, ${updatedChartsCount} updated, ${orphanedChartsCount} orphaned - no matching song)`
	);
	console.log(`✓ Matched ${constantsMatchedCount}/${constantsMap.size} charts with Google Sheets constants`);

	// Create output directory if it doesn't exist
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
		console.log(`\n✓ Created output directory: ${outputDir}`);
	}

	// Write output files
	try {
		fs.writeFileSync(songsOutputPath, JSON.stringify(songs, null, "\t"));
		console.log(`\n✓ Wrote ${songs.length} songs to ${songsOutputPath}`);
	} catch (err) {
		console.error(`Error writing songs file:`, (err as Error).message);
		process.exit(1);
	}

	try {
		fs.writeFileSync(chartsOutputPath, JSON.stringify(charts, null, "\t"));
		console.log(`✓ Wrote ${charts.length} charts to ${chartsOutputPath}`);
	} catch (err) {
		console.error(`Error writing charts file:`, (err as Error).message);
		process.exit(1);
	}

	// Print summary
	console.log("\n=== Summary ===");
	console.log(`Songs: ${songs.length} (${newSongsCount} new, ${updatedSongsCount} updated)`);
	console.log(`Charts: ${charts.length} (${newChartsCount} new, ${updatedChartsCount} updated)`);
	console.log(`Constants matched: ${constantsMatchedCount}/${charts.length}`);
	console.log("\nDifficulty breakdown:");
	const diffCounts: Record<string, number> = {};
	charts.forEach((chart) => {
		diffCounts[chart.difficulty] = (diffCounts[chart.difficulty] || 0) + 1;
	});
	Object.entries(diffCounts)
		.sort()
		.forEach(([diff, count]) => {
			console.log(`  ${diff}: ${count}`);
		});

	console.log("\n✓ Done! JP titles + EN altTitles + Google Sheets constants merged!");
})();