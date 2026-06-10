const fs = require('fs');
const path = require('path');
const d = 'd:/ResumeBuild/src/components/pdf/templates';

fs.readdirSync(d)
  .filter(f => f.endsWith('.tsx'))
  .forEach(f => {
    const p = path.join(d, f);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/\\\\\$\{/g, '${');
    // Also, if there's any literal `\${` in the text, let's fix that.
    c = c.replace(/\\\$\{/g, '${');
    fs.writeFileSync(p, c);
    console.log(`Fixed ${f}`);
  });
