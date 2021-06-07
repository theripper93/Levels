# Levels
Create maps multiple vertical levels

![Latest Release Download Count](https://img.shields.io/github/downloads/theripper93/Levels/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Flevels&colorB=03ff1c&style=for-the-badge)](https://forge-vtt.com/bazaar#package=levels) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftheripper93%2FLevels%2Fmain%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) [![alt-text](https://img.shields.io/badge/-Patreon-%23ff424d?style=for-the-badge)](https://www.patreon.com/theripper93) [![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/V9YD94AeY3)

# WARNING: MAY BE BUGGY AF BUT I NEED TESTERS, PLEASE OPEN ISSUES WHEN YOU FIND BUGS

**How to use:**

* Tiles: You can set the elevation range of a tile through the overhead tile config, set it as a range like 5,15 for example. The tile must be Overehead and must have a Better Roofs mode enabled (set occlusion to Fade for best results)

* Drawings: to create a hole (for example a balcony) create a POLYGON or RECTANGLE, then in the text field input "levelsHole|0,20" (no qoutes) 0,20 in this example is the range of the hole.

* Lights: You can set the elevation range of a light through the overhead tile config, set it as a range like 5,15 for example

* Range: When talking about a range (eg. 3,12) it means what's the floor heigh and ceiling height of that section

**Wall Height**

Using the module wall height in conjunction with levels is highly suggested

**Elevation**

Your tokens will change levels by changing their elevation, you can also setup zones with macros using multi level tokens


![alt text](https://github.com/theripper93/Levels/raw/main/wiki/levelstileconfig.jpg)

![alt text](https://raw.githubusercontent.com/theripper93/Levels/main/wiki/holesdconfig.jpg)
