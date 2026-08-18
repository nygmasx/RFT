import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAjpSeason, parseBjjMetrics, parseCfjjbTopTen } from '../src/lib/official-rankings';

test('parses the public BJJMetrics team data embedded in HTML', () => {
  const html = `<script>topFightersElo = JSON.parse('[{"Fighter":"Imrane Sallak","elo":1016,"elo_rank":50612,"total_medals":1}]'); individualMedals = JSON.parse('[{"Fighter":"Imrane Sallak","Competition":"Venice 2026","Category/Division":"White / Adult / Light","Place":1,"year":2026}]');</script>`;
  const result = parseBjjMetrics(html);
  assert.deepEqual(result.athletes[0], { name: 'Imrane Sallak', elo: 1016, worldRank: 50612, medals: 1 });
  assert.equal(result.medals[0].competition, 'Venice 2026');
});

test('keeps only exact Ronin team aliases from AJP data', () => {
  const result = parseAjpSeason({ lists: [{ items: [
    { nr: 4, points: 120, win: 5, lose: 1, gold_medals: 2, silver_medals: 0, bronze_medals: 1, entity: { name: 'Athlète RFT' }, club: { name: 'Benmabrouk RF Team' } },
    { nr: 1, points: 999, entity: { name: 'Autre' }, club: { name: 'Ronin Academy Moscow' } },
  ] }] });
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Athlète RFT');
  assert.equal(result[0].gold, 2);
});

test('parses CFJJB top-ten rows', () => {
  const html = `<li class="flex space-x-5 py-5"><div class="w-24 text-5xl"> 2</div><ul><li><div><span><b><big>Jean DUPONT</big></b></span><br><span>RONIN FIGHT TEAM</span></div></li></ul><div class="text-xl">96.00 points</div></li>`;
  assert.deepEqual(parseCfjjbTopTen(html), [{ rank: 2, name: 'Jean DUPONT', academy: 'RONIN FIGHT TEAM', points: 96 }]);
});
