import fs from 'fs';
const src = fs.readFileSync(process.argv[2],'utf8');
const a = src.indexOf('  var MONTHS'), b = src.indexOf('  TCF.countdownVals');
const body = src.slice(a,b);
for (const [y,m,d] of [[2026,10,30],[2026,10,31],[2026,11,1],[2026,11,2],[2026,11,3],[2027,1,15],[2027,1,16],[2027,10,31],[2027,11,1],[2025,10,31],[2025,11,1]]) {
  const TCF={}; const f = new Function('TCF','FAKE', body.replace(/function ptToday\(\) \{/, 'function ptToday() { return FAKE;') + '; return TCF.deadline();');
  const k = f(TCF,{y,m,d}); console.log(`${y}-${m}-${d}`, k.late?'LATE':'ontime', k.long, k.extended?'EXT':'', k.extFrom||'');
}
console.log(new Function('TCF','FAKE', body.replace(/function ptToday\(\) \{/, 'function ptToday() { return FAKE;') + '; return TCF.deadline();')({}, {y:2026,m:11,d:1}).extNote);
