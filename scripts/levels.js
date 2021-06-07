/***********************************************************************************
 * LEVELS CLASS, CONTAINS THE DATA NEEDED FOR FASTER SIGHT REFRESH PROCESSING *
 ***********************************************************************************/

class Levels {
  constructor() {
    this.DEBUG = false;
    this.floorContainer = new PIXI.Container();
    this.floorContainer.spriteIndex = {};
    this.occlusionIndex = {};
  }

  /**********************************************
   * INITIALIZE LEVELS FOR THE FIRST TIME *
   **********************************************/

  static get() {
    Levels._instance = new Levels();
    Levels._instance.floorContainer.sortableChildren = true;
    canvas.background.addChild(Levels._instance.floorContainer);
    return Levels._instance;
  }

  findRoomsTiles(token, allTiles) {
    let tiles = [];
    for (let tile of allTiles) {
      if (tile.poly && tile.poly.contains(token.center.x, token.center.y)) {
        let range = tile.range;
        tiles.push({
          tile: tile.tile,
          poly: tile.roomPoly,
          range: range,
        });
      }
    }
    return tiles;
  }

  findAllTiles() {
    let tiles = [];
    for (let tile of canvas.foreground.placeables) {
      if (tile.roomPoly) {
        let rangeFlag = tile.document.getFlag(_levelsModuleName, "heightRange");
        if (!rangeFlag) continue;
        let range = rangeFlag.split(".");
        if (range.length != 2) range = rangeFlag.split(",");
        tiles.push({
          tile: tile,
          poly: tile.roomPoly,
          range: [parseInt(range[0]), parseInt(range[1])],
        });
      }
    }
    return tiles;
  }

  computeTile(tile, altitude, lights) {
    switch (altitude) {
      case 1:
        this.removeTempTile(tile);
        return false;
        break;
      case -1:
        return false;
        break;
      case 0:
        this.mirrorTileInBackground(tile);
        return tile;
        break;
    }
  }

  checkTile(tile, altitude) {
    switch (altitude) {
      case 1:
        return false;
        break;
      case -1:
        return false;
        break;
      case 0:
        return tile;
        break;
    }
  }

  refreshTokens() {
    let cToken = canvas.tokens.controlled[0];
    if (!cToken) return;
    let perfEnd, perfStart;
    if (_levels.DEBUG) perfStart = performance.now();
    let allTiles = _levels.findAllTiles();
    let holes = _levels.getHoles();
    let tokensState = _levels.getTokensState(allTiles);
    _levels.computeTokens(
      tokensState,
      cToken.data.elevation,
      holes,
      cToken.data.elevation,
      cToken.id
    );
    if (_levels.DEBUG) {
      perfEnd = performance.now();
      console.log(
        `Levels compute took ${perfEnd - perfStart} ms, FPS:${Math.round(
          canvas.app.ticker.FPS
        )}, Elevation: ${cToken.data.elevation} TokensState: `,
        tokensState
      );
    }
  }

  computeTokens(tokens, elevation, holes, cTokenElev, ctokenId) {
    tokens.forEach((t) => {
      if (t.token.id != ctokenId) {
        if (!(t.range[1] >= elevation && t.range[0] <= elevation)) {
          let isInHole = this.isTokenInHole(t, holes);
          if (!this.isInsideHoleRange(isInHole, t, cTokenElev)) {
            t.token.levelsHidden = true;
            t.token.icon.alpha = 0;
            //if (!this.floorContainer.children.find((c) => c.name == t.token.id))
            this.getTokenIconSprite(t.token);
          } else {
            t.token.visible = false;
            this.removeTempToken(t.token);
          }
        } else {
          t.token.levelsHidden = false;
          t.token.icon.alpha = 1;
          this.removeTempToken(t.token);
        }
      }
    });
  }

  isInsideHoleRange(isInHole, t, cTokenElev) {
    return (
      !isInHole ||
      (t.token.data.elevation <= isInHole.range[1] &&
        t.token.data.elevation >= isInHole.range[0] &&
        !(cTokenElev <= isInHole.range[1] && cTokenElev >= isInHole.range[0]))
    );
  }

  isTokenInHole(t, holes) {
    let cs = canvas.scene.dimensions.size;
    let th = t.token.height;
    let tw = t.token.width;
    for (let hole of holes) {
      if (
        t.range[1] <= hole.range[1] &&
        t.range[0] >= hole.range[0] &&
        (hole.poly.contains(t.token.center.x, t.token.center.y) ||
          hole.poly.contains(t.token.x + tw, t.token.y) ||
          hole.poly.contains(t.token.x, t.token.y + th) ||
          hole.poly.contains(t.token.x + tw, t.token.y + th) ||
          hole.poly.contains(t.token.x, t.token.y))
      ) {
        return hole;
      }
    }
    return false;
  }

  getTokensState(allTiles) {
    let tokensState = [];
    for (let token of canvas.tokens.placeables) {
      tokensState.push(this.getTokenState(token, allTiles));
    }
    return tokensState;
  }

  getTokenState(token, allTiles) {
    let elevation = token.data.elevation;
    let tilesIsIn = this.findRoomsTiles(token, allTiles);
    if (!tilesIsIn || tilesIsIn.length == 0) {
      return { token: token, range: [0, 1000] }; //return { token: token, range: [0, elevation] };
    }
    let levelTile;
    tilesIsIn.forEach((t) => {
      let isInLevel = this.checkTile(
        t,
        this.getPositionRelativeToTile(elevation, t)
      );
      if (isInLevel) levelTile = isInLevel;
    });
    if (levelTile) {
      return { token: token, range: levelTile.range };
    } else {
      levelTile = this.findCeiling(tilesIsIn);
      return { token: token, range: [0, levelTile.range[0]] };
    }
  }

  async saveTileConfig(event) {
    let html = this.offsetParent;
    if (
      !canvas.background.get(event.data.id) &&
      !canvas.foreground.get(event.data.id)
    )
      return;
    await event.data.setFlag(
      _levelsModuleName,
      "heightRange",
      html.querySelectorAll("input[name ='heightRange']")[0].value
    );
  }

  async saveLightConfig(event) {
    let html = this.offsetParent;
    await event.data.setFlag(
      _levelsModuleName,
      "heightRange",
      html.querySelectorAll("input[name ='heightRange']")[0].value
    );
  }

  mirrorTileInBackground(tileIndex) {
    let tile = tileIndex.tile;
    let oldSprite = this.floorContainer.children.find((c) => c.name == tile.id);
    let tileImg = tile.children[0];
    if (!tileImg || oldSprite || !tileImg.texture.baseTexture) return;
    let sprite = new PIXI.Sprite.from(tileImg.texture);
    sprite.isSprite = true;
    sprite.width = tile.data.width;
    sprite.height = tile.data.height;
    sprite.position = tile.position;
    sprite.position.x += tileImg.x;
    sprite.position.y += tileImg.y;
    sprite.anchor = tileImg.anchor;
    sprite.angle = tileImg.angle;
    sprite.alpha = 1;
    sprite.name = tile.id;
    sprite.zIndex = tileIndex.range[1];
    this.floorContainer.spriteIndex[tile.id] = sprite;
    this.floorContainer.addChild(sprite);
  }

  _onElevationChangeUpdate() {
    let perfEnd, perfStart;
    if (_levels.DEBUG) perfStart = performance.now();
    let cToken = canvas.tokens.controlled[0];
    if (!cToken) return;
    let allTiles = this.findAllTiles();
    let lights = this.getLights();
    let holes = this.getHoles();
    allTiles.forEach((tile) => {
      this.clearLights(lights);
      this.computeLightsForTile(tile, lights, cToken.data.elevation, holes);
      this.computeTile(
        tile,
        _levels.getPositionRelativeToTile(cToken.data.elevation, tile),
        lights
      );
    });
    if (_levels.DEBUG) {
      perfEnd = performance.now();
      console.log(
        `Levels _onElevationChangeUpdate took ${
          perfEnd - perfStart
        } ms, FPS:${Math.round(
          canvas.app.ticker.FPS
        )}, Tiles: ${allTiles} Lights: ${lights} Holes: ${holes}`
      );
    }
  }

  clearLights(lights) {
    lights.forEach((lightIndex) => {
      lightIndex.light.source.skipRender = false;
    });
  }

  computeLightsForTile(tile, lights, elevation, holes) {
    let lightsToOcclude = [];
    let lightsToUnocclude = [];
    lights.forEach((lightIndex) => {
      let whereIsTheLight = this.getLightPositionRelativeToTile(
        tile,
        lightIndex,
        elevation,
        holes
      );
      switch (whereIsTheLight) {
        case -1:
          lightIndex.light.source.skipRender = false;
          lightsToOcclude.push(lightIndex);
          break;
        case 0:
          lightIndex.light.source.skipRender = false;
          lightsToUnocclude.push(lightIndex);
          break;
        case 1:
          lightIndex.light.source.skipRender = true;
          break;
      }
    });
    lights.forEach((light) => {
      this.unoccludeLights(tile, light);
    });
    lightsToOcclude.forEach((light) => {
      this.occludeLights(tile, light);
    });
    lightsToUnocclude.forEach((light) => {
      this.unoccludeLights(tile, light);
    });
  }

  /*****************************************************
   * 1: LIGHT IS ABOVE -1: LIGHT IS BELOW 0 : SAME LEVEL *
   *****************************************************/

  getLightPositionRelativeToTile(tile, light, elevation, holes) {
    if (
      light.range[1] <= tile.range[1] &&
      !(elevation >= light.range[0] && elevation <= light.range[1]) &&
      elevation <= light.range[1]
    )
      return 1;
    if (
      light.range[0] >= tile.range[0] &&
      light.range[1] <= tile.range[1] &&
      elevation >= light.range[0] &&
      elevation <= light.range[1]
    )
      return 0;
    if (
      light.range[1] <= tile.range[0] &&
      elevation >= tile.range[0] &&
      elevation <= tile.range[1]
    ) {
      return this.lightIluminatesHole(light, holes, elevation) ? -1 : 1;
    }
  }

  lightIluminatesHole(light, holes, elevation) {
    for (let hole of holes) {
      for (let i = 0; i < light.light.source.fov.points.length; i += 2) {
        if (
          elevation <= hole.range[1] &&
          elevation >= hole.range[0] &&
          hole.poly.contains(
            light.light.source.fov.points[i],
            light.light.source.fov.points[i + 1]
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  occludeLights(tileIndex, light) {
    let tile = tileIndex.tile;
    let oldSprite = light.light.source.coloration.children.find(
      (c) => c.name == tile.id
    );
    let addChild = oldSprite ? false : true;
    let tileImg = tile.children[0];
    if (!tileImg || !tileImg.texture.baseTexture) return;
    let sprite = this.getTileSprite(oldSprite, tileImg, tile);
    sprite.tint = 0x000000;
    let Illumsprite = this.getTileSprite(oldSprite, tileImg, tile);
    Illumsprite.tint = canvas.lighting.channels.bright.hex;
    if (addChild) {
      light.light.source.coloration.addChild(sprite);
      light.light.source.illumination.addChild(Illumsprite);
    }
  }

  getTileSprite(oldSprite, tileImg, tile) {
    let sprite = oldSprite || new PIXI.Sprite.from(tileImg.texture);
    sprite.isSprite = true;
    sprite.width = tile.data.width;
    sprite.height = tile.data.height;
    sprite.position = tile.position;
    sprite.position.x += tileImg.x;
    sprite.position.y += tileImg.y;
    sprite.anchor = tileImg.anchor;
    sprite.angle = tileImg.angle;
    sprite.alpha = 1;
    sprite.name = tile.id;
    return sprite;
  }

  unoccludeLights(tileIndex, light) {
    let tile = tileIndex.tile;
    let sprite = light.light.source.coloration.children.find(
      (c) => c.name == tile.id
    );
    let illumSprite = light.light.source.illumination.children.find(
      (c) => c.name == tile.id
    );
    //if(!sprite) return
    light.light.source.coloration.removeChild(sprite);
    light.light.source.illumination.removeChild(illumSprite);
    light.light.source.coloration.removeChild(this.occlusionIndex["HideMask"]);
    //light.light.source.illumination.removeChild(this.occlusionIndex["HideMask"]);
  }

  hideLighs(tileIndex, lights) {
    if (!this.occlusionIndex["HideMask"]) {
      let g = new PIXI.Graphics();
      g.beginFill().drawRect(
        0,
        0,
        canvas.dimensions.width,
        canvas.dimensions.height
      );
      let tex = canvas.app.renderer.generateTexture(g);
      let p = new PIXI.Sprite.from(tex);
      p.tint = 0x000000;
      this.occlusionIndex["HideMask"] = p;
    }
    lights.forEach((lightIndex) => {
      lightIndex.light.source.coloration.addChild(
        this.occlusionIndex["HideMask"]
      );
      //lightIndex.light.source.illumination.addChild(this.occlusionIndex["HideMask"]);
    });
  }

  removeTempTile(tileIndex) {
    let tile = tileIndex.tile;
    let sprite = this.floorContainer.children.find((c) => c.name == tile.id);
    if (sprite) this.floorContainer.removeChild(sprite);
  }

  getTokensInBuilding(poly) {
    let tokensInBuilding = [];
    canvas.tokens.placeables.forEach((t) => {
      if (poly.contains(t.center.x, t.center.y)) tokensInBuilding.push(t);
    });
    return tokensInBuilding;
  }

  findCeiling(tiles) {
    let arrayToReduce = [];
    tiles.forEach((t) => {
      arrayToReduce.push({ c: t.range[0], t: t });
      arrayToReduce.push({ c: t.range[1], t: t });
    });
    const reducer = (previousC, currentC) => {
      return previousC.c < currentC.c ? previousC : currentC;
    };
    return arrayToReduce.reduce(reducer).t;
  }

  getHoles() {
    let holes = [];
    let holeDrawings = canvas.drawings.placeables.filter(
      (d) => d.data.text && d.data.text.includes("levelsHole")
    );
    holeDrawings.forEach((drawing) => {
      let p = new PIXI.Polygon(this.adjustPolygonPoints(drawing));
      let range = drawing.data.text.split("|")[1].split(",");
      holes.push({ poly: p, range: [parseInt(range[0]), parseInt(range[1])] });
    });
    return holes;
  }

  getLights() {
    let lights = [];
    canvas.lighting.placeables.forEach((light) => {
      let flag = light.document.getFlag(_levelsModuleName, "heightRange");
      if (flag && flag != 0) {
        let range = flag.split(",");
        lights.push({
          light: light,
          range: [parseInt(range[0]), parseInt(range[1])],
        });
      }
    });
    return lights;
  }

  adjustPolygonPoints(drawing) {
    let globalPoints = [];
    if (drawing.data.points.length != 0) {
      drawing.data.points.forEach((p) => {
        globalPoints.push(p[0] + drawing.x, p[1] + drawing.y);
      });
    } else {
      globalPoints = [
        drawing.x,
        drawing.y,
        drawing.x + drawing.width,
        drawing.y,
        drawing.x + drawing.width,
        drawing.y + drawing.height,
        drawing.x,
        drawing.y + drawing.height,
      ];
    }
    return globalPoints;
  }

  getTokenIconSprite(token, x, y, rotate) {
    let oldSprite = this.floorContainer.children.find(
      (c) => c.name == token.id
    );
    let icon = token.icon;
    if (
      token._controlled ||
      //(oldSprite && !rotate) ||
      !icon ||
      !icon.texture.baseTexture
    )
      return;
    let sprite = oldSprite ? oldSprite : new PIXI.Sprite.from(icon.texture);
    sprite.isSprite = true;
    sprite.width = token.data.width * canvas.scene.dimensions.size;
    sprite.height = token.data.height * canvas.scene.dimensions.size;
    sprite.position.x = x || token.position.x;
    sprite.position.y = y || token.position.y;
    sprite.position.x += icon.x;
    sprite.position.y += icon.y;
    sprite.anchor = icon.anchor;
    sprite.angle = icon.angle;
    sprite.alpha = token.visible ? 1 : 0;
    sprite.name = token.id;
    sprite.zIndex = token.data.elevation;
    if (!oldSprite) {
      this.floorContainer.spriteIndex[token.id] = sprite;
      this.floorContainer.addChild(sprite);
    }
  }

  removeTempToken(token) {
    let sprite = this.floorContainer.children.find((c) => c.name == token.id);
    if (sprite) this.floorContainer.removeChild(sprite);
  }

  /*****************************************************
   * 1: TILE IS ABOVE -1: TILE IS BELOW 0 : SAME LEVEL *
   *****************************************************/

  getPositionRelativeToTile(elevation, tile) {
    if (elevation < tile.range[0]) return 1;
    if (elevation > tile.range[1]) return -1;
    return 0;
  }
}
