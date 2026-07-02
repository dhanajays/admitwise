const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/predictor/predictor-form.tsx');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('formatSavedPercentile')) {
  const helperFunction = `
function formatSavedPercentile(profile: any, locked = false): string {
  if (!profile) return '';
  const val = Number(profile.percentile).toFixed(4);
  const lockText = locked ? ' (Locked)' : '';
  if (profile.exam === 'JEE(Main)') return \`JEE(Main) – \${val}%\${lockText}\`;
  if (profile.exam === 'NEET') return \`NEET – \${profile.percentile} Marks\${lockText}\`;
  return \`\${profile.exam} – \${val}%\${lockText}\`;
}
`;
  code = code.replace('export function PredictorForm', helperFunction + '\nexport function PredictorForm');
}

// 1. MHT CET Locked SelectValue
code = code.replace(
  /<SelectValue placeholder=\"Select locked percentile\" \/>/,
  `<SelectValue placeholder="Select locked percentile">
    {selectedProfileId && mhtCetProfiles.find(p => p.id === selectedProfileId) ? formatSavedPercentile(mhtCetProfiles.find(p => p.id === selectedProfileId), true) : "Select locked percentile"}
  </SelectValue>`
);

// 2. MHT CET Unlocked SelectValue
code = code.replace(
  /<SelectValue placeholder=\"Use a saved percentile or create new\.\.\.\" \/>/,
  `<SelectValue placeholder="Use a saved percentile or create new...">
    {selectedProfileId === "new" ? "+ Create new percentile profile..." : selectedProfileId && mhtCetProfiles.find(p => p.id === selectedProfileId) ? formatSavedPercentile(mhtCetProfiles.find(p => p.id === selectedProfileId)) : "Use a saved percentile or create new..."}
  </SelectValue>`
);

// 3. JEE Locked SelectValue
// Since there are multiple empty <SelectValue /> tags, we replace them sequentially. The first one is JEE Locked.
code = code.replace(
  /<SelectValue \/>/,
  `<SelectValue>
    {selectedJeeProfileId && jeeProfiles.find(p => p.id === selectedJeeProfileId) ? formatSavedPercentile(jeeProfiles.find(p => p.id === selectedJeeProfileId), true) : ""}
  </SelectValue>`
);

// 4. JEE Unlocked SelectValue
code = code.replace(
  /<SelectValue placeholder=\"Select a saved percentile\.\.\.\" \/>/,
  `<SelectValue placeholder="Select a saved percentile...">
    {selectedJeeProfileId === "new" ? "+ Enter new JEE percentile..." : selectedJeeProfileId && jeeProfiles.find(p => p.id === selectedJeeProfileId) ? formatSavedPercentile(jeeProfiles.find(p => p.id === selectedJeeProfileId)) : "Select a saved percentile..."}
  </SelectValue>`
);

// 5. NEET Locked SelectValue (the second <SelectValue /> in the file)
code = code.replace(
  /<SelectValue \/>/,
  `<SelectValue>
    {selectedNeetProfileId && neetProfiles.find(p => p.id === selectedNeetProfileId) ? formatSavedPercentile(neetProfiles.find(p => p.id === selectedNeetProfileId), true) : ""}
  </SelectValue>`
);

// 6. NEET Unlocked SelectValue
code = code.replace(
  /<SelectValue placeholder=\"Select a saved percentile\.\.\.\" \/>/,
  `<SelectValue placeholder="Select a saved percentile...">
    {selectedNeetProfileId === "new" ? "+ Enter new NEET percentile/marks..." : selectedNeetProfileId && neetProfiles.find(p => p.id === selectedNeetProfileId) ? formatSavedPercentile(neetProfiles.find(p => p.id === selectedNeetProfileId)) : "Select a saved percentile..."}
  </SelectValue>`
);

fs.writeFileSync(file, code);
console.log('SelectValue components explicitly rendered');
