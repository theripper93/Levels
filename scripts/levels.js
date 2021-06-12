class Levels {
  constructor() {
    this.DEBUG = false;
    this.floorContainer = new PIXI.Container();
    this.floorContainer.spriteIndex = {};
    this.occlusionIndex = {};
    this.lastReleasedToken = undefined;
    this.UI = game.user.isGM ? new LevelsUI() : undefined;
  }

  /**********************************************
   * INITIALIZE LEVELS FOR THE FIRST TIME *
   **********************************************/

  static get() {
    Levels._instance = new Levels();
    Levels._instance.floorContainer.sortableChildren = true;
    canvas.background.addChild(Levels._instance.floorContainer);
    canvas["levelsLayer"] = new CanvasLayer();
    if(this.UI) Levels._instance.UI.readLevels();
    return Levels._instance;
  }

  getTileBoundingBox(tile) {
    let tileZZ = {
      x: tile.center.x - tile.width / 2,
      y: tile.center.y - tile.height / 2,
    };
    let tileCorners = [
      { x: tileZZ.x, y: tileZZ.y }, //tl
      { x: tileZZ.x + tile.width, y: tileZZ.y }, //tr
      { x: tileZZ.x + tile.width, y: tileZZ.y + tile.height }, //br
      { x: tileZZ.x, y: tileZZ.y + tile.height }, //bl
    ];
    return new PIXI.Polygon(tileCorners);
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
        let { rangeBottom, rangeTop, isLevel } = this.getFlagsForObject(tile);
        if (!rangeBottom) continue;
        tile.isLevel = isLevel;
        tiles.push({
          tile: tile,
          poly: tile.roomPoly,
          range: [rangeBottom, rangeTop],
        });
      }
    }
    return tiles;
  }

  computeTile(tile, altitude, lights) {
    if (tile.range[1] != Infinity) tile.tile.visible = false;
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

  refreshTokens(overrideToken = undefined) {
    let cToken = overrideToken || canvas.tokens.controlled[0];
    if (!cToken) return;
    let perfEnd, perfStart;
    if (_levels.DEBUG) perfStart = performance.now();
    let allTiles = _levels.findAllTiles();
    let holes = _levels.getHoles();
    let tokensState = this.getTokensState(allTiles);
    let tokenPov = _levels.computeTokens(
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
    return tokenPov;
  }

  computeTokens(tokens, elevation, holes, cTokenElev, ctokenId) {
    let tokenPov = [];
    tokens.forEach((t) => {
      if (t.token.id != ctokenId && !t.token.data.hidden) {
        if (!(t.range[1] >= elevation && t.range[0] <= elevation)) {
          let isInHole = this.isTokenInHole(t, holes);
          if (!this.isInsideHoleRange(isInHole, t, cTokenElev)) {
            t.token.levelsHidden = true;
            t.token.icon.alpha = 0;
            tokenPov.push({ token: t, visible: t.token.isVisible });
            this.getTokenIconSprite(t.token);
          } else {
            t.token.visible = false;
            tokenPov.push({ token: t, visible: false });
            this.removeTempToken(t.token);
          }
        } else {
          t.token.levelsHidden = false;
          t.token.icon.alpha = 1;
          tokenPov.push({ token: t, visible: t.token.isVisible });
          this.removeTempToken(t.token);
        }
      }
    });
    return tokenPov;
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
      return { token: token, range: [0, Infinity] }; //return { token: token, range: [0, elevation] };
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
      return { token: token, range: [0, levelTile.range[0] - 1] };
    }
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
    sprite.zIndex = tileIndex.range[0];
    this.floorContainer.spriteIndex[tile.id] = sprite;
    this.floorContainer.addChild(sprite);
  }

  _onElevationChangeUpdate(overrideElevation = undefined) {
    let perfEnd, perfStart;
    if (_levels.DEBUG) perfStart = performance.now();
    let cToken = overrideElevation || canvas.tokens.controlled[0];
    if (!cToken) return;
    let allTiles = this.findAllTiles();
    let lights = this.getLights();
    let holes = this.getHoles();
    let tilesIsIn = this.findRoomsTiles(cToken, allTiles);
    allTiles.forEach((tile) => {
      this.clearLights(lights);
      this.computeLightsForTile(tile, lights, cToken.data.elevation, holes);
      this.computeTile(
        tile,
        _levels.getPositionRelativeToTile(cToken.data.elevation, tile),
        lights
      );
    });
    tilesIsIn.forEach((tile) => {
      this.computeLightsForTile(tile, lights, cToken.data.elevation, holes);
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
    canvas.lighting.refresh();
    canvas.lighting.placeables.forEach((l) => l.updateSource());
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
    //if(!tile.poly.contains(light.light.center.x,light.light.center.y)) return
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

  unoccludeLights(tileIndex, light, justTile = false) {
    let tile = !justTile ? tileIndex.tile : tileIndex;
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
    canvas.drawings.placeables.forEach((drawing) => {
      let  { rangeBottom, rangeTop, drawingMode } = this.getFlagsForObject(drawing);
      if (drawingMode == 1 && rangeBottom) {
        let p = new PIXI.Polygon(this.adjustPolygonPoints(drawing));
        holes.push({
          poly: p,
          range: [rangeBottom, rangeTop],
        });
      }
    });
    return holes;
  }

  getStairs() {
    let holes = [];
    canvas.drawings.placeables.forEach((drawing) => {
      let  { rangeBottom, rangeTop, drawingMode } = this.getFlagsForObject(drawing);
      if (drawingMode == 2 && rangeBottom !=-Infinity && rangeTop!=Infinity) {
        let p = new PIXI.Polygon(this.adjustPolygonPoints(drawing));
        holes.push({
          poly: p,
          range: [rangeBottom, rangeTop+1],
        });
      }
    });
    return holes;
  }

  getLights() {
    let lights = [];
    canvas.lighting.placeables.forEach((light) => {
      let { rangeBottom, rangeTop } = this.getFlagsForObject(light);
      if (rangeBottom) {
        lights.push({
          light: light,
          range: [rangeBottom, rangeTop],
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

  showOwnedTokensForPlayer() {
    canvas.tokens.placeables.forEach((t) => {
      if (t.actor.testUserPermission(game.user, 2)) {
        t.visible = true;
        t.icon.alpha = 1;
      }
    });
  }

  /*****************************************************
   * 1: TILE IS ABOVE -1: TILE IS BELOW 0 : SAME LEVEL *
   *****************************************************/

  getPositionRelativeToTile(elevation, tile) {
    if (elevation < tile.range[0]) return 1;
    if (elevation > tile.range[1]) return -1;
    return 0;
  }

  getWallHeightRange(wall) {
    let wallRange = [
      wall.data.flags.wallHeight?.wallHeightBottom,
      wall.data.flags.wallHeight?.wallHeightTop,
    ];
    if (!wallRange[0] && !wallRange[1]) return false;
    else return wallRange;
  }

  computeDoors(cToken) {
    if (!cToken && !game.user.isGM) {
      for (let d of canvas.controls.doors.children) {
        d.visible = false;
      }
      return;
    }

    if (!cToken) return;
    let tElev = cToken.data.elevation;
    for (let d of canvas.controls.doors.children) {
      let range = this.getWallHeightRange(d.wall);
      if (!range) continue;
      if (!(tElev >= range[0] && tElev < range[1])) {
        d.visible = false;
      }
    }
  }

  getFlagsForObject(object) {
    let rangeTop = object.document.getFlag(_levelsModuleName, "rangeTop");
    let rangeBottom = object.document.getFlag(_levelsModuleName, "rangeBottom");
    if (!rangeTop && rangeTop!= 0) rangeTop = Infinity;
    if (!rangeBottom && rangeBottom!= 0) rangeBottom = -Infinity;
    let isLevel = rangeTop == Infinity ? false : true;
    if (rangeTop == Infinity && rangeBottom == -Infinity) return false;
    let drawingMode = object.document.getFlag(
      _levelsModuleName,
      "drawingMode"
    ) || 0;
    return { rangeBottom, rangeTop, isLevel, drawingMode };
  }

  async migrateFlags() {
    ui.notifications.error(
      `WARNING! Migrating Levels to new model please don't touch anything!`
    );
    let migrated = 0;
    async function migrateForObject(object) {
      let oldLevelsFlag = object.getFlag(
        _levelsModuleName,
        "heightRange"
      );
      if (!oldLevelsFlag) return;
      let splitFlag = oldLevelsFlag.split(",");
      if (splitFlag.length != 2) {
        await object.unsetFlag(_levelsModuleName,"heightRange");
        return;
      }
      let range0 = parseInt(splitFlag[0]);
      let range1 =
        splitFlag[1].toLowerCase() == "infinity"
          ? Infinity
          : parseInt(splitFlag[1]);
      await object.setFlag(_levelsModuleName, "rangeBottom", range0);
      await object.setFlag(_levelsModuleName, "rangeTop", range1);
      await object.unsetFlag(_levelsModuleName,"heightRange");
      migrated++;
    }
    for (let scene of Array.from(game.scenes)) {
      for (let object of Array.from(scene.data.tiles)) {
        await migrateForObject(object);
      }
      for (let object of Array.from(scene.data.lights)) {
        await migrateForObject(object);
      }
      for (let object of Array.from(scene.data.drawings)) {
        await migrateForObject(object);
      }
    }

    ui.notifications.info(`Migration completed: Migrated ${migrated} Entities - You can disable migration on startup in the module settings. Remember to also Update Better Roofs`);
  }
}
