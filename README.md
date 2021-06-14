# Levels
Create maps multiple vertical levels

![Latest Release Download Count](https://img.shields.io/github/downloads/theripper93/Levels/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Flevels&colorB=03ff1c&style=for-the-badge)](https://forge-vtt.com/bazaar#package=levels) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftheripper93%2FLevels%2Fmain%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) [![alt-text](https://img.shields.io/badge/-Patreon-%23ff424d?style=for-the-badge)](https://www.patreon.com/theripper93) [![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/F53gBjR97G)

# WARNING: MAY BE BUGGY AF BUT I NEED TESTERS, PLEASE OPEN ISSUES WHEN YOU FIND BUGS

## [Video Tuorial](https://youtu.be/VDOp1nNTwF0)

**How to use:**

* Tiles: You can set the elevation range of a tile through the overhead tile config. The tile must be Overehead and must have a Better Roofs mode other than "None" enabled (set occlusion to Fade for best results). **Range for actual roofs must be set to bottom,infinity (eg. 20,infnity)**

* Drawings: to create a hole (for example a balcony) create a POLYGON or RECTANGLE, then set the range for the hole in the drawing config

* Lights: You can set the elevation range of a light through the light config, set it as a range like 5,15 for example

* Walls: The building needs to be walled for better roof to understand where the building is (you can enable building preview in better roofs module settings to check that it's calculated correctly)

**UI**

You can use the levels's ui to make things easier for you, just select the levels layer from the left side buttons and define your levels - with the widget you can then navigate the levels, anything you place (related to levels) when a level is selected will be automatically setup with the chosen top and bottom

**Wall Height**

Using the module wall height in conjunction with levels is highly suggested

**Elevation**

Your tokens will change levels by changing their elevation, you can also setup zones with macros using multi level tokens

**#API**

```js
  /**
   * Get the floor and ceiling of one or multiple tokens.
   * @param {Object|Object[]|String|String[]} tokenIds - A Token, an Array of Tokens, a Token ID or an Array of Tokens IDs
  **/

  getTokens(tokenIds)
```

![alt text](https://github.com/theripper93/Levels/raw/main/wiki/levelstileconfig.jpg)

![alt text](https://raw.githubusercontent.com/theripper93/Levels/main/wiki/holesdconfig.jpg)

![alt text](https://github.com/theripper93/Levels/raw/main/wiki/levelslightconfig.jpg)
