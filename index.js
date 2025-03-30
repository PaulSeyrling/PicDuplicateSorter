// Erforderliche Module importieren
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Versuche sharp zu importieren
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('Die Sharp-Bibliothek ist nicht installiert.');
  console.error('Bitte installieren Sie sharp mit: npm install sharp');
  process.exit(1);
}

// Konfiguration
const config = {
  inputDir: './images', // Standardverzeichnis, kann durch Befehlszeilenargumente überschrieben werden
  outputDir: './duplicates', // Verzeichnis für gefundene Duplikate
  moveFiles: false, // Ob Duplikate verschoben werden sollen
  recursive: true, // Unterverzeichnisse durchsuchen
  selectOne: false, // Ob nur ein Bild pro Duplikatgruppe kopiert werden soll
  copyUnique: false, // Ob einzigartige Bilder (ohne Duplikate) kopiert werden sollen
  selectAll: false // Ob ein Bild pro Duplikatgruppe UND alle einzigartigen Bilder kopiert werden sollen
};

// Hilfefunktion
function showHelp() {
  console.log(`
PicSorter - Ein Tool zum Finden von doppelten Bildern

Verwendung: node index.js [inputDir] [outputDir] [optionen]

Optionen:
  --help, -h         Diese Hilfe anzeigen
  --move, -m         Duplikate in das Ausgabeverzeichnis verschieben (statt nur zu kopieren)
  --no-recursive     Unterverzeichnisse nicht durchsuchen
  --copy, -c         Ein einzelnes Bild in ein Verzeichnis kopieren (Syntax: --copy quelle:ziel)
  --select-one, -s   Nur ein Bild pro Duplikatgruppe in das Ausgabeverzeichnis kopieren
  --copy-unique, -u  Alle Bilder ohne Duplikate in das Ausgabeverzeichnis kopieren
  --select-all, -a   Kombiniert --select-one und --copy-unique (ein Bild pro Gruppe + alle einzigartigen)
  
Beispiele:
  node index.js ./meinebilder ./duplikate --move
  node index.js ./meinebilder ./duplikate --select-one
  node index.js ./meinebilder ./einzigartige --copy-unique
  node index.js ./meinebilder ./auswahl --select-all
  node index.js --copy ./meinebilder/foto.jpg:./zielverzeichnis
`);
  process.exit(0);
}

// Funktion zum Kopieren eines einzelnen Bildes
function copyImage(sourcePath, destDir) {
  try {
    // Prüfen, ob die Quelldatei existiert
    if (!fs.existsSync(sourcePath)) {
      console.error(`Fehler: Die Datei "${sourcePath}" existiert nicht.`);
      return false;
    }

    // Prüfen, ob es sich um eine Bilddatei handelt
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];
    const fileExt = path.extname(sourcePath).toLowerCase();
    if (!imageExtensions.includes(fileExt)) {
      console.error(`Fehler: "${sourcePath}" scheint keine unterstützte Bilddatei zu sein.`);
      return false;
    }

    // Erstelle Zielverzeichnis, falls nicht vorhanden
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      console.log(`Zielverzeichnis "${destDir}" wurde erstellt.`);
    }

    // Kopiere die Datei
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);
    
    if (fs.existsSync(destPath)) {
      // Falls die Datei bereits existiert, füge einen Zeitstempel hinzu
      const extname = path.extname(fileName);
      const basename = path.basename(fileName, extname);
      const timestamp = Date.now();
      const newFileName = `${basename}_${timestamp}${extname}`;
      const newDestPath = path.join(destDir, newFileName);
      
      fs.copyFileSync(sourcePath, newDestPath);
      console.log(`Bild wurde nach "${newDestPath}" kopiert.`);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Bild wurde nach "${destPath}" kopiert.`);
    }
    
    return true;
  } catch (error) {
    console.error(`Fehler beim Kopieren: ${error.message}`);
    return false;
  }
}

// Verarbeite Befehlszeilenargumente
const args = process.argv.slice(2);
let copyMode = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--help' || arg === '-h') {
    showHelp();
  } else if (arg === '--move' || arg === '-m') {
    config.moveFiles = true;
  } else if (arg === '--no-recursive') {
    config.recursive = false;
  } else if (arg === '--select-one' || arg === '-s') {
    config.selectOne = true;
    config.moveFiles = true; // Implizit das Kopieren aktivieren
  } else if (arg === '--copy-unique' || arg === '-u') {
    config.copyUnique = true;
    config.moveFiles = true; // Implizit das Kopieren aktivieren
  } else if (arg === '--select-all' || arg === '-a') {
    config.selectOne = true;
    config.copyUnique = true;
    config.selectAll = true;
    config.moveFiles = true; // Implizit das Kopieren aktivieren
  } else if (arg === '--copy' || arg === '-c') {
    copyMode = true;
    if (i + 1 < args.length) {
      const copyArg = args[i + 1];
      if (copyArg.includes(':')) {
        const [sourcePath, destDir] = copyArg.split(':');
        if (copyImage(sourcePath, destDir)) {
          process.exit(0);
        } else {
          process.exit(1);
        }
      } else {
        console.error('Fehler: Ungültiges Format für --copy. Verwenden Sie "quelle:ziel"');
        showHelp();
      }
    } else {
      console.error('Fehler: Kein Bild und Zielverzeichnis für --copy angegeben');
      showHelp();
    }
  } else if (i === 0 && !arg.startsWith('-')) {
    config.inputDir = arg;
  } else if (i === 1 && !arg.startsWith('-')) {
    config.outputDir = arg;
  }
}

// Überprüfe, ob das Eingabeverzeichnis existiert
if (!fs.existsSync(config.inputDir) && !copyMode) {
  console.error(`Fehler: Das Verzeichnis "${config.inputDir}" existiert nicht.`);
  process.exit(1);
}

// Erstelle Ausgabeverzeichnis, falls nicht vorhanden und wenn wir Dateien verschieben/kopieren werden
if (config.moveFiles && !fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Funktion zum Berechnen eines Perceptual Hashes für ein Bild
async function calculateImageHash(filePath) {
  try {
    // Bild auf einheitliche Größe skalieren und in Graustufen umwandeln
    const imageBuffer = await sharp(filePath)
      .resize(16, 16, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();
    
    // Berechne den Hash aus den Pixeldaten
    return crypto.createHash('md5').update(imageBuffer).digest('hex');
  } catch (error) {
    console.error(`Fehler beim Verarbeiten von ${filePath}:`, error.message);
    return null;
  }
}

// Funktion zum Finden von Bilddateien in einem Verzeichnis
function findImageFiles(directory) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];
  const result = [];

  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        
        try {
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && config.recursive) {
            scanDirectory(filePath); // Rekursiv Unterverzeichnisse durchsuchen
          } else if (imageExtensions.includes(path.extname(filePath).toLowerCase())) {
            result.push(filePath);
          }
        } catch (error) {
          console.error(`Fehler beim Zugriff auf ${filePath}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Fehler beim Durchsuchen von ${dir}:`, error.message);
    }
  }

  scanDirectory(directory);
  return result;
}

// Hauptfunktion zum Finden von Duplikaten
async function findDuplicates() {
  console.log(`Suche nach Bildern in ${config.inputDir}${config.recursive ? ' (inkl. Unterverzeichnisse)' : ''}...`);
  const imageFiles = findImageFiles(config.inputDir);
  console.log(`${imageFiles.length} Bilder gefunden.`);

  if (imageFiles.length === 0) {
    console.log('Keine Bilder zum Verarbeiten gefunden.');
    return;
  }

  console.log('Berechne Hashes für alle Bilder...');
  const imageHashes = {};
  const duplicates = {};
  const uniqueImages = []; // Neue Liste für Bilder ohne Duplikate
  let processed = 0;

  // Berechne Hashes für alle Bilder
  for (const file of imageFiles) {
    const hash = await calculateImageHash(file);
    processed++;
    
    // Zeige Fortschritt an
    if (processed % 10 === 0 || processed === imageFiles.length) {
      process.stdout.write(`\rFortschritt: ${processed}/${imageFiles.length} (${Math.round(processed/imageFiles.length*100)}%)`);
    }
    
    if (hash) {
      if (!imageHashes[hash]) {
        imageHashes[hash] = [file];
      } else {
        // Duplikat gefunden
        imageHashes[hash].push(file);
        duplicates[hash] = imageHashes[hash];
      }
    }
  }
  
  // Identifiziere einzigartige Bilder
  for (const hash in imageHashes) {
    if (imageHashes[hash].length === 1 && !duplicates[hash]) {
      uniqueImages.push(imageHashes[hash][0]);
    }
  }
  
  console.log('\n\nErgebnisse:');
  let duplicateCount = 0;
  
  // Zeige Duplikate
  for (const hash in duplicates) {
    const files = duplicates[hash];
    duplicateCount += files.length - 1;
    
    console.log(`\nDuplikatgruppe ${hash}:`);
    
    // Bestimme, welche Bilder kopiert werden sollen
    let filesToCopy = [];
    if (config.moveFiles) {
      if (config.selectOne || config.selectAll) {
        // Nur ein Bild aus der Gruppe auswählen - wir nehmen das erste
        filesToCopy = [files[0]];
        console.log(`  Ausgewähltes Bild: ${files[0]}`);
      } else if (!config.copyUnique) {
        // Alle Duplikate auswählen (außer dem ersten)
        filesToCopy = files.slice(1);
      }
    }
    
    // Zeige alle Bilder in der Gruppe an
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
    // Kopiere die ausgewählten Bilder aus Duplikatgruppen
    if (config.moveFiles && !config.copyUnique && !config.selectAll) {
      for (const file of filesToCopy) {
        copyFileToOutput(file);
      }
    } else if (config.moveFiles && (config.selectOne || config.selectAll)) {
      // Wenn selectOne oder selectAll aktiv ist, kopiere nur das ausgewählte Bild
      copyFileToOutput(filesToCopy[0]);
    }
  }

  // Zeige und kopiere einzigartige Bilder
  if (uniqueImages.length > 0) {
    console.log(`\nEinzigartige Bilder gefunden: ${uniqueImages.length}`);
    
    if ((config.copyUnique || config.selectAll) && config.moveFiles) {
      console.log(`\nKopiere einzigartige Bilder nach ${config.outputDir}...`);
      
      for (const file of uniqueImages) {
        copyFileToOutput(file);
      }
    }
  }

  console.log(`\nZusammenfassung:`);
  console.log(`- ${imageFiles.length} Bilder insgesamt`);
  console.log(`- ${duplicateCount} Duplikate in ${Object.keys(duplicates).length} Gruppen`);
  console.log(`- ${uniqueImages.length} einzigartige Bilder`);
  
  if (!config.moveFiles) {
    console.log('\nUm bestimmte Bilder in ein separates Verzeichnis zu kopieren, verwenden Sie die Parameter:');
    console.log('  --move: Kopiert alle Duplikate außer dem ersten');
    console.log('  --select-one, -s: Kopiert das erste Bild jeder Duplikatgruppe');
    console.log('  --copy-unique, -u: Kopiert alle Bilder ohne Duplikate');
    console.log('  --select-all, -a: Kopiert ein Bild pro Duplikatgruppe UND alle einzigartigen Bilder');
    console.log('\nBeispiel: node index.js ' + config.inputDir + ' ./auswahl --select-all');
  }
}

// Hilfsfunktion zum Kopieren einer Datei ins Ausgabeverzeichnis
function copyFileToOutput(file) {
  const fileName = path.basename(file);
  const destPath = path.join(config.outputDir, fileName);
  
  try {
    if (fs.existsSync(destPath)) {
      // Falls die Datei bereits existiert, füge einen Zeitstempel hinzu
      const extname = path.extname(fileName);
      const basename = path.basename(fileName, extname);
      const timestamp = Date.now();
      const newFileName = `${basename}_${timestamp}${extname}`;
      const newDestPath = path.join(config.outputDir, newFileName);
      
      fs.copyFileSync(file, newDestPath);
      console.log(`  -> Kopiert nach ${newDestPath}`);
    } else {
      fs.copyFileSync(file, destPath);
      console.log(`  -> Kopiert nach ${destPath}`);
    }
  } catch (error) {
    console.error(`  -> Fehler beim Kopieren: ${error.message}`);
  }
}

// Programm starten
console.log('PicSorter - Ein Tool zum Finden von doppelten Bildern');
console.log('---------------------------------------------------');
findDuplicates().catch(error => {
  console.error('Ein Fehler ist aufgetreten:', error);
});
