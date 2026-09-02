const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'controllers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Clean up any existing awaits to avoid double await
  content = content.replace(/await\s+(getOne|getAll|runQuery|saveDatabase)\s*\(/g, '$1(');
  
  // Add single await
  content = content.replace(/\b(getOne|getAll|runQuery|saveDatabase)\s*\(/g, 'await $1(');
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed ${filePath}`);
}

function walkDir(d) {
  const files = fs.readdirSync(d);
  for (const file of files) {
    const fullPath = path.join(d, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(dir);
