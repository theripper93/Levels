# LEVELS
Erstellen von Maps mit mehreren vertikalen Ebenen

![Latest Release Download Count](https://img.shields.io/github/downloads/theripper93/Levels/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Flevels&colorB=03ff1c&style=for-the-badge)](https://forge-vtt.com/bazaar#package=levels) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftheripper93%2FLevels%2Fmain%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) [![alt-text](https://img.shields.io/badge/-Patreon-%23ff424d?style=for-the-badge)](https://www.patreon.com/theripper93) [![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/F53gBjR97G)

Andere Sprachen: [English](README.md), [Deutsch](README.de.md)

## [Video Tuorial by Baileywiki](https://youtu.be/ELlweNunn4g)

**Wie man es benutzt:**

* Kacheln: Sie können den Höhenbereich einer Kachel über die Overhead-Kachelkonfiguration einstellen. Die Kachel muss Overehead sein und einen anderen Modus als "Keine" für "Bessere Dächer" aktiviert haben (setzen Sie die Okklusion auf "Verblassen" für beste Ergebnisse). **Bereich für aktuelle Dächer muss auf unten,unendlich (z.B. 20,unendlich)** gesetzt werden

* Zeichnungen: Um ein Loch zu erstellen (z.B. einen Balkon), erstellen Sie ein POLYGON oder RECHTECK, dann stellen Sie den Bereich für das Loch in der Zeichnungskonfiguration ein und setzen den Ebenenmodus auf Loch. Um eine Treppe zu erstellen, tun Sie dasselbe, aber stellen Sie den Ebenenmodus als Treppe ein, eine Treppe wechselt zwischen der unteren Höhe und der oberen Höhe + 1.

* Sperren von Treppen: Sie können eine Treppe über die Zeichnungsanzeige sperren (ein kleines Schlosssymbol)

* Lichter: Sie können den Höhenbereich eines Lichts über die Lichtkonfiguration einstellen, z. B. 5,15

* Wände: Das Gebäude muss mit Wänden versehen werden, damit Better Roof versteht, wo sich das Gebäude befindet (Sie können die Gebäudevorschau in den Einstellungen des Better Roofs-Moduls aktivieren, um zu überprüfen, ob es richtig berechnet wird)

**UI**

Sie können die UI der Ebenen nutzen, um sich die Arbeit zu erleichtern, wählen Sie einfach den Ebenen-Layer aus den Schaltflächen auf der linken Seite aus und definieren Sie Ihre Ebenen - mit dem Widget können Sie dann in den Ebenen navigieren, alles, was Sie platzieren (bezogen auf die Ebenen), wenn eine Ebene ausgewählt ist, wird automatisch mit der gewählten Ober- und Unterseite eingerichtet

**Aufzug**

Ihre Token ändern die Ebenen, indem sie ihre Höhe ändern, Sie können auch Zonen mit Zeichnungen einrichten, um die Höhe automatisch zu ändern

### **BEKANNTE PROBLEME** UNVERTRÄGLICHKEITEN**

* ### **Weniger Nebel**: Die Berechnung der Token-Sichtbarkeit für Ebenen funktioniert nicht mehr korrekt
* ### **Perfekte Sicht**: Token in Löchern erscheinen möglicherweise nicht in Schwarz-Weiß, mögliche andere Probleme vorhanden
### **Licht emittierende Spielsteine**: Token, die Licht emittieren, werden derzeit in Löchern nicht unterstützt, da die Leistung von Lichtquellen, die sich bewegen, beeinträchtigt wird

### **API**

**Patched canvas.walls.checkCollision Methode, um gegen eine bestimmte Höhe zu prüfen**

```js
  checkCollision(ray, options, elevation) → {boolean}
```

**Die Deckenhöhe eines oder mehrerer Token ermitteln**

```js
  /**
   * Holt den Boden und die Decke von einem oder mehreren Token.
   * @param {Object|Object[]|String|String[]} tokenIds - Ein Token, ein Array von Token, eine Token-ID oder ein Array von Token-IDs
   * @returns {Object|Object[]} - gibt ein Objekt zurück, das Token als Token-Objekt und range als Array mit 0 = Floor 1 = Ceiling enthält
  **/

  _levels.getTokens(tokenIds)
```

**Variablen holen, die die Daten des Flags enthalten**

```js
  /**
   * Holt den Boden und die Decke eines Kachel-, Zeichnungs-, Licht- und Tonobjekts.
   * @param {Object} object - Ein Kachel-, Zeichnungs-, Licht- oder Sound-Objekt
   * @returns {rangeBottom, rangeTop, isLevel, drawingMode} liefert Variablen, die die Flags-Daten enthalten
  **/

_levels.getFlagsForObject(object)
```

**Get ein Array, das { tile : die Bodenkachel, poly : das für die Kachel berechnete Polygon, range : ein Array, wobei der Index 0 das untere Flag und 1 das obere ist}** enthält

```js
  /**
   * Ermittelt alle Ebenen, in denen sich ein Punkt befindet
   * @param {Object} point - ein Objekt mit x- und y-Koordinaten {x:x,y:y}
   * @returns {Object[]} gibt ein Array von Objekten zurück, die jeweils {tile,range,poly}
   * wobei tile das Kachelobjekt ist, range ein Array mit [bottom,top] und poly das für den Raum berechnete Polygon ist
  **/

_levels.getFloorsForPoint(point)
```

**Gibt ein Array, bei dem der Index 0 die Unterseite und 1 die Oberseite ist**

```js
  /**
   * Liefert alle Ebenen, in denen sich ein Punkt befindet.
   * @param {Integer} elevation - eine ganze Zahl, die die Höhe angibt
   * @param {Object[]} floors - ein Array von Objekten, die jeweils {tile,range,poly}
   * wobei tile das Kachelobjekt ist, range ein Array mit [bottom,top] und poly das für den Raum berechnete Polygon ist
   * @returns {Array|false} gibt false zurück, wenn die Höhe in keiner der angegebenen Etagen enthalten ist, gibt ein Array mit [bottom,top] zurück, wenn eine gefunden wird
  **/

_levels.findCurrentFloorForElevation(elevation,floors)
```

BEISPIEL:

```js
_levels.findCurrentFloorForElevation(10,_levels.getFloorsForPoint({ x : token.center.x , y : token.center.y }))
```
Gibt zurück, in welchem Stockwerk eines Gebäudes sich eine beliebige Entität (gegeben ein Punkt und eine Höhe) befindet. Gibt False zurück, wenn es sich in keinem befindet
