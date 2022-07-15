export function adjustPolygonPoints(drawing){
  let globalCoords = [];
  if (drawing.document.shape.points.length != 0) {
    for (let i = 0; i < drawing.document.shape.points.length; i += 2) {
      globalCoords.push(
        drawing.document.shape.points[i] + (drawing.x),
        drawing.document.shape.points[i + 1] + (drawing.y)
      );
    }
  } else {
    globalCoords = [
      drawing.x,
      drawing.y,
      drawing.x + drawing.document.shape.width,
      drawing.y,
      drawing.x + drawing.document.shape.width,
      drawing.y + drawing.document.shape.height,
      drawing.x,
      drawing.y + drawing.document.shape.height,
    ];
  }
  return globalCoords;
}

export function inRange(document, elevation){
  const rangeBottom = document.flags?.levels?.rangeBottom ?? -Infinity;
  const rangeTop = document.flags?.levels?.rangeTop ?? Infinity;
  return elevation >= rangeBottom && elevation <= rangeTop;
}


function _levelsTileRefresh(wrapped,...args){
  wrapped(...args);
  const originalVisible = this.visible;
  if(!game.user.isGM) this.visible = false;
  if(this.levelsUIHideen && !canvas.tokens.controlled[0]) {
    this.visible = false
  }
  if(!game.user.isGM || canvas?.tokens?.controlled[0]){
    let visibilityChanged = false;
    if(_levels?.floorContainer?.spriteIndex[this.id]?.visible){
      this.visible = false
      visibilityChanged = true
    }
    if(this.isLevelsVisible !== undefined) {
      if(this.data.hidden){
        this.visible = false;
        visibilityChanged = true
      }else{
        this.visible = this.isLevelsVisible
        visibilityChanged = true
      }
      
    }
    if(!visibilityChanged) this.visible = originalVisible;
  }
}

function _lightingRefresh({darkness, backgroundColor}={}) {
  const priorLevel = this.darknessLevel;
  const darknessChanged = (darkness !== undefined) && (darkness !== priorLevel);
  const bgChanged = backgroundColor !== undefined;
  this.darknessLevel = darkness = Math.clamped(darkness ?? this.darknessLevel, 0, 1);

  // Update lighting channels
  if ( darknessChanged || bgChanged || !this.channels ) {
    this.channels = this._configureChannels({
      backgroundColor: foundry.utils.colorStringToHex(backgroundColor),
      darkness
    });
  }

  // Track global illumination
  let refreshVision = false;
  const globalLight = this.hasGlobalIllumination();
  if ( globalLight !== this.globalLight ) {
    this.globalLight = globalLight;
    canvas.perception.schedule({sight: {initialize: true, refresh: true}});
  }

  // Clear currently rendered sources
  const msk = this.masks;
  msk.removeChildren();
  const bkg = this.background;
  bkg.removeChildren();
  const ilm = this.illumination;
  ilm.lights.removeChildren();
  const col = this.coloration;
  col.removeChildren();
  this._animatedSources = [];

  // Tint the background color
  canvas.app.renderer.backgroundColor = this.channels.canvas.hex;
  ilm.background.tint = ilm.sbackground.tint = this.channels.background.hex;

  // Render light sources
  for ( let source of this.sources ) {

    // Check the active state of the light source
    const isActive = source.skipRender //OVERRIDE SKIP RENDER
    ? false
    : darkness.between(source.data.darkness.min, source.data.darkness.max);
    if ( source.active !== isActive ) refreshVision = true;
    source.active = isActive;
    if ( !source.active ) continue;

    // Add the source mask used by all source meshes
    if ( source.losMask ) msk.addChild(source.losMask);

    // Draw the light update
    const meshes = source.drawMeshes();
    if ( meshes.background ) bkg.addChild(meshes.background);
    if ( meshes.light ) ilm.lights.addChild(meshes.light);
    if ( meshes.color ) col.addChild(meshes.color);
    if ( source.data.animation?.type ) this._animatedSources.push(source);
  }

  // Render sight from vision sources
  for ( let vs of canvas.sight.sources ) {
    if ( vs.radius <= 0 ) continue;
    if ( vs.losMask ) msk.addChild(vs.losMask);
    const sight = vs.drawVision();
    if ( sight ) ilm.lights.addChild(sight);
  }

  // Draw non-occluded roofs that block light
  const displayRoofs = canvas.foreground.displayRoofs;
  for ( let roof of canvas.foreground.roofs ) {
    if ( !displayRoofs || roof.occluded ) continue;

    // Block illumination
    const si = roof.getRoofSprite();
    if ( !si ) continue;
    si.tint = this.channels.background.hex;
    this.illumination.lights.addChild(si)

    // Block coloration
    const sc = roof.getRoofSprite();
    sc.tint = 0x000000;
    this.coloration.addChild(sc);

    // Block background
    const sb = roof.getRoofSprite();
    sb.blendMode = PIXI.BLEND_MODES.ERASE;
    this.background.addChild(sb);
  }

  // Refresh vision if necessary
  if ( refreshVision ) canvas.perception.schedule({sight: {refresh: true}});

  // Refresh audio if darkness changed
  if ( darknessChanged ) {
    this._onDarknessChange(darkness, priorLevel);
    canvas.sounds._onDarknessChange(darkness, priorLevel);
  }

  /**
   * A hook event that fires when the LightingLayer is refreshed.
   * @function lightingRefresh
   * @memberof hookEvents
   * @param {LightingLayer} light The LightingLayer
   */
  Hooks.callAll("lightingRefresh", this);
}

function _levelsIsAudible() {
  if (this.levelsInaudible) return false;//OVERRIDE skip sounds on diff levels
  if (this.data.hidden) return false;
  return canvas.lighting.darknessLevel.between(
    this.data.darkness.min ?? 0,
    this.data.darkness.max ?? 1
  );
}

function _levelsTokenIsVisible() {//OVERRIDE complete override of token visibility
  if (!_levels) {
    const gm = game.user.isGM;
    if (this.data.hidden) return gm;
    if (!canvas.scene.tokenVision) return true;
    if (this._controlled) return true;
    if (canvas.sight.sources.has(this.sourceId)) return true;
    const tolerance = Math.min(this.w, this.h) / 4;
    return canvas.sight.testVisibility(this.center, {
      tolerance,
      object: this,
    });
  } else {
    const gm = game.user.isGM;
    if(gm && _levels.UI && _levels.UI.rangeEnabled === true && _levels.UI.range && !canvas.tokens.controlled[0]) return this.data.elevation <= _levels.UI.range[1] && this.data.elevation >= _levels.UI.range[0]
    if (
      this.levelsVisible === true ||
      (this.levelsVisible === false)
    )
      return this.levelsVisible;
      if (this.data.hidden) return gm;
    this.levelsVisible = undefined;
    if (!canvas.scene.tokenVision) return true;
    if (this._controlled) return true;
    if (canvas.sight.sources.has(this.sourceId)) return true;
    const tolerance = Math.min(this.w, this.h) / 4;
    return canvas.sight.testVisibility(this.center, {
      tolerance,
      object: this,
    });
  }
}

function _levelsNoteIsVisible(wrapped,...args){
  if(!_levels) return wrapped(...args);
  const visible = wrapped(...args);
  if(!visible) return visible;
  let { rangeBottom, rangeTop } = _levels.getFlagsForObject(this);
  if(game.user.isGM && _levels.UI?.rangeEnabled){
    const range = _levels.UI.range;
    if(range && rangeTop <= range[1] && rangeBottom >= range[0]) return true;
    else return false;
  }
  if (!rangeBottom && rangeBottom != 0) return visible;
  let cToken = canvas.tokens.controlled[0] ?? _levels.lastReleasedToken;
  if(!cToken) return visible;
  const tElev = cToken.data.elevation;
      if (!(tElev >= rangeBottom && tElev <= rangeTop)) {
        return false;
      } else {
        return visible;
      }

}

async function _levelsTemplatedraw(wrapped,...args) {
  await wrapped(...args);
  if(this.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation")===0) return this;
  this.tooltip = this.addChild(_templateDrawTooltip(this));

  function _templateDrawTooltip(template) {
    // Create the tooltip Text

    const tipFlag = template.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation");
    let tipN;
    if (tipFlag === undefined) {
      if (_levels?.nextTemplateHeight) {
        tipN = _levels.nextTemplateHeight;
      } else {
        const cToken =
          canvas.tokens.controlled[0] || _levels?.lastTokenForTemplate;
        tipN = cToken?.data?.elevation ?? 0;
      }
    } else {
      tipN = tipFlag;
    }
    let units = canvas.scene.data.gridUnits;
    const tip = tipN > 0 ? `+${tipN} ${units}` : `${tipN} ${units}`;
    const style = CONFIG.canvasTextStyle.clone();
    style.fontSize = Math.max(
      Math.round(canvas.dimensions.size * 0.36 * 12) / 12,
      36
    );
    const text = new PreciseText(tip, style);
    text.anchor.set(0.5, 2);
    return text;
  }
  return this;
}

function _levelsRefreshRulerText() {
  let special = this.data.flags.levels?.special || _levels?.nextTemplateSpecial
  let text;
  let u = canvas.scene.data.gridUnits;
  if ( this.data.t === "rect" ) {
    let d = canvas.dimensions;
    let dx = Math.round(this.ray.dx) * (d.distance / d.size);
    let dy = Math.round(this.ray.dy) * (d.distance / d.size);
    let w = Math.round(dx * 10) / 10;
    let h = Math.round(dy * 10) / 10;
    text = special ? `${w}${u} x ${h}${u} x ${special}${u}` : `${w}${u} x ${h}${u}`;
  } else {
    let d = Math.round(this.data.distance * 10) / 10;
    text = special ? `${d}${u} x ${special}${u}` : `${d}${u}`;
  }
  this.hud.ruler.text = text;
  this.hud.ruler.position.set(this.ray.dx + 10, this.ray.dy + 5);
}

function _levelsWallCheckCollision(wrapped,...args){
  const token = canvas.tokens.controlled[0];
  if(!_levels || !token) return wrapped(...args);
  const ray = args[0];
  if(!token) return true;
  if ( !canvas.scene.data.walls.size ) return false;
  const blockSightMovement = game.settings.get(CONFIG.Levels.MODULE_ID, "blockSightMovement");
  return _levels.testCollision(
    {
      x: ray.A.x,
      y: ray.A.y,
      z: blockSightMovement ? token.data.elevation : token.losHeight,
    },
    {
      x: ray.B.x,
      y: ray.B.y,
      z: blockSightMovement ? token.data.elevation : token.losHeight,
    },
    "collision"
  );
}

function _levelsTokendrawTooltip(wrapped,...args) {
  let hideElevation = game.settings.get(CONFIG.Levels.MODULE_ID, "hideElevation");
  if(hideElevation == 0) return wrapped(...args);
  if(hideElevation == 1 && game.user.isGM) return wrapped(...args);
  return new PIXI.Sprite()
}