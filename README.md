# PicDuplicateSorter

Ein Node.js-Tool zum Erkennen und Verwalten von doppelten Bildern in deiner Sammlung.

## Funktionen

- Erkennung von Bilderduplikaten durch Perceptual Hashing
- Rekursive Verzeichnissuche
- Verschiedene Modi zum Kopieren von Bildern:
  - Ein Bild pro Duplikatgruppe kopieren
  - Nur einzigartige Bilder kopieren
  - Beides kombinieren
- Unterstützung für gängige Bildformate (JPG, PNG, GIF, BMP, WebP, TIFF)

## Installation

1. Stelle sicher, dass [Node.js](https://nodejs.org/) auf deinem System installiert ist
2. Klone dieses Repository:
   ```
   git clone https://github.com/dein-username/PicSorter.git
   ```
3. Wechsle in das Projektverzeichnis:
   ```
   cd PicSorter
   ```
4. Installiere die Abhängigkeiten:
   ```
   npm install
   ```

## Verwendung

### Grundlegende Verwendung:

```
node index.js [inputDir] [outputDir] [optionen]
```

### Beispiele:

```
# Suche nach Duplikaten ohne Aktionen
node index.js ./meinebilder

# Kopiere alle Duplikate in ein Ausgabeverzeichnis
node index.js ./meinebilder ./duplikate --move

# Wähle ein Bild pro Duplikatgruppe aus und kopiere es
node index.js ./meinebilder ./auswahl --select-one

# Kopiere nur einzigartige Bilder (ohne Duplikate)
node index.js ./meinebilder ./einzigartige --copy-unique

# Kopiere ein Bild pro Duplikatgruppe UND alle einzigartigen Bilder
node index.js ./meinebilder ./auswahl --select-all

# Kopiere ein einzelnes Bild in ein Zielverzeichnis
node index.js --copy ./meinebilder/foto.jpg:./zielverzeichnis
```

## Optionen

| Option | Kurzform | Beschreibung |
|--------|----------|-------------|
| `--help` | `-h` | Hilfe anzeigen |
| `--move` | `-m` | Duplikate in das Ausgabeverzeichnis verschieben (statt nur anzuzeigen) |
| `--no-recursive` | - | Unterverzeichnisse nicht durchsuchen |
| `--copy` | `-c` | Ein einzelnes Bild in ein Verzeichnis kopieren (Syntax: `--copy quelle:ziel`) |
| `--select-one` | `-s` | Nur ein Bild pro Duplikatgruppe in das Ausgabeverzeichnis kopieren |
| `--copy-unique` | `-u` | Alle Bilder ohne Duplikate in das Ausgabeverzeichnis kopieren |
| `--select-all` | `-a` | Kombiniert `--select-one` und `--copy-unique` |

## Wie es funktioniert

PicSorter verwendet Perceptual Hashing (pHash), um ähnliche Bilder zu erkennen, auch wenn sie leicht unterschiedliche Auflösungen, Formate oder kleinere Änderungen aufweisen. Bilder werden auf eine einheitliche Größe skaliert, in Graustufen umgewandelt und dann in numerische Hash-Werte umgerechnet, die verglichen werden.

## Anforderungen

- Node.js (v14 oder höher empfohlen)
- NPM (wird mit Node.js installiert)
- Sharp-Bibliothek (wird automatisch mit `npm install` installiert)

## Lizenz

[GNU General Public License v3.0](LICENSE)
