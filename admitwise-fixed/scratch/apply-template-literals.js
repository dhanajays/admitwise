const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/predictor/predictor-form.tsx');
let code = fs.readFileSync(file, 'utf8');

// Convert children to template literals to ensure they render as a single string node.
// This prevents Radix UI / Base UI textValue extraction from failing and falling back to the raw ID.

code = code.replace(/\{p\.exam\} – \{Number\(p\.percentile\)\.toFixed\(4\)\}% \(Locked\)/g, '{\`${p.exam} – ${Number(p.percentile).toFixed(4)}% (Locked)\`}');
code = code.replace(/\{p\.exam\} – \{Number\(p\.percentile\)\.toFixed\(4\)\}%(?! \(Locked\))/g, '{\`${p.exam} – ${Number(p.percentile).toFixed(4)}%\`}');

code = code.replace(/JEE\(Main\) – \{Number\(p\.percentile\)\.toFixed\(4\)\}% \(Locked\)/g, '{\`JEE(Main) – ${Number(p.percentile).toFixed(4)}% (Locked)\`}');
code = code.replace(/JEE\(Main\) – \{Number\(p\.percentile\)\.toFixed\(4\)\}%(?! \(Locked\))/g, '{\`JEE(Main) – ${Number(p.percentile).toFixed(4)}%\`}');

code = code.replace(/NEET – \{p\.percentile\} Marks \(Locked\)/g, '{\`NEET – ${p.percentile} Marks (Locked)\`}');
code = code.replace(/NEET – \{p\.percentile\} Marks(?! \(Locked\))/g, '{\`NEET – ${p.percentile} Marks\`}');

fs.writeFileSync(file, code);
console.log('Template literals applied');
