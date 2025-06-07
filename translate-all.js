import fs from 'fs/promises';
import path from 'path';
import deepl from 'deepl-node';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const secretsPath = path.join(__dirname, '..', 'SECRETS.json');

let authKey;
try {
  const secretsRaw = await fs.readFile(secretsPath, 'utf-8');
  const secrets = JSON.parse(secretsRaw);
  authKey = secrets.DEEPL_API;
} catch (e) {
  console.error('Failed to load DEEPL_API key from SECRETS.json:', e.message);
  process.exit(1);
}

if (!authKey) {
  console.error('DEEPL_API key not found in SECRETS.json.');
  process.exit(1);
}

const translator = new deepl.Translator(authKey);

const languagesDir = path.join(__dirname, 'languages');
const sourceFile = 'en.json';

async function translateFile(targetFile) {
  const sourcePath = path.join(languagesDir, sourceFile);
  const targetPath = path.join(languagesDir, targetFile);

  const sourceRaw = await fs.readFile(sourcePath, 'utf-8');
  const sourceJson = JSON.parse(sourceRaw);

  let targetJson = {};
  try {
    const targetRaw = await fs.readFile(targetPath, 'utf-8');
    targetJson = JSON.parse(targetRaw);
  } catch {
    // file might not exist yet
  }

  const langCode = path.basename(targetFile, '.json').toUpperCase();

  console.log(`Translating to ${langCode} (skipping already translated keys)...`);

  const translatedJson = await translateObjectWithCache(sourceJson, targetJson, langCode);

  await fs.writeFile(targetPath, JSON.stringify(translatedJson, null, 2), 'utf-8');
  console.log(`✔ Saved ${targetPath}`);
}

async function translateObjectWithCache(sourceObj, targetObj, langCode) {
  if (typeof sourceObj === 'string') {
    if (sourceObj.trim() === '') return sourceObj; // skip empty strings

    // If target already has a non-empty string, reuse it
    if (typeof targetObj === 'string' && targetObj.trim() !== '') {
      return targetObj;
    }

    try {
      const result = await translator.translateText(sourceObj, null, langCode);
      return result.text;
    } catch (e) {
      console.error(`Translation error:`, e.message);
      return sourceObj; // fallback to source
    }
  } else if (typeof sourceObj === 'object' && sourceObj !== null) {
    const translated = Array.isArray(sourceObj) ? [] : {};
    for (const key of Object.keys(sourceObj)) {
      translated[key] = await translateObjectWithCache(
        sourceObj[key],
        targetObj && targetObj[key],
        langCode
      );
    }
    return translated;
  } else {
    return sourceObj;
  }
}

(async () => {
  // Read all JSON files except en.json
  const files = (await fs.readdir(languagesDir))
    .filter(f => f.endsWith('.json') && f !== sourceFile);

  for (const file of files) {
    await translateFile(file);
  }

  try {
    const usage = await translator.getUsage();
    if (usage.character) {
      const used = usage.character.count;
      const limit = usage.character.limit;
      const remaining = limit - used;
      const pct = used / limit;
      if(pct > 0.9) console.log(`\n⚠️ WARNING - DeepL usage: ${used}/${limit} characters used (${remaining} remaining)`);
        else console.log(`\n✅ DeepL usage: ${used}/${limit} characters used (${remaining} remaining)`);
    } else {
      console.log('\nℹ️ Character usage information is not available.');
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch DeepL usage:', err.message);
  }

})();
