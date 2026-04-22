import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, { encoding: 'binary' });
  const buffer = Buffer.from(content, 'binary');
  let fixed;
  try {
    fixed = buffer.toString('latin1');
    fixed = Buffer.from(fixed, 'latin1').toString('utf8');
  } catch (e) {
    console.error('failed to convert', filePath, e);
    return false;
  }

  const hasArabic = /[\u0600-\u06FF]/.test(fixed);
  if (hasArabic) {
    fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, fixed, { encoding: 'utf8' });
    console.log('fixed', filePath);
    return true;
  }

  console.log('no-arabic-detected, skipped', filePath);
  return false;
}

function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const it of items) {
    const p = path.join(dir, it);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p);
    else if (/\.html?$/.test(p)) fixFile(p);
  }
}

const templatesDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(templatesDir)) {
  console.error('templates dir not found:', templatesDir);
  process.exit(1);
}

walk(templatesDir);
console.log('done');
