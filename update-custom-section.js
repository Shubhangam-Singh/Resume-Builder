const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'pdf', 'templates');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'shared.tsx' && f !== 'CustomSection.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add highlights prop to CustomSectionView
  content = content.replace(
    /<CustomSectionView/g,
    `<CustomSectionView highlights={data.meta.highlights}`
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated', file);
}
