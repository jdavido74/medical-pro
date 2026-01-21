#!/usr/bin/env node

/**
 * Scanner I18N Issues
 *
 * Scan tous les composants et identifie:
 * 1. Textes hardcodés en Espagnol/Français
 * 2. t() avec valeurs par défaut
 * 3. Clés manquantes dans les fichiers JSON
 *
 * Usage: node scripts/scanI18nIssues.js
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_DIR = './src/components';
const LOCALES_DIR = './src/locales';

// Patterns à détecter
const SPANISH_PATTERNS = [
  /["']Nuevo\s+\w+["']/,
  /["']Guardar\s+\w+["']/,
  /["']Editar\s+\w+["']/,
  /["']Eliminar["']/,
  /["']Cancelar["']/,
  /["']Nombre\s+del\s+\w+["']/,
  /["']Antecedentes\s+\w+["']/,
  /["']Medicamentos["']/,
  /["']Vacunas["']/,
  /["']Agrupar\s+por\s+\w+["']/,
  /["']No\s+hay\s+\w+["']/,
  /["']Crear\s+\w+["']/,
  /["']Especialidad["']/,
];

const FRENCH_PATTERNS = [
  /["']Horaires\s+\w+["']/,
  /["']Adresse["']/,
  /["']Téléphone["']/,
  /["']Entreprise["']/,
  /["']Profil["']/,
  /["']Sécurité["']/,
  /["']Raison["']/,
  /["']Données\s+\w+["']/,
  /["']Appliquer\s+\w+["']/,
];

const FALLBACK_PATTERNS = [
  /t\(['"][^'"]+['"],\s*['"][^'"]+["']\)/,  // t('key', 'default')
];

// Résultats
const results = {
  hardcodedSpanish: [],
  hardcodedFrench: [],
  fallbackDefaults: [],
  missingKeys: [],
};

/**
 * Scanner un fichier JS pour les problèmes i18n
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineNum) => {
    // Chercher textes espagnols en dur
    SPANISH_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        results.hardcodedSpanish.push({
          file: filePath.replace(process.cwd(), ''),
          line: lineNum + 1,
          text: line.trim().substring(0, 80),
        });
      }
    });

    // Chercher textes français en dur
    FRENCH_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        results.hardcodedFrench.push({
          file: filePath.replace(process.cwd(), ''),
          line: lineNum + 1,
          text: line.trim().substring(0, 80),
        });
      }
    });

    // Chercher t() avec valeurs par défaut
    FALLBACK_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        results.fallbackDefaults.push({
          file: filePath.replace(process.cwd(), ''),
          line: lineNum + 1,
          text: line.trim().substring(0, 80),
        });
      }
    });
  });
}

/**
 * Scanner tous les fichiers JS dans un répertoire
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach(file => {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.name.endsWith('.js')) {
      scanFile(filePath);
    }
  });
}

/**
 * Charger toutes les clés de traduction
 */
function loadTranslationKeys() {
  const keys = {
    fr: {},
    es: {},
    en: {},
  };

  ['fr', 'es', 'en'].forEach(lang => {
    const langDir = path.join(LOCALES_DIR, lang);
    const files = fs.readdirSync(langDir);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const namespace = file.replace('.json', '');
        const content = JSON.parse(
          fs.readFileSync(path.join(langDir, file), 'utf8')
        );
        keys[lang][namespace] = content;
      }
    });
  });

  return keys;
}

/**
 * Extraire les clés utilisées depuis t()
 */
function extractUsedKeys() {
  const usedKeys = new Set();
  const regex = /t\(['"]([^'"]+)['"]/g;
  let match;

  function processContent(content) {
    while ((match = regex.exec(content)) !== null) {
      usedKeys.add(match[1]);
    }
  }

  function processDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        processDir(filePath);
      } else if (file.name.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        processContent(content);
      }
    });
  }

  processDir(COMPONENT_DIR);
  return usedKeys;
}

/**
 * Trouver les clés manquantes
 */
function findMissingKeys() {
  const usedKeys = extractUsedKeys();
  const translationKeys = loadTranslationKeys();

  usedKeys.forEach(key => {
    if (key.includes('.')) {
      const [namespace, ...keyParts] = key.split('.');
      const keyPath = keyParts.join('.');

      ['fr', 'es', 'en'].forEach(lang => {
        if (
          !translationKeys[lang][namespace] ||
          !translationKeys[lang][namespace][keyPath]
        ) {
          results.missingKeys.push({
            key,
            lang,
            namespace,
          });
        }
      });
    }
  });
}

/**
 * Générer le rapport
 */
function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║          🌐 I18N SCANNER REPORT                                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

  // Résumé
  console.log('📊 RÉSUMÉ\n');
  console.log(`  Textes Espagnols en dur:  ${results.hardcodedSpanish.length}`);
  console.log(`  Textes Français en dur:   ${results.hardcodedFrench.length}`);
  console.log(`  t() avec valeurs par défaut: ${results.fallbackDefaults.length}`);
  console.log(`  Clés manquantes:          ${results.missingKeys.length}\n`);

  // Textes espagnols
  if (results.hardcodedSpanish.length > 0) {
    console.log('🔴 TEXTES ESPAGNOLS EN DUR\n');
    results.hardcodedSpanish.slice(0, 10).forEach(item => {
      console.log(`  ${item.file}:${item.line}`);
      console.log(`    ${item.text}`);
    });
    if (results.hardcodedSpanish.length > 10) {
      console.log(`  ... +${results.hardcodedSpanish.length - 10} others\n`);
    }
    console.log();
  }

  // Textes français
  if (results.hardcodedFrench.length > 0) {
    console.log('🟠 TEXTES FRANÇAIS EN DUR\n');
    results.hardcodedFrench.slice(0, 10).forEach(item => {
      console.log(`  ${item.file}:${item.line}`);
      console.log(`    ${item.text}`);
    });
    if (results.hardcodedFrench.length > 10) {
      console.log(`  ... +${results.hardcodedFrench.length - 10} others\n`);
    }
    console.log();
  }

  // Fallback defaults
  if (results.fallbackDefaults.length > 0) {
    console.log('🟡 t() AVEC VALEURS PAR DÉFAUT\n');
    results.fallbackDefaults.slice(0, 10).forEach(item => {
      console.log(`  ${item.file}:${item.line}`);
      console.log(`    ${item.text}`);
    });
    if (results.fallbackDefaults.length > 10) {
      console.log(`  ... +${results.fallbackDefaults.length - 10} others\n`);
    }
    console.log();
  }

  // Clés manquantes
  if (results.missingKeys.length > 0) {
    console.log('🔑 CLÉS DE TRADUCTION MANQUANTES\n');
    const grouped = {};
    results.missingKeys.forEach(item => {
      const key = `${item.namespace}.${item.key}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item.lang);
    });

    Object.entries(grouped).slice(0, 10).forEach(([key, langs]) => {
      console.log(`  ${key}: ${langs.join(', ')}`);
    });
    if (Object.keys(grouped).length > 10) {
      console.log(`  ... +${Object.keys(grouped).length - 10} others\n`);
    }
    console.log();
  }

  // Recommandations
  console.log('\n📋 RECOMMANDATIONS\n');
  console.log('  1. Corriger les textes espagnols en dur (Medical zone)');
  console.log('  2. Corriger les textes français en dur (Admin zone)');
  console.log('  3. Supprimer les valeurs par défaut dans t()');
  console.log('  4. Ajouter les clés manquantes aux fichiers JSON\n');

  // Voir le plan complet
  console.log('  📚 Plan détaillé: /var/www/INTERNATIONALIZATION_REFACTOR_PLAN.md\n');
}

// Exécuter le scan
console.log('🔍 Scanning i18n issues...\n');
scanDirectory(COMPONENT_DIR);
findMissingKeys();
generateReport();

// Exporter les résultats
fs.writeFileSync(
  'i18n-issues.json',
  JSON.stringify(results, null, 2)
);
console.log('✅ Rapport sauvegardé dans i18n-issues.json\n');
