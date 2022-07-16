let _levels;

class Levels {
  constructor() {
    this.DEBUG = false;
    this.RAYS = game.settings.get(CONFIG.Levels.MODULE_ID, "debugRaycast");
    this.CONSTS = {};
    this.CONSTS.COLLISIONTYPE = {
      sight: 0,
      collision: 1,
    };
    this.floorContainer = new PIXI.Container();
    this.floorContainer.spriteIndex = {};
    this.overContainer = new PIXI.Container();
    this.overContainer.spriteIndex = {};
    this.fogContainer = new PIXI.Container();
    this.fogContainer.spriteIndex = {};
    this.lightOcclusion = new PIXI.Container();
    this.lightOcclusion.spriteIndex = {};
    this.tokenRevealFogContainer = new PIXI.Container();
    this.tokenRevealFogContainer.spriteIndex = {};
    this.occlusionIndex = {};
    this.lastReleasedToken = undefined;
    this.levelsTiles = [];
    this.levelsHoles = [];
    this.fogHiding = game.settings.get(CONFIG.Levels.MODULE_ID, "fogHiding");
    this.useCollision3D = game.modules.get("levels-3d-preview")?.active && canvas.scene.getFlag("levels-3d-preview","object3dSight");
    this.elevationScale = game.settings.get(
      CONFIG.Levels.MODULE_ID,
      "tokenElevScale"
    );
    this.advancedLOS = true;
    this.preciseTokenVisibility = game.settings.get(
      CONFIG.Levels.MODULE_ID,
      "preciseTokenVisibility"
    );
    this.exactTokenVisibility = game.settings.get(
      CONFIG.Levels.MODULE_ID,
      "exactTokenVisibility"
    );
    this.tokenElevScaleMultiSett = game.settings.get(
      CONFIG.Levels.MODULE_ID,
      "tokenElevScaleMultiSett"
    );
    this.hideElevation = game.settings.get(CONFIG.Levels.MODULE_ID, "hideElevation");
    this.revealTokenInFog = game.settings.get(CONFIG.Levels.MODULE_ID, "revealTokenInFog");
    this.UI = game.user.isGM ? new LevelsUI() : undefined;
    //Module Compatibility
    this.modules = {};
    this.modules.PerfectVision = {};
    this.modules.PerfectVision.Active =
      game.modules.get("perfect-vision")?.active;
    this.debouncedElevationChange = debounce( this._onElevationChangeUpdate, 10);
  }

  /**********************************************
   * INITIALIZE LEVELS FOR THE FIRST TIME *
   **********************************************/

  static get() {
    Levels._instance = new Levels();
    Levels._instance.floorContainer.sortableChildren = true;
    //canvas.sight.explored.addChild(Levels._instance.fogContainer);
    //canvas.sight.explored.addChild(Levels._instance.tokenRevealFogContainer);
    canvas["levelsLayer"] = new CanvasLayer();
    if (this.UI) Levels._instance.UI.readLevels();
    return Levels._instance;
  }

  findAllTiles() {
    let tiles = [];
    for (let tile of canvas.tiles.placeables.filter(t => t.document.overhead)) {
      if (tile.data.hidden) continue;
      if (tile.roomPoly) {
        let {
          rangeBottom,
          rangeTop,
          isLevel,
          showIfAbove,
          isBasement,
          showAboveRange,
          noFogHide,
        } = this.getFlagsForObject(tile);
        if (!rangeBottom && rangeBottom != 0) continue;
        tile.isLevel = isLevel;
        tiles.push({
          tile: tile,
          poly: tile.roomPoly,
          range: [rangeBottom, rangeTop],
          showIfAbove: showIfAbove,
          isBasement: isBasement,
          showAboveRange: showAboveRange,
          noFogHide: noFogHide,
        });
      } else {
        let {
          rangeBottom,
          rangeTop,
          isLevel,
          showIfAbove,
          isBasement,
          showAboveRange,
          noFogHide,
        } = this.getFlagsForObject(tile);
        if (!rangeBottom && rangeBottom != 0) continue;
        tile.isLevel = isLevel;
        let tileZZ = {
          x: tile.center.x - tile.data.width / 2,
          y: tile.center.y - tile.data.height / 2,
        };
        let tileCorners = [
          { x: tileZZ.x, y: tileZZ.y }, //tl
          { x: tileZZ.x + tile.data.width, y: tileZZ.y }, //tr
          { x: tileZZ.x + tile.data.width, y: tileZZ.y + tile.data.height }, //br
          { x: tileZZ.x, y: tileZZ.y + tile.data.height }, //bl
        ];
        tiles.push({
          tile: tile,
          poly: new PIXI.Polygon(tileCorners),
          range: [rangeBottom, rangeTop],
          levelsOverhead: true,
          showIfAbove: showIfAbove,
          isBasement: isBasement,
          showAboveRange: showAboveRange,
          noFogHide: noFogHide,
        });
      }
    }
    this.levelsTiles = tiles;
    return tiles;
  }

  computeTile(tile, altitude, lights) {
    //Declare constants

    const cToken = canvas.tokens.controlled[0] || _levels.lastReleasedToken;
    const cTokenElev = cToken ? cToken.losHeight : this.currentElevation;
    const cTokenLos = cToken
      ? cToken.losHeight
      : this.currentElevation;

    //If a tile is not a roof and it's not set to show if it's above, hide it

    if (tile.range[1] != Infinity && !tile.showIfAbove) {
      tile.tile.visible = false;
    }

    //If a tile is a roof, hide it if the token is underground, otherwise show it

    if (tile.range[1] == Infinity) {
      if (cTokenElev < 0) {
        tile.tile.visible = false;
        tile.tile.isLevel = true;
      } else {
        if (altitude == 1) {
          tile.tile.visible = true;
          tile.tile.isLevel = false;
        } else {
          tile.tile.visible = false;
          tile.tile.isLevel = true;
        }
      }
      if (cTokenLos >= tile.range[0]) tile.tile.dontMask = true;
      else tile.tile.dontMask = false;
    }

    //Compute the visibility of show if it's above tiles separately as they are a special case

    if (tile.showIfAbove && tile.range[1] != Infinity && altitude == 1) {
      if (tile.range[0] - cTokenElev <= tile.showAboveRange) {
        tile.tile.isLevel = true;
        tile.tile.visible = true;
      } else {
        tile.tile.visible = false;
        tile.tile.isLevel = true;
      }
    } else if (tile.showIfAbove && tile.range[1] != Infinity && altitude != 1) {
      tile.tile.visible = false;
      tile.tile.isLevel = true;
    }

    //If a tile is set as levelsOveerhead  hide it

    if (tile.levelsOverhead) tile.tile.visible = false;

    //Compute the tile mirroring in the background

    switch (altitude) {
      case 1: // If the tile is above the token, remove it from the stack
        return false;
        break;
      case -1: //If a tile is below a token render it in the stack unless the user specified otherwise with isBsement, in wich case add it to the stack only if the token is below ground
        return false;
        break;
      case 0: //If the tile is on the same level as the token, If the tile is set as overhead tile within a level, set it to visible and remove that tile from the stack, otherwise, add it to the stack
        if (tile.levelsOverhead) {
          tile.tile.visible = true;
        }
        return tile;
        break;
    }
    tile.tile.isLevelsVisible = tile.tile.visible;
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

  computeTokens(tokens, elevation, holes, cTokenElev, ctokenId) {
    let tokenPov = [];
    tokens.forEach((t) => {
      if (t.token.id != ctokenId && !t.token.data.hidden) {
        if (!(t.range[1] >= elevation && t.range[0] <= elevation)) {
          let isInHole = this.isTokenInHole(t, holes);
          if (!this.isInsideHoleRange(isInHole, t, cTokenElev)) {
            t.token.levelsHidden = true;
            t.token.refresh()
            tokenPov.push({ token: t, visible: t.token.isVisible });
          } else {
            t.token.visible = false;
            tokenPov.push({ token: t, visible: false });
          }
        } else {
          t.token.levelsHidden = false;
          if (t.token.icon) t.token.refresh()
          tokenPov.push({ token: t, visible: t.token.isVisible }); 
        }
      }
    });
    return tokenPov;
  }

  advancedLosTokenRefresh() {
    this.getHoles();
  }

  


  collateVisions() {
    const gm = game.user.isGM;
    let ownedTokens = canvas.tokens.placeables.filter(
      (token) => token.isOwner && (!token.data.hidden || gm)
    );
    if(ownedTokens.length === 0 || !canvas.tokens.controlled[0]) ownedTokens = canvas.tokens.placeables.filter(
      (token) => (token.observer || token.isOwner) && (!token.data.hidden || gm)
    );
    for (let token of canvas.tokens.placeables) {
      if (ownedTokens.includes(token)) continue;
      let tokenVisible = canvas.scene.data.tokenVision ? false : gm || !token.data.hidden
      for (let ownedToken of ownedTokens) {
        if (this.advancedLosTestVisibility(ownedToken, token))
          tokenVisible = true;
      }
      token.visible = tokenVisible;
      token.levelsVisible = token.visible;
    }
    for (let t of ownedTokens) {
      t.visible = !t.data.hidden || gm;
      t.levelsVisible = !t.data.hidden || gm;
    }
  }

  compute3DCollisionsForToken(sourceToken) {
    if (!sourceToken) return;
    for (let token of canvas.tokens.placeables) {
        if(token._controlled) continue;
      token.visible = this.advancedLosTestVisibility(sourceToken, token);
      token.levelsVisible = token.visible;
      if (token.data.elevation > sourceToken.data.elevation && token.visible) {
        token.levelsHidden = true;
      } else if (
        token.data.elevation < sourceToken.data.elevation &&
        token.visible
      ) {
        token.levelsHidden = true;
      } else if (
        (token.data.elevation == sourceToken.data.elevation && token.visible) ||
        !token.visible
      ) {
        token.levelsHidden = false;
      }
      this.generateFogVisionMask(token)
    }
  }

  generateFogVisionMask(token) {
    if (!this.revealTokenInFog) {
      this.tokenRevealFogContainer.removeChildren();
      this.tokenRevealFogContainer.spriteIndex = {};
      return;
    }
    if (this.tokenRevealFogContainer.spriteIndex[token.id]) {
      this.tokenRevealFogContainer.spriteIndex[token.id].position.x =
        token.center.x;
      this.tokenRevealFogContainer.spriteIndex[token.id].position.y =
        token.center.y;
      return;
    }
    let g = new PIXI.Graphics();
    g.beginFill(0xffffff, 0.75);
    g.drawCircle(
      0,
      0,
      (Math.max(token.h, token.w) / 2) * token.data.scale * Math.SQRT2
    );
    g.endFill();
    let s = new PIXI.Sprite();
    s.addChild(g);
    s.position.x = token.center.x;
    s.position.y = token.center.y;
    let visibleTimeout = false;
    Object.defineProperty(s, "visible", {
      get() {
        const isVisible =
          _levels.revealTokenInFog &&
          token.visible &&
          canvas.tokens.controlled[0] &&
          !token._controlled;
        if (isVisible) {
          setTimeout(() => {
            visibleTimeout = true;
          }, 50);
          return visibleTimeout;
        } else {
          visibleTimeout = false;
          return false;
        }
        //return _levels.revealTokenInFog && token.visible && (!token.isOwner || game.user.isGM);
      },
    });
    s.name = token.id;
    this.tokenRevealFogContainer.addChild(s);
    this.tokenRevealFogContainer.spriteIndex[token.id] = s;
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

  computeFog(tiles){
    for(const tileIndex of tiles){
      if(!this.fogHiding) {
        this.obscureFogForTile(tileIndex);
        continue;
      }
      if(!this.floorContainer.spriteIndex[tileIndex.tile.id]?.parent){
        this.clearFogForTile(tileIndex);
      }else{
        this.obscureFogForTile(tileIndex);
      }
    }
  }

  obscureFogForTile(tileIndex) {
    if (tileIndex.noFogHide === true) return this.clearFogForTile(tileIndex);
    if(!this.fogHiding) return;
    let tile = tileIndex.tile;
    let oldSprite = this.fogContainer.children.find((c) => c.name == tile.id);
    let tileImg = tile.tile;
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
    sprite.tint = 0x000000;
    this.fogContainer.spriteIndex[tile.id] = sprite;
    this.fogContainer.addChild(sprite);
  }

  clearFogForTile(tileIndex) {
    if (!this.fogHiding) return;
    let tile = tileIndex.tile;
    let sprite = this.fogContainer.children.find((c) => c.name == tile.id);
    if (sprite) this.fogContainer.removeChild(sprite);
  }

  _onElevationChangeUpdate(overrideElevation = undefined) {
    if (!this.init && canvas.scene.tokenVision) this._levelsOnSightRefresh();
    let perfEnd, perfStart;
    if (_levels.DEBUG) perfStart = performance.now();
    let cToken = overrideElevation || canvas.tokens.controlled[0];
    if (!cToken || (!canvas.tokens.controlled[0] && game.user.isGM)) return;
    let allTiles = this.findAllTiles();
    let holes = this.getHoles();
    if (this.elevationScale) this.updateScales();
    this.computeSounds(cToken);
    this.computeDrawings(cToken);
    let lights = this.getLights();
    for (let light of lights) {
      this.lightComputeRender(light, cToken.losHeight, holes, allTiles);
    }
    allTiles.forEach((tile) => {
      this.computeTile(
        tile,
        this.getPositionRelativeToTile(cToken.losHeight, tile),
        lights
      );
    });
    this.computeFog(allTiles);
    if (_levels.DEBUG) {
      perfEnd = performance.now();
      console.log(
        `Levels _onElevationChangeUpdate took ${
          perfEnd - perfStart
        } ms, FPS:${Math.round(canvas.app.ticker.FPS)}, Tiles: `,
        allTiles,
        `Lights: `,
        lights,
        `Holes: `,
        holes
      );
    }
    canvas.perception.schedule({
      lighting: { initialize: true /* calls updateSource on each light source */, refresh: true },
      sight: { initialize: true /* calls updateSource on each token */, refresh: true /* you probably to refesh sight as well */, forceUpdateFog: true /* not sure if you need this */ },
      foreground: { refresh: true /* calls updateOcclusion */}
    });
    Hooks.callAll("levelsOnElevationChangeUpdate", this, cToken);
  }

  lightComputeRender(lightIndex, elevation, holes, allTiles) {
    this.lightClearOcclusions(lightIndex);
    lightIndex.light.source.skipRender = !(
      lightIndex.range[0] <= elevation && lightIndex.range[1] >= elevation
    );
    if (
      lightIndex.range[1] <= elevation &&
      this.lightIluminatesHole(lightIndex, holes, elevation)
    ) {
      lightIndex.light.source.skipRender = false;
      this.lightComputeOcclusion(lightIndex, elevation, allTiles);
    }
  }

  lightComputeOcclusion(lightIndex, elevation, allTiles) {
    let occlusionTiles = [];
    for (let tile of allTiles) {
      if (
        tile.range[0] <= elevation &&
        tile.range[0] >= lightIndex.range[1]
        /*!(
          lightIndex.range[0] >= tile.range[0] &&
          lightIndex.range[1] <= tile.range[1]
        )*/
      ) {
        occlusionTiles.push(tile);
      }
    }
    lightIndex.light.occlusionTiles = occlusionTiles;
    for (let tile of occlusionTiles) {
      this.occludeLights(tile, lightIndex);
    }
  }

  lightClearOcclusions(lightIndex) {
    this.lightOcclusion.spriteIndex[lightIndex.light.id]?.removeChildren();
  }

  _levelsOnSightRefresh() {
    let perfStart, perfEnd;
    if (this.DEBUG) perfStart = performance.now();
    let cToken = canvas.tokens.controlled[0];
    if (cToken) {
      this.debounce3DRefresh(32);
    }

    if (this.DEBUG) {
      perfEnd = performance.now();
      console.log(
        `_levelsOnSightRefresh took ${perfEnd - perfStart} ms, FPS:${Math.round(
          canvas.app.ticker.FPS
        )}`
      );
    }
  }

  computeTemplates(source) {
    if (!source) return;
    let tokenpos = {
      x: source.center.x,
      y: source.center.y,
      z: source.losHeight,
    };
    for (let template of canvas.templates.placeables) {
      let templatepos = {
        x: template.center.x,
        y: template.center.y,
        z: template.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation") ?? 0,
      };
      template.visible = !this.testCollision(tokenpos, templatepos, "sight", source);
      const highlight = canvas.grid.getHighlightLayer(`Template.${template.id}`)
      if(highlight)highlight.visible = template.visible;
    }
  }

  showTemplatesForGM() {
    for (let template of canvas.templates.placeables) {
      template.visible = true;
    }
  }

  updateScales() {
    if (this.elevationScale) {
      canvas.tokens.placeables.forEach((token) => {
        let elevScaleFactor = 1;
        if (canvas.tokens.controlled[0]) {
          let HeightDiff = Math.abs(
            token.data.elevation - canvas.tokens.controlled[0].data.elevation
          );
          if (HeightDiff === 0) HeightDiff = 1;
          let HeightDiffFactor = Math.sqrt(HeightDiff / 8);
          elevScaleFactor =
            this.tokenElevScaleMultiSett / HeightDiffFactor > 1
              ? 1
              : this.tokenElevScaleMultiSett / HeightDiffFactor;
          token.elevationScaleFactor =
            token.id != canvas.tokens.controlled[0].id ? elevScaleFactor : 1;
        }
        token.refresh();
      });
    } else {
      canvas.tokens.placeables.forEach((token) => {
        token.elevationScaleFactor = 1;
        token.refresh();
      });
    }
  }

  clearLights(lights) {
    lights.forEach((lightIndex) => {
      lightIndex.light.source.skipRender = false;
    });
  }

  debounce3DRefresh(timeout, force = false) {
    if (!this.updateQueued || force) {
      this.updateQueued = true;
      setTimeout(() => {
        let cToken = canvas.tokens.controlled[0];
        if (!canvas.tokens.controlled[0] && !game.user.isGM || (!canvas.tokens.controlled[0]?.data?.vision || canvas.tokens.controlled.length !== 1)) {
          this.collateVisions();
        }else{
          this.compute3DCollisionsForToken(cToken);
        }
        this.computeTemplates(cToken);
        this.updateQueued = false;
      }, timeout);
    }
  }

  debounceElevationChange(timeout, token) {
    if (!this.updateQueued) {
      this.elevUpdateQueued = true;
      setTimeout(() => {
        this._onElevationChangeUpdate(token);
        this.elevUpdateQueued = false;
      }, timeout);
    }
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
    if (!light.light.source.los || !light.light.center) return false;
    for (let hole of holes) {
      if (
        elevation <= hole.range[1] &&
        elevation >= hole.range[0] &&
        hole.poly.contains(light.light.center.x, light.light.center.y)
      ) {
        return true;
      }
      for (let i = 0; i < light.light.source.los.points.length; i += 2) {
        if (
          elevation <= hole.range[1] &&
          elevation >= hole.range[0] &&
          hole.poly.contains(
            light.light.source.los.points[i],
            light.light.source.los.points[i + 1]
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  occludeLights(tileIndex, light) {
    const lightId = light.light.id
    light.light.source._lightId = lightId;
    let tile = tileIndex.tile;
    let tileImg = tile.tile;
    if (!tileImg || !tileImg.texture.baseTexture) return;
    let sprite;
    if (!tile._levelsAlphaMap)
      this._createAlphaMap(tile, { keepPixels: true, keepTexture: true });
    sprite = this.getLightOcclusionSprite(tile); //this.getTileSprite(undefined, tileImg, tile);
    sprite.tint = 0x000000;
    sprite.name = tile.id;
      if(!this.lightOcclusion.spriteIndex[lightId]){
        this.lightOcclusion.spriteIndex[lightId] = new PIXI.Container();
      }
    this.lightOcclusion.spriteIndex[lightId].addChild(sprite);
  }

  getLightOcclusionSprite(tile) {
    if (!tile._levelsAlphaMap.texture) return undefined;
    const s = new PIXI.Sprite(tile._levelsAlphaMap.texture);
    const t = tile.tile;
    s.width = t.width;
    s.height = t.height;
    s.anchor.set(0.5, 0.5);
    s.position.set(tile.data.x + t.position.x, tile.data.y + t.position.y);
    s.rotation = t.rotation;
    return s;
  }

  _createAlphaMap(tile, { keepPixels = false, keepTexture = false } = {}) {
    // Destroy the previous texture
    if (tile._levelsAlphaMap?.texture) {
      tile._levelsAlphaMap.texture.destroy(true);
      delete tile._levelsAlphaMap.texture;
    }

    // If no tile texture is present
    const aw = Math.abs(tile.data.width);
    const ah = Math.abs(tile.data.height);
    if (!tile.texture)
      return (tile._levelsAlphaMap = { minX: 0, minY: 0, maxX: aw, maxY: ah });

    // Create a temporary Sprite
    const sprite = new PIXI.Sprite(tile.texture);
    sprite.width = tile.data.width;
    sprite.height = tile.data.height;
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(aw / 2, ah / 2);

    // Color matrix filter the sprite to pure white
    const cmf = new PIXI.filters.ColorMatrixFilter();
    cmf.matrix = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]; // Over-multiply alpha to remove transparency
    sprite.filters = [cmf];

    // Render to a texture and extract pixels
    const tex = PIXI.RenderTexture.create({ width: aw, height: ah });
    canvas.app.renderer.render(sprite, tex);
    const pixels = canvas.app.renderer.extract.pixels(tex);

    // Construct an alpha mapping
    const map = {
      pixels: new Uint8Array(pixels.length / 4),
      texture: undefined,
      minX: undefined,
      minY: undefined,
      maxX: undefined,
      maxY: undefined,
    };

    // Keep the texture?
    if (keepTexture) map.texture = tex;
    else tex.destroy(true);

    // Map the alpha pixels
    for (let i = 0; i < pixels.length; i += 4) {
      const n = i / 4;
      const a = pixels[i + 3];
      map.pixels[n] = a > 0 ? 1 : 0;
      if (a > 0) {
        const x = n % aw;
        const y = Math.floor(n / aw);
        if (map.minX === undefined || x < map.minX) map.minX = x;
        else if (map.maxX === undefined || x > map.maxX) map.maxX = x;
        if (map.minY === undefined || y < map.minY) map.minY = y;
        else if (map.maxY === undefined || y > map.maxY) map.maxY = y;
      }
    }

    // Maybe discard the raw pixels
    if (!keepPixels) map.pixels = undefined;
    return (tile._levelsAlphaMap = map);
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
    for(let drawing of canvas.drawings.placeables){
      let { rangeBottom, rangeTop, drawingMode } =
        this.getFlagsForObject(drawing);
      if (drawingMode == 1 && (rangeBottom || rangeBottom == 0)) {
        let p = new PIXI.Polygon(this.adjustPolygonPoints(drawing));
        holes.push({
          poly: p,
          range: [rangeBottom, rangeTop],
        });
      }
    };
    this.levelsHoles = holes;
    return holes;
  }

  getStairs() {
    let holes = [];
    for(let drawing of canvas.drawings.placeables){
      let { rangeBottom, rangeTop, drawingMode } =
        this.getFlagsForObject(drawing);
      let isLocked = drawing.document.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked");
      if (
        (drawingMode == 2 || drawingMode == 3) &&
        rangeBottom != -Infinity &&
        rangeTop != Infinity &&
        !isLocked
      ) {
        let p = new PIXI.Polygon(this.adjustPolygonPoints(drawing));
        holes.push({
          drawing: drawing,
          poly: p,
          range: [rangeBottom, rangeTop + 1],
          drawingMode: drawingMode,
        });
      }
    };
    return holes;
  }

  executeStairs(updates, token) {
    if ("x" in updates || "y" in updates) {
      let stairs = _levels.getStairs();
      let tokenX = updates.x || token.data.x;
      let tokenY = updates.y || token.data.y;
      let newUpdates;
      let tokenElev = updates.elevation || token.data.elevation;
      let gridSize = canvas.scene.dimensions.size;
      let newTokenCenter = {
        x: tokenX + (gridSize * token.data.width) / 2,
        y: tokenY + (gridSize * token.data.height) / 2,
      };
      let inStair;
      for (let stair of stairs) {
        if (stair.poly.contains(newTokenCenter.x, newTokenCenter.y)) {
          if (token.inStair == stair.drawing.id) {
            inStair = stair.drawing.id;
          } else {
            if (stair.drawingMode == 2) {
              if (tokenElev <= stair.range[1] && tokenElev >= stair.range[0]) {
                if (tokenElev == stair.range[1]) {
                  inStair = stair.drawing.id;
                  newUpdates = { elevation: stair.range[0] };
                }
                if (tokenElev == stair.range[0]) {
                  inStair = stair.drawing.id;
                  newUpdates = { elevation: stair.range[1] };
                }
              }
            } else if (stair.drawingMode == 3) {
              if (tokenElev <= stair.range[1] && tokenElev >= stair.range[0]) {
                _levels.renderElevatorDalog(
                  stair.drawing.document.getFlag(
                    CONFIG.Levels.MODULE_ID,
                    "elevatorFloors"
                  ),
                  token
                );
                inStair = stair.drawing.id;
              }
            }
          }
        } else {
          inStair = inStair || false;
        }
      }
      token.inStair = inStair;
      if (!inStair) {
        $("#levels-elevator")
          .closest(".app")
          .find(`a[class="header-button close"]`)
          .click();
      }
      if (newUpdates) {
        const s = canvas.dimensions.size;
        const oldToken = canvas.tokens.get(token.id);
        const updateX = updates.x || oldToken.x;
        const updateY = updates.y || oldToken.y;
        const dist = Math.sqrt(
          Math.pow(oldToken.x - updateX, 2) + Math.pow(oldToken.y - updateY, 2)
        );
        const speed = s * 10;
        const duration = (dist * 1000) / speed;
        setTimeout(function () {
          token?.update(newUpdates);
        }, duration);
      }
    }
  }

  async renderElevatorDalog(levelsFlag) {
    let elevatorFloors = [];
    levelsFlag.split("|").forEach((f) => {
      elevatorFloors.push(f.split(","));
    });

    let content = `<div id="levels-elevator">`;

    elevatorFloors.forEach((f) => {
      content += `<div class="button">
      <button id="${f[0]}" class="elevator-level">${f[1]}</button>
    </div>`;
    });
    content += `<hr></div>`;

    let dialog = new Dialog({
      title: game.i18n.localize("levels.dialog.elevator.title"),
      content: content,
      buttons: {
        close: {
          label: game.i18n.localize("levels.yesnodialog.no"),
          callback: () => {},
        },
      },
      default: "close",
      close: () => {},
    });
    await dialog._render(true);
    let renderedFrom = $("body").find(`div[id="levels-elevator"]`);
    for (let btn of $(renderedFrom).find("button")) {
      $(btn).on("click", updateElev);
    }
    function updateElev(event) {
      let newElev = parseFloat(event.target.id);
      if (newElev || newElev == 0)
        canvas.tokens.controlled[0]?.document?.update({ elevation: newElev });
    }
  }

  getLights() {
    let lights = [];
    canvas.lighting.placeables.forEach((light) => {
      let { rangeBottom, rangeTop } = this.getFlagsForObject(light);
      if (rangeBottom || rangeBottom == 0) {
        lights.push({
          light: light,
          range: [rangeBottom, rangeTop],
        });
      }
    });
    canvas.tokens.placeables.forEach((token) => {
      if (
        (token.light.data.dim || token.light.data.bright)
      ) {
        lights.push({
          light: { source: token.light },
          range: this.getTokenLightRange(token),
        });
      }
    });
    return lights;
  }

  getTokenLightRange(token){
    const losHeight = token.losHeight;
    const tilesIsIn = this.levelsTiles.filter(tile => tile.poly.contains(token.center.x,token.center.y));
    let above = [Infinity];
    let below = [-Infinity];
    for(let tile of tilesIsIn){
      const rangeTop = tile.range[1]
      const rangeBottom = tile.range[0]
      if(rangeTop > losHeight) above.push(rangeTop)
      if(rangeTop < losHeight) below.push(rangeTop)
      if(rangeBottom > losHeight) above.push(rangeBottom)
      if(rangeBottom < losHeight) below.push(rangeBottom)
    }
    const top = Math.min(...above)
    const bottom = Math.max(...below)
    return [bottom,top]
  }

  computeSounds(cToken) {
    if (!cToken && !game.user.isGM) {
      for (let s of canvas.sounds.placeables) {
        s.levelsInaudible = false;
      }
      return;
    }

    if (!cToken) return;
    let tElev = cToken.data.elevation;
    for (let s of canvas.sounds.placeables) {
      let { rangeBottom, rangeTop } = this.getFlagsForObject(s);
      if (!rangeBottom && rangeBottom != 0) continue;
      if (!(tElev >= rangeBottom && tElev <= rangeTop)) {
        s.levelsInaudible = true;
      } else {
        s.levelsInaudible = false;
      }
    }
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
        drawing.x + drawing.data.width,
        drawing.y,
        drawing.x + drawing.data.width,
        drawing.y + drawing.data.height,
        drawing.x,
        drawing.y + drawing.data.height,
      ];
    }
    return globalPoints;
  }



  restoreGMvisibility() {
    let levelLigths = _levels.getLights();
    canvas.tiles.placeables.filter(t => t.document.overhead).forEach((t) => {
      t.visible = true;
      _levels.removeTempTile({ tile: t });
      levelLigths.forEach((light) => {
        _levels.unoccludeLights(t, light, true);
      });
    });
    _levels.floorContainer.removeChildren();
    _levels.floorContainer.spriteIndex = {};
    canvas.tokens.placeables.forEach((token) => {
      token.elevationScaleFactor = 1;
      token.visible = true;
      token.levelsVisible = true;
      token.refresh()
      token.levelsHidden = false;
      token.refresh();
    });
    _levels.clearLights(_levels.getLights());
    this.showTemplatesForGM();
    for(let d of canvas.drawings.placeables){
      d.visible = true
    };
    canvas.perception.schedule({
      lighting: { refresh: true },
      sight: { refresh: true }
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
    const {top, bottom} = WallHeight.getWallBounds(wall);
    let wallRange = [bottom, top];
    if (!wallRange[0] && !wallRange[1]) return false;
    else return wallRange;
  }

  computeDrawings(cToken) {
    if (!cToken) return;
    let tElev = cToken.data.elevation;
    for (let drawing of canvas.drawings.placeables) {
      const d = drawing;
      let { rangeBottom, rangeTop } = this.getFlagsForObject(d);
      if (!rangeBottom && rangeBottom != 0) continue;
      if (!(tElev >= rangeBottom && tElev <= rangeTop)) {
        d.visible = false;
      } else {
        d.visible = game.user.isGM || !d.data.hidden;
      }
    }
  }

  hideDrawings() {
    for(let d of canvas.drawings.placeables){
      let { rangeBottom, rangeTop } = this.getFlagsForObject(d);
      if (!rangeBottom && rangeBottom != 0) continue;
      d.visible = false;
    }
  }

  async migrateFlags() {
    ui.notifications.error(
      `WARNING! Migrating Levels to new model please don't touch anything!`
    );
    let migrated = 0;
    async function migrateForObject(object) {
      let oldLevelsFlag = object.getFlag(CONFIG.Levels.MODULE_ID, "heightRange");
      if (!oldLevelsFlag) return;
      let splitFlag = oldLevelsFlag.split(",");
      if (splitFlag.length != 2) {
        await object.unsetFlag(CONFIG.Levels.MODULE_ID, "heightRange");
        return;
      }
      let range0 = parseFloat(splitFlag[0]);
      let range1 =
        splitFlag[1].toLowerCase() == "infinity"
          ? Infinity
          : parseFloat(splitFlag[1]);
      await object.setFlag(CONFIG.Levels.MODULE_ID, "rangeBottom", range0);
      await object.setFlag(CONFIG.Levels.MODULE_ID, "rangeTop", range1);
      await object.unsetFlag(CONFIG.Levels.MODULE_ID, "heightRange");
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

    ui.notifications.info(
      `Migration completed: Migrated ${migrated} Entities - You can disable migration on startup in the module settings. Remember to also Update Better Roofs`
    );
  }





  raycastDebug() {
    if (_levels.RAYS && canvas.tokens.controlled[0]) {
      let oldcontainer = canvas.controls.debug.children.find(
        (c) => (c.name = "levelsRAYS")
      );
      if (oldcontainer) oldcontainer.clear();
      let g = oldcontainer || new PIXI.Graphics();
      g.name = "levelsRAYS";
      let ctk = canvas.tokens.controlled[0];
      canvas.tokens.placeables.forEach((t) => {
        if (this.preciseTokenVisibility === false) {
          let isCollision = _levels.checkCollision(ctk, t, "sight");
          let color = isCollision ? 0xff0000 : 0x00ff08;
          let coords = [ctk.center.x, ctk.center.y, t.center.x, t.center.y];
          if (ctk != t)
            g.beginFill(color)
              .lineStyle(1, color)
              .drawPolygon(coords)
              .endFill();
        } else {
          let targetLOSH = t.losHeight;
          let tol = 4;
          let sourceCenter = {
            x: ctk.center.x,
            y: ctk.center.y,
            z: ctk.losHeight,
          };
          let tokenCorners = [
            { x: t.center.x, y: t.center.y, z: targetLOSH },
            { x: t.x + tol, y: t.y + tol, z: targetLOSH },
            { x: t.x + t.w - tol, y: t.y + tol, z: targetLOSH },
            { x: t.x + tol, y: t.y + t.h - tol, z: targetLOSH },
            { x: t.x + t.w - tol, y: t.y + t.h - tol, z: targetLOSH },
          ];
          for (let point of tokenCorners) {
            let isCollision = this.testCollision(sourceCenter, point, "sight",t);
            let color = isCollision ? 0xff0000 : 0x00ff08;
            let coords = [ctk.center.x, ctk.center.y, point.x, point.y];
            if (ctk != t)
              g.beginFill(color)
                .lineStyle(1, color)
                .drawPolygon(coords)
                .endFill();
          }
        }
      });
      if (!oldcontainer) canvas.controls.debug.addChild(g);
    }
  }

  wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**********************************
   * MODULE COMPATIBILITY FUNCTIONS *
   **********************************/

  getPerfectVisionVisionRange(token) {
    let sightLimit = parseFloat(
      token.document.getFlag("perfect-vision", "sightLimit")
    );

    if (Number.isNaN(sightLimit)) {
      sightLimit = parseFloat(
        canvas.scene?.getFlag("perfect-vision", "sightLimit")
      );
    }
    return sightLimit;
  }

  /*****************
   * API FUNCTIONS *
   *****************/

  /**
   * Get the floor and ceiling of one or multiple tokens.
   * @param {Object|Object[]|String|String[]} tokenIds - A Token, an Array of Tokens, a Token ID or an Array of Tokens IDs
   * @returns {Object|Object[]} - returns an object containing token as the token object and range as an Array with 0 = Floor 1 = Ceiling
   **/

  getTokens(tokenIds) {
    console.error("_levels.getTokens has been deprecated.");
    return {}
  }

  /**
   * Get the floor and ceiling of one tile\drawing\light\sound object.
   * @param {Object} object - A Tile, Drawing, Light or Sound object
   * @returns {rangeBottom, rangeTop, isLevel, drawingMode} returns variables containing the flags data
   **/

  getFlagsForObject(object) {
    let rangeTop = object.document.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
    let rangeBottom = object.document.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
    if (!rangeTop && rangeTop !== 0) rangeTop = Infinity;
    if (!rangeBottom && rangeBottom !== 0) rangeBottom = -Infinity;
    let isLevel = rangeTop == Infinity ? false : true;
    if (
      rangeTop == Infinity &&
      canvas.tokens.controlled[0] &&
      canvas.tokens.controlled[0].data.elevation < 0
    )
      isLevel = true;
    if (rangeTop == Infinity && rangeBottom == -Infinity) return false;
    let drawingMode =
      object.document.getFlag(CONFIG.Levels.MODULE_ID, "drawingMode") || 0;
    let showIfAbove = object.document.getFlag(CONFIG.Levels.MODULE_ID, "showIfAbove");
    let isBasement = object.document.getFlag(CONFIG.Levels.MODULE_ID, "isBasement");
    let noFogHide = object.document.getFlag(CONFIG.Levels.MODULE_ID, "noFogHide");
    let showAboveRange = object.document.getFlag(
      CONFIG.Levels.MODULE_ID,
      "showAboveRange"
    );
    if (showAboveRange == undefined || showAboveRange == null)
      showAboveRange = Infinity;

    return {
      rangeBottom,
      rangeTop,
      isLevel,
      drawingMode,
      showIfAbove,
      isBasement,
      showAboveRange,
      noFogHide,
    };
  }

  /**
   * Find out if a token is in the range of a particular object
   * @param {Object} token - a token
   * @param {Object} object - a tile/drawing/light/note
   * @returns {Boolean} - true if in range, false if not
   **/

  isTokenInRange(token, object) {
    let rangeTop = object.document.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
    let rangeBottom = object.document.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
    if (!rangeTop && rangeTop !== 0) rangeTop = Infinity;
    if (!rangeBottom && rangeBottom !== 0) rangeBottom = -Infinity;
    const elevation = token.data.elevation;
    return elevation <= rangeTop && elevation >= rangeBottom;
  }

  
}
