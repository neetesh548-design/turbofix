import fs from 'fs';
import path from 'path';

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx')) {
      files.push(name);
    }
  }
  return files;
}

const allFiles = getFiles(path.join(process.cwd(), 'src'));
console.log(`Scanning ${allFiles.length} files in src/ for missing useState or React hooks imports...`);

const missingImports = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file uses `useState` without `React.useState`
  const usesBareUseState = /\buseState\s*\(/.test(content);
  const usesBareUseEffect = /\buseEffect\s*\(/.test(content);
  const usesBareUseMemo = /\buseMemo\s*\(/.test(content);
  const usesBareUseCallback = /\buseCallback\s*\(/.test(content);
  const usesBareUseRef = /\buseRef\s*\(/.test(content);

  // Check imports from 'react'
  const reactImportMatch = content.match(/import\s+(?:React\s*,\s*)?\{([^}]+)\}\s+from\s+['"]react['"]/);
  const fullReactImportMatch = content.match(/import\s+React\s+from\s+['"]react['"]/);

  const importedHooks = reactImportMatch ? reactImportMatch[1].split(',').map(s => s.trim()) : [];

  if (usesBareUseState && !importedHooks.includes('useState') && !content.includes('React.useState')) {
    missingImports.push({ file: filePath, hook: 'useState' });
  }
  if (usesBareUseEffect && !importedHooks.includes('useEffect') && !content.includes('React.useEffect')) {
    missingImports.push({ file: filePath, hook: 'useEffect' });
  }
  if (usesBareUseMemo && !importedHooks.includes('useMemo') && !content.includes('React.useMemo')) {
    missingImports.push({ file: filePath, hook: 'useMemo' });
  }
  if (usesBareUseCallback && !importedHooks.includes('useCallback') && !content.includes('React.useCallback')) {
    missingImports.push({ file: filePath, hook: 'useCallback' });
  }
  if (usesBareUseRef && !importedHooks.includes('useRef') && !content.includes('React.useRef')) {
    missingImports.push({ file: filePath, hook: 'useRef' });
  }
}

console.log('\nResults of React hooks import audit:');
if (missingImports.length === 0) {
  console.log('✅ No missing React hook imports found in src/!');
} else {
  console.log(`❌ Found ${missingImports.length} missing hook imports:`);
  console.log(JSON.stringify(missingImports, null, 2));
}
