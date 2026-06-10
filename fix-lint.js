const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'pdf', 'templates');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'shared.tsx' && f !== 'CustomSection.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix any to HighlightRule[]
  content = content.replace(
    /highlights\?: any;/,
    `highlights?: HighlightRule[];`
  );
  
  // Add import type HighlightRule if not exists
  if (!content.includes('HighlightRule')) {
    content = content.replace(
      /import type \{([^}]+)\} from "@\/lib\/resume\/types";/,
      `import type {$1, HighlightRule} from "@/lib/resume/types";`
    );
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed linting on', file);
}
