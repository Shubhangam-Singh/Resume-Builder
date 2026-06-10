const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'pdf', 'templates');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'shared.tsx' && f !== 'CustomSection.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import if not exists
  if (!content.includes('HighlightText')) {
    content = content.replace(
      /import {([^}]+)} from "@react-pdf\/renderer";/,
      `import {$1} from "@react-pdf/renderer";\nimport { HighlightText } from "../HighlightText";`
    );
  }

  // Update Bullet signature
  content = content.replace(
    /function Bullet\(\{ styles, children \}: \{ styles: Styles; children: string \}\) \{([\s\S]*?)<Text style=\{styles.bulletText\}>\{children\}<\/Text>([\s\S]*?)\}/,
    `function Bullet({ styles, highlights, children }: { styles: Styles; highlights?: any; children: string }) {$1<HighlightText text={children} highlights={highlights} style={styles.bulletText} />$2}`
  );

  // Update Bullet usages
  content = content.replace(
    /<Bullet key=\{i\} styles=\{styles\}>/g,
    `<Bullet key={i} styles={styles} highlights={data.meta.highlights}>`
  );

  // Summary
  content = content.replace(
    /<Text style=\{styles\.summary\}>\{basics\.summary\}<\/Text>/g,
    `<HighlightText text={basics.summary} highlights={data.meta.highlights} style={styles.summary} />`
  );

  // Experience summary
  content = content.replace(
    /<Text style=\{styles\.entrySummary\}>\{w\.summary\}<\/Text>/g,
    `<HighlightText text={w.summary} highlights={data.meta.highlights} style={styles.entrySummary} />`
  );

  // Project description
  content = content.replace(
    /<Text style=\{styles\.entrySummary\}>\{p\.description\}<\/Text>/g,
    `<HighlightText text={p.description} highlights={data.meta.highlights} style={styles.entrySummary} />`
  );

  // Custom Item description
  content = content.replace(
    /<Text style=\{styles\.entrySummary\}>\{item\.description\}<\/Text>/g,
    `<HighlightText text={item.description} highlights={data.meta.highlights} style={styles.entrySummary} />`
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated', file);
}
