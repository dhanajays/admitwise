const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/predictor/predictor-form.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Replace all 'Select Saved Profile' labels with 'Select Saved Percentile'
code = code.replace(/Select Saved Profile/g, 'Select Saved Percentile');
code = code.replace(/Percentile Profile \(Locked\)/g, 'Saved Percentile (Locked)');
code = code.replace(/placeholder="Select locked profile"/g, 'placeholder="Select locked percentile"');
code = code.replace(/placeholder="Select a saved profile\.\.\."/g, 'placeholder="Select a saved percentile..."');
code = code.replace(/placeholder="Use a saved profile or create new\.\.\."/g, 'placeholder="Use a saved percentile or create new..."');

// 2. Format the SelectItem children to strictly match the requested text format.
// MHT CET format
code = code.replace(/\{p.exam\} • \{Number\(p.percentile\).toFixed\(4\)\}% \(Locked\)/g, '{p.exam} – {Number(p.percentile).toFixed(4)}% (Locked)');
code = code.replace(/\{p.exam\} • \{Number\(p.percentile\).toFixed\(4\)\}%/g, '{p.exam} – {Number(p.percentile).toFixed(4)}%');

// JEE format
code = code.replace(/JEE • \{p.percentile\} \(Locked\)/g, 'JEE(Main) – {Number(p.percentile).toFixed(4)}% (Locked)');
code = code.replace(/JEE • \{p.percentile\}/g, 'JEE(Main) – {Number(p.percentile).toFixed(4)}%');

// NEET format
code = code.replace(/NEET • \{p.percentile\} \(Locked\)/g, 'NEET – {p.percentile} Marks (Locked)');
code = code.replace(/NEET • \{p.percentile\}/g, 'NEET – {p.percentile} Marks');

// MHT-CET All India format (it's identical to MHT CET regex usually, but just in case it uses MHT-CET text)
code = code.replace(/MHT-CET • \{p.percentile\} \(Locked\)/g, '{p.exam} – {Number(p.percentile).toFixed(4)}% (Locked)');
code = code.replace(/MHT-CET • \{p.percentile\}/g, '{p.exam} – {Number(p.percentile).toFixed(4)}%');

fs.writeFileSync(file, code);
console.log('Replacements complete');
