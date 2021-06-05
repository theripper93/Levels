/***********************************************************************************
 * BETTERROOFS CLASS, CONTAINS THE DATA NEEDED FOR FASTER SIGHT REFRESH PROCESSING *
 ***********************************************************************************/

class Levels {
  constructor() {
    this.DEBUG = false;
    this.floorContainer = new PIXI.Container();
    this.floorContainer.spriteIndex = {};
  }

  /**********************************************
   * INITIALIZE THE ROOFS FOR THE FIRST TIME *
   **********************************************/

  static get() {
    Levels._instance = new Levels();
    canvas.background.addChild(Levels._instance.floorContainer);
    //canvas.lighting.coloration.addChild(Levels._instance.occlusionContainer);
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
        tiles.push({
          tile: tile,
          poly: tile.roomPoly,
          range: [parseInt(range[0]), parseInt(range[1])],
        });
      }
    }
    return tiles;
  }

  computeTile(tile, altitude) {
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

  computeTokens(tokens, elevation, holes,cTokenElev,ctokenId) {
    tokens.forEach((t) => {
      if(t.token.id != ctokenId){
        if (!(t.range[1] >= elevation && t.range[0] <= elevation)) {
          let isInHole = this.isTokenInHole(t, holes);
          if (!isInHole || (t.token.data.elevation <= isInHole.range[1] && t.token.data.elevation >= isInHole.range[0] && !(cTokenElev <= isInHole.range[1] && cTokenElev >= isInHole.range[0]))) {
            t.token.visible = false;
          }
        }
      }
    });
  }

  isTokenInHole(t, holes) {
    for(let hole of holes){
      if ((t.range[1] <= hole.range[1] && t.range[0] >= hole.range[0]) && hole.poly.contains(t.token.center.x,t.token.center.y)) {
        return hole;
      }
    };
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
      return { token: token, range: [0, elevation] };
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
    this.floorContainer.spriteIndex[tile.id] = sprite;
    this.floorContainer.addChild(sprite);
  }

  occludeLights(tileIndex) {
    let tile = tileIndex.tile;
    let oldSprite = this.occlusionContainer.children.find((c) => c.name == tile.id);
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
    sprite.tint = 0x000000
    this.occlusionContainer.spriteIndex[tile.id] = sprite;
    this.occlusionContainer.addChild(sprite);
    
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
      (d) => d.data.text.includes("levelsHole") && d.data.points.length != 0
    );
    holeDrawings.forEach((drawing) => {
      let p = new PIXI.Polygon(this.adjustPolygonPoints(drawing));
      let range = drawing.data.text.split("|")[1].split(",");
      holes.push({ poly: p, range: [parseInt(range[0]),parseInt(range[1])] });
    });
    return holes;
  }

  adjustPolygonPoints(drawing) {
    let globalPoints = [];
    drawing.data.points.forEach((p) => {
      globalPoints.push(p[0] + drawing.x, p[1] + drawing.y);
    });
    return globalPoints;
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
