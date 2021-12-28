function _levelsTokenRefresh(wrapped,...args) {
  if(!this.icon || this._destroyed) return this;
  wrapped(...args);
  // Adjust Scale
  
  this.icon.scale.x =
    Math.abs(this.icon.scale.x) *
    (this.data.mirrorX ? -1 : 1) *
    (this.elevationScaleFactor || 1);
  this.icon.scale.y =
    Math.abs(this.icon.scale.y) *
    (this.data.mirrorY ? -1 : 1) *
    (this.elevationScaleFactor || 1);
  this.icon.visible = this._controlled ? true : !this.levelsHidden
  if(this.levelsVisible !== undefined) this.visible = this.levelsVisible;
  return this;
}

function _levelsTileRefresh(wrapped,...args){
  wrapped(...args);
  if(this.levelsUIHideen && !canvas.tokens.controlled[0]) {
    this.visible = false
  }
  if(!game.user.isGM || canvas?.tokens?.controlled[0]){
    if(_levels?.floorContainer?.spriteIndex[this.id]?.visible){
      this.visible = false
    }
    if(this.isLevelsVisible !== undefined) {
      if(this.data.hidden){
        this.visible = false;
      }else{
        this.visible = this.isLevelsVisible
      }
      
    }
  }
}

function _levelsOnMovementFrame(wrapped,...args) {
  wrapped(...args);
  // Update the token copy
  if (_levels.floorContainer.spriteIndex[this.id])
    _levels.getTokenIconSprite(this);
  if (_levels.overContainer.spriteIndex[this.id])
    _levels.getTokenIconSpriteOverhead(this);
  if (_levels && !this._controlled) {
    _levels.debounce3DRefresh(100);
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

function _levelsTestVisibility(point, {tolerance=2, object=null}={}) {
  const visionSources = this.sources;
  const lightSources = canvas.lighting.sources;
  const d = canvas.dimensions;
  if ( !visionSources.size ) return game.user.isGM;

  // Determine the array of offset points to test
  const t = tolerance;
  const offsets = t > 0 ? [[0, 0],[-t,0],[t,0],[0,-t],[0,t],[-t,-t],[-t,t],[t,t],[t,-t]] : [[0,0]];
  const points = offsets.map(o => new PIXI.Point(point.x + o[0], point.y + o[1]));

  // If the point is inside the buffer region, it may be hidden from view
  if ( !this._inBuffer && !points.some(p => d.sceneRect.contains(p.x, p.y)) ) return false;

  // We require both LOS and FOV membership for a point to be visible
  let hasLOS = false;
  let requireFOV = !canvas.lighting.globalLight;
  let hasFOV = false;

  // Check vision sources
  for ( let source of visionSources.values() ) {
    if ( !source.active ) continue;   // The source may be currently inactive
    if ( !hasLOS ) {
      let l = points.some(p => source.los.contains(p.x, p.y));
      if ( l ) hasLOS = true;
    }
    if ( !hasFOV && requireFOV ) {
      let f = points.some(p => source.fov.contains(p.x, p.y));
      if (f) hasFOV = true;
    }
    if ( hasLOS && (!requireFOV || hasFOV) ) return true;
  }

  // Check light sources
  for ( let source of lightSources.values() ) {
    if (source.skipRender) continue; //OVERRIDE SKIP RENDER
    if ( !source.active ) continue;   // The source may be currently inactive
    if ( points.some(p => source.containsPoint(p)) ) {
      if ( source.object.data.vision ) hasLOS = true;
      hasFOV = true;
    }
    if (hasLOS && (!requireFOV || hasFOV)) return true;
  }
  return false;
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
    if (!canvas.sight.tokenVision) return true;
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
    if (!canvas.sight.tokenVision) return true;
    if (this._controlled) return true;
    if (canvas.sight.sources.has(this.sourceId)) return true;
    const tolerance = Math.min(this.w, this.h) / 4;
    return canvas.sight.testVisibility(this.center, {
      tolerance,
      object: this,
    });
  }
}

async function _levelsTemplatedraw(wrapped,...args) {
  await wrapped(...args);
  if(this.document.getFlag(_levelsModuleName, "elevation")===0) return this;
  this.tooltip = this.addChild(_templateDrawTooltip(this));

  function _templateDrawTooltip(template) {
    // Create the tooltip Text

    const tipFlag = template.document.getFlag(_levelsModuleName, "elevation");
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

function _levelsTokenCheckCollision(destination) {
  // Create a Ray for the attempted move
  let origin = this.getCenter(...Object.values(this._validPosition));
  let ray = new Ray(
    { x: origin.x, y: origin.y },
    { x: destination.x, y: destination.y }
  );

  // Shift the origin point by the prior velocity
  ray.A.x -= this._velocity.sx;
  ray.A.y -= this._velocity.sy;

  // Shift the destination point by the requested velocity
  ray.B.x -= Math.sign(ray.dx);
  ray.B.y -= Math.sign(ray.dy);

  // Check for a wall collision
  const blockSightMovement = game.settings.get(_levelsModuleName, "blockSightMovement");
    return _levels.testCollision(
      {
        x: ray.A.x,
        y: ray.A.y,
        z: blockSightMovement ? this.data.elevation : this.losHeight,
      },
      {
        x: ray.B.x,
        y: ray.B.y,
        z: blockSightMovement ? this.data.elevation : this.losHeight,
      },
      "collision"
    );
}

function _levelsTokendrawTooltip(wrapped,...args) {
  let hideElevation = game.settings.get(_levelsModuleName, "hideElevation");
  if(hideElevation == 0) return wrapped(...args);
  if(hideElevation == 1 && game.user.isGM) return wrapped(...args);
  return new PIXI.Sprite()
}

function _levelsRenderLightTexture() {

  // Determine ideal texture size as the closest power-of-2
  const s = (this.radius * 2);
  const p2 = this.getPowerOf2Size();
  const ratio = p2 / s;

  // Create or resize the render texture
  let rt = this.fovTexture;
  if ( !this.fovTexture ) {
    this.fovTexture = rt = PIXI.RenderTexture.create({ width: p2, height: p2, resolution: 1 });
    this.fovTexture.baseTexture.mipmap = false;
  }
  else if ((rt.width !== p2) || (rt.height !== p2)) {
    rt.resize(p2, p2);
  }

  // Create container to render
  const c = this._drawRenderTextureContainer()
  c.scale.set(ratio);
  let gf = LightSource._glowFilter;
  if ( !gf ) {
    gf = LightSource._glowFilter = GlowFilter.create({
      outerStrength: 0,
      innerStrength: LightSource.BLUR_STRENGTH,
      glowColor: [0,1,0,1],
      quality: 0.3
    });
  }
  gf.blendMode = PIXI.BLEND_MODES.ADD;
  c.filters = [gf];

  // Add light occlusion from tiles
  const occlusionSprite = _levels?.lightOcclusion.spriteIndex[this._lightId];
  if(occlusionSprite && !occlusionSprite._destroyed){
    c.addChild(_levels?.lightOcclusion.spriteIndex[this._lightId]);
  }

  // Render the container to texture
  canvas.app.renderer.render(c, {
    renderTexture: rt,
    transform: new PIXI.Matrix(1, 0, 0, 1, (-this.x + this.radius) * ratio, (-this.y + this.radius) * ratio)
  });
  if(occlusionSprite && !occlusionSprite._destroyed){
    c.removeChild(_levels?.lightOcclusion.spriteIndex[this._lightId]);
  }
  c.destroy({children: true});

  // Store the rendered texture to the source
  this._flags.renderFOV = false;
  return this.fovTexture;
}

function _levelsDoorVisible(wrapped,...args){
  if(!_levels) return wrapped(...args);
  const isGm = game.user.isGM;
  const token = canvas.tokens.controlled[0] ?? _levels.lastReleasedToken;
  if(!token || isGm) return wrapped(...args);
  const elevation = token.data.elevation ?? 0;
  const wall = this.wall;
  const wallRange = _levels.getWallHeightRange(wall);
  if(elevation > wallRange[1] || elevation < wallRange[0]) return false;
  return wrapped(...args);
}