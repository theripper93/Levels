# LEVELS
Create maps with multiple vertical levels

![Latest Release Download Count](https://img.shields.io/github/downloads/theripper93/Levels/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Flevels&colorB=03ff1c&style=for-the-badge)](https://forge-vtt.com/bazaar#package=levels) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftheripper93%2FLevels%2Fmain%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) [![alt-text](https://img.shields.io/badge/-Patreon-%23ff424d?style=for-the-badge)](https://www.patreon.com/theripper93) [![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/F53gBjR97G)

Other Language: [English](README.md), [Deutsch](README.de.md)

## [Video Tuorial by Baileywiki](https://youtu.be/ELlweNunn4g)
## [Video Tuorial by Baileywiki pt2](https://youtu.be/_nynikU9_ao)

*The module is free but if you are selling maps that use my modules you'll need a commercial licence wich is available on my patreon

## Perfect Vision: Levels is not currently compatible with perfect vision and you will experience erratic behaviour, use at your own risk

**How to use:**

* Tiles: You can set the elevation range of a tile through the overhead tile config. The tile must be Overehead and must have a Better Roofs mode other than "None" enabled (set occlusion to Fade for best results). **Range for actual roofs must be set to bottom,infinity (eg. 20,infnity)**

* Drawings: to create a hole (for example a balcony) create a POLYGON or RECTANGLE, then set the range for the hole in the drawing config and set the levels mode as hole. To create a stair do the same but set the levels mode as stair, a stair will toggle between the bottom elevation and the top elevation + 1.

* Locking Stairs: You can lock a stair through the drawing hud (a little lock icon)

* Lights: You can set the elevation range of a light through the light config, set it as a range like 5,15 for example

* Walls: The building needs to be walled for better roof to understand where the building is (you can enable building preview in better roofs module settings to check that it's calculated correctly)

**UI**

You can use the levels's ui to make things easier for you, just select the levels layer from the left side buttons and define your levels - with the widget you can then navigate the levels, anything you place (related to levels) when a level is selected will be automatically setup with the chosen top and bottom

**Elevation**

Your tokens will change levels by changing their elevation, you can also setup zones with drawings to automatically change elevation

# **KNOWN ISSUES\INCOMPATIBILITES**

* ### **Midi-qol**: If you have "Players control owned hidden tokens" option enabled in Midi you will get a libwrapper error, disable that option to fix the issue. Use Your Token Visible instead for the same functionality
* ### **Tokens Emitting light**: Tokens emitting light are currently not supported in holes due to performance concerns of light sources moving
* ### **Lights not rendering correctly**: Sometimes, switching between tokens will result in some lights to render using the wrong walls, i haven't found a solution but it's generally a GM only issue
* ### **Fog Exploration is not Saved in levels**: Due to foundry limitiations and performance concerns among other things, if you use the advanced fog option, fog exploration for a level won't be saved. If you have the option disabled exploring any floor will reveal the same area in all other floors.

# **API**

**Patched canvas.walls.checkCollision method to check against a specific elevation**

```js
  checkCollision(ray, options, elevation) → {boolean}
```

**Find out if a token is in the range of a particular object**

```js
 /**
   * Find out if a token is in the range of a particular object
   * @param {Object} token - a token
   * @param {Object} object - a tile/drawing/light/note
   * @returns {Boolean} - true if in range, false if not
   **/

    _levels.isTokenInRange(token,object)
```

**Get the ceiling\floor of one or multiple tokens**

```js
  /**
   * Get the floor and ceiling of one or multiple tokens.
   * @param {Object|Object[]|String|String[]} tokenIds - A Token, an Array of Tokens, a Token ID or an Array of Tokens IDs
   * @returns {Object|Object[]} - returns an object containing token as the token object and range as an Array with 0 = Floor 1 = Ceiling
  **/

  _levels.getTokens(tokenIds)
```

**Get variables containing the flags data**

```js
  /**
   * Get the floor and ceiling of one tile\drawing\light\sound object.
   * @param {Object} object - A Tile, Drawing, Light or Sound object
   * @returns {rangeBottom, rangeTop, isLevel, drawingMode} returns variables containing the flags data
  **/

_levels.getFlagsForObject(object)
```

**Get an array that contains { tile : the floor tile, poly : the polygon computed for the tile, range : an array where the index 0 is the bottom flag and 1 is the top}**

```js
  /**
   * Get all the levels a point is in
   * @param {Object} point - an object containing x and y coordinates {x:x,y:y}
   * @returns {Object[]} returns an array of object each containing {tile,range,poly}
   * where tile is the tile object, range is an array with [bottom,top] and poly is the polygon computed for the room
  **/

_levels.getFloorsForPoint(point)
```

**Get an array where the index 0 is the bottom and 1 is the top**

```js
  /**
   * Get all the levels a point is in
   * @param {Integer} elevation - an integer representing elevation
   * @param {Object[]} floors - an array of object each containing {tile,range,poly}
   * where tile is the tile object, range is an array with [bottom,top] and poly is the polygon computed for the room
   * @returns {Array|false} returns false if the elevation is not contained in any of the provided floors, return an Array with [bottom,top] if one is found
  **/

_levels.findCurrentFloorForElevation(elevation,floors)
```

EXAMPLE:

```js
_levels.findCurrentFloorForElevation(10,_levels.getFloorsForPoint({ x : token.center.x , y : token.center.y }))
```
Returns in wich floor of a building any entity (given a point and an elevation) is in. Returns False if it's in none

## **3D COLLISION CHECKING**

```js
  /**
   * Perform a collision test between 2 TOKENS in 3D space
   * @param {Object} token1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {Object} token2 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {String} type - "sight" or "collision" (defaults to "sight")
   * @returns {Boolean} returns true if a collision is detected, flase if it's not
  **/

  _levels.checkCollision(token1, token2, type = "sight")
```

```js
  /**
   * Get the total LOS height for a token
   * @param {Object} token - a token object
   * @returns {Integer} returns token elevation plus the LOS height stored in the flags
  **/

  _levels.getTokenLOSheight(token)
```

```js
  /**
   * Perform a collision test between 2 point in 3D space
   * @param {Object} p0 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {Object} p1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {String} type - "sight" or "collision" (defaults to "sight")
   * @returns {Boolean} returns true if a collision is detected, flase if it's not
  **/

  _levels.testCollision(p0, p1, type = "sight")
```
