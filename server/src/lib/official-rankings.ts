const BJJMETRICS_URL = 'https://bjjmetrics.com/team/benmabrouk-rf-team';
const CFJJB_URL = 'https://cfjjb.com/competitions/top-10-combattants';
const AJP_URL = `https://ajptour.com/en/toplist/getToplistDataBySeason/federation/1/${process.env.AJP_SEASON_ID ?? '14'}`;
const CACHE_MS = 6 * 60 * 60 * 1_000;
const TEAM_ALIASES = ['benmabrouk rf team', 'ronin fight team'];
const HEADERS = { 'User-Agent': 'RoninFightTeamApp/1.0 (+https://github.com; rankings cache; contact club admin)' };

export type OfficialAthlete = {
  name: string;
  academy?: string;
  rank?: number;
  points?: number;
  elo?: number;
  worldRank?: number;
  medals?: number;
  wins?: number;
  losses?: number;
  gold?: number;
  silver?: number;
  bronze?: number;
};

export type OfficialMedal = { athlete: string; competition: string; division: string; place: number; year: number };

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
}

function normalized(value: string) {
  return decodeHtml(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ').trim();
}

function isTeamAcademy(value: string) {
  const candidate = normalized(value);
  return TEAM_ALIASES.some((alias) => candidate === alias || candidate.includes(alias));
}

function embeddedJson(html: string, variable: string): unknown[] {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`${escaped}\\s*=\\s*JSON\\.parse\\('([\\s\\S]*?)'\\)`));
  if (!match) return [];
  try { return JSON.parse(match[1].replace(/\\'/g, "'")); }
  catch { return []; }
}

export function parseBjjMetrics(html: string) {
  const fighters = embeddedJson(html, 'topFightersElo') as Record<string, unknown>[];
  const medalRows = embeddedJson(html, 'individualMedals') as Record<string, unknown>[];
  return {
    athletes: fighters.map((row) => ({
      name: String(row.Fighter ?? ''), elo: Number(row.elo) || 0,
      worldRank: Number(row.elo_rank) || undefined, medals: Number(row.total_medals) || 0,
    })).filter(({ name }) => name),
    medals: medalRows.map((row) => ({
      athlete: String(row.Fighter ?? ''), competition: String(row.Competition ?? ''),
      division: String(row['Category/Division'] ?? ''), place: Number(row.Place) || 0,
      year: Number(row.year) || 0,
    })).filter(({ athlete, competition, place }) => athlete && competition && place),
  };
}

export function parseCfjjbTopTen(html: string): OfficialAthlete[] {
  const rows: OfficialAthlete[] = [];
  const rowPattern = /<li class="flex space-x-5 py-5"[\s\S]*?<div class="w-24[^>]*>\s*(\d+)\s*<\/div>[\s\S]*?<big>([\s\S]*?)<\/big>[\s\S]*?<br>\s*<span>([\s\S]*?)<\/span>[\s\S]*?(\d+(?:\.\d+)?)\s*points[\s\S]*?<\/li>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({ rank: Number(match[1]), name: decodeHtml(match[2]), academy: decodeHtml(match[3]), points: Number(match[4]) });
  }
  return rows;
}

export function parseAjpSeason(payload: unknown): OfficialAthlete[] {
  const lists = Array.isArray((payload as any)?.lists) ? (payload as any).lists : [];
  const rows: OfficialAthlete[] = [];
  for (const list of lists) for (const item of Array.isArray(list?.items) ? list.items : []) {
    const academy = String(item?.club?.name ?? '');
    if (!isTeamAcademy(academy)) continue;
    const name = String(item?.entity?.name ?? '').trim();
    if (!name) continue;
    rows.push({ name, academy, rank: Number(item.nr) || undefined, points: Number(item.points) || 0,
      wins: Number(item.win) || 0, losses: Number(item.lose) || 0, gold: Number(item.gold_medals) || 0,
      silver: Number(item.silver_medals) || 0, bronze: Number(item.bronze_medals) || 0 });
  }
  return rows.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function collect() {
  const [bjj, cfjjb, ajp] = await Promise.allSettled([
    fetchText(BJJMETRICS_URL).then(parseBjjMetrics),
    fetchText(CFJJB_URL).then((html) => parseCfjjbTopTen(html).filter((row) => isTeamAcademy(row.academy ?? ''))),
    fetch(AJP_URL, { headers: HEADERS, signal: AbortSignal.timeout(25_000) }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseAjpSeason(await response.json());
    }),
  ]);
  const source = <T>(result: PromiseSettledResult<T>, url: string) => result.status === 'fulfilled'
    ? { status: 'ok' as const, url, data: result.value }
    : { status: 'error' as const, url, error: result.reason instanceof Error ? result.reason.message : 'Indisponible', data: null };
  return { updatedAt: new Date().toISOString(),
    bjjmetrics: source(bjj, BJJMETRICS_URL), cfjjb: source(cfjjb, CFJJB_URL), ajp: source(ajp, 'https://ajptour.com/en/federation/1/ranking'),
    cfjjbResultsUrl: 'https://cfjjb.com/competitions/resultats',
  };
}

let cached: { at: number; value: Awaited<ReturnType<typeof collect>> } | null = null;
let inflight: Promise<Awaited<ReturnType<typeof collect>>> | null = null;

export async function getOfficialRankings(force = false) {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  if (inflight) return inflight;
  inflight = collect().then((value) => { cached = { at: Date.now(), value }; return value; }).finally(() => { inflight = null; });
  return inflight;
}
