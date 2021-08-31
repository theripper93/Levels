function _levelsTokenRefresh(wrapped,...args) {
  if(!this.icon) return this;
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
  return this;
}

function _levelsTileRefresh(wrapped,...args){
  wrapped(...args);
  if(this.levelsUIHideen && !canvas.tokens.controlled[0]) {
    this.visible = false
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

function _lightingRefresh(darkness) {
  const priorLevel = this.darknessLevel;
  const darknessChanged = (darkness !== undefined) && (darkness !== priorLevel)
  this.darknessLevel = darkness = Math.clamped(darkness ?? this.darknessLevel, 0, 1);

  // Update lighting channels
  if ( darknessChanged || !this.channels ) this.channels = this._configureChannels(darkness);

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
  const del = this.delimiter;
  del.removeChildren();
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
    if ( meshes.delimiter ) del.addChild(meshes.delimiter);
    if ( source.data.animation?.type ) this._animatedSources.push(source);
  }

  // Render sight from vision sources if there is a darkness level present
  if ( this.darknessLevel > 0 ) {
    for ( let vs of canvas.sight.sources ) {
      if ( vs.radius <= 0 ) continue;
      if ( vs.losMask ) msk.addChild(vs.losMask);
      const sight = vs.drawVision();
      if ( sight ) ilm.lights.addChild(sight);
    }
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
  if ( !visionSources.size ) return game.user.isGM;

  // Determine the array of offset points to test
  const t = tolerance;
  const offsets = t > 0 ? [[0, 0],[-t,0],[t,0],[0,-t],[0,t],[-t,-t],[-t,t],[t,t],[t,-t]] : [[0,0]];
  const points = offsets.map(o => new PIXI.Point(point.x + o[0], point.y + o[1]));

  // We require both LOS and FOV membership for a point to be visible
  let hasLOS = false;
  let requireFOV = !canvas.lighting.globalLight;
  let hasFOV = false;

  // Check vision sources
  for ( let source of visionSources.values() ) {
    if ( !hasLOS ) {
      let l = points.some(p => source.los.contains(p.x, p.y));
      if ( l ) hasLOS = true;
    }
    if ( !hasFOV && requireFOV ) {
      let f = points.some(p => source.los.contains(p.x, p.y));
      if (f) hasFOV = true;
    }
    if ( hasLOS && (!requireFOV || hasFOV) ) return true;
  }

  // Check light sources
  for ( let source of lightSources.values() ) {
    if (source.skipRender) continue; //OVERRIDE SKIP RENDER
    if ( points.some(p => source.containsPoint(p)) ) {
      if ( source.data.type !== CONST.SOURCE_TYPES.LOCAL ) hasLOS = true;
      hasFOV = true;
    }
    if (hasLOS && (!requireFOV || hasFOV)) return true;
  }
  return false;
}

function _levelsGetRayCollisions(ray, {type="move", mode="all", steps=8}={}, roomTest) {

  // Record collision points and tested walls
  const angleBounds = [ray.angle - (Math.PI / 2), ray.angle + (Math.PI / 2)];
  const collisionPoints = new Map();
  const testedWalls = new Set();

  // Progressively test walls along ray segments
  let dx = ray.dx / steps;
  let dy = ray.dy / steps;
  let pt = ray.A;
  let step = 0;
  while (step < steps) {
    step++;
    const testRect = new NormalizedRectangle(pt.x, pt.y, dx, dy);
    let walls = canvas.walls.quadtree.getObjects(testRect);
    pt = {x: pt.x + dx, y: pt.y + dy};
    for (let wall of walls) {
      if(roomTest !== false && roomTest !== undefined){
        const wallHeightBottom = wall.data?.flags?.wallHeight?.wallHeightBottom ?? -Infinity;
        const wallHeightTop = wall.data?.flags?.wallHeight?.wallHeightTop ?? Infinity;
        if(roomTest < wallHeightBottom || roomTest > wallHeightTop) continue
      }
      // Don't repeat tests
      if (testedWalls.has(wall)) continue;
      testedWalls.add(wall);
      // Ignore walls of the wrong type or open doors
      if (!wall.data[type] || wall.isOpen) continue;

      // Ignore one-way walls which are facing the wrong direction
      if ((wall.direction !== null) && !wall.isDirectionBetweenAngles(...angleBounds)) continue;

      // Test whether an intersection occurs
      const i = ray.intersectSegment(wall.data.c);
      if (!i || (i.t0 <= 0)) continue;

      // We may only need one
      if ( mode === "any" ) return true;

      // Record the collision point if an intersection occurred
      const c = new WallEndpoint(i.x, i.y);
      collisionPoints.set(c.key, c);
    }
    if (collisionPoints.size && (mode === "closest")) break;
  }

  // Return the result based on the test type
  switch (mode) {
    case "all":
      return Array.from(collisionPoints.values());
    case "any":
      return collisionPoints.size > 0;
    case "closest":
      if (!collisionPoints.size) return null;
      const sortedPoints = Array.from(collisionPoints.values()).sort((a, b) => a.t0 - b.t0);
      if (sortedPoints[0].isLimited(type)) sortedPoints.shift();
      return sortedPoints[0] || null;
  }
}

function _levelsCheckCollision(ray, {type="move", mode="any"}={},
roomTest = false) {
  if ( !canvas.grid.hitArea.contains(ray.B.x, ray.B.y) ) return true;
  if ( !canvas.scene.data.walls.size ) return false;
  return CONFIG.Canvas.losBackend.getRayCollisions(ray, {type, mode}, roomTest);
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
      (this.levelsVisible === false && canvas.tokens.controlled[0])
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
  if (game.settings.get(_levelsModuleName, "blockSightMovement")) {
    return canvas.walls.checkCollision(
      ray,
      { type: "move", mode: "any" },
      this.data.elevation
    );
  } else {
    return canvas.walls.checkCollision(ray);
  }
}

function _levelsTokendrawTooltip(wrapped,...args) {
  if(!_levels || _levels.hideElevation == 0) return wrapped(...args);
  if(_levels.hideElevation == 1 && game.user.isGM) return wrapped(...args);
  this.hud?.tooltip?.destroy();
}

function _levelsRenderLightTexture() {

  // Determine ideal texture size as the closest power-of-2
  const s = (this.radius * 2);
  const p2 = Math.max(64, Math.min(PIXI.utils.nextPow2(s) >> 1, canvas.MAX_TEXTURE_SIZE >> 1 ));
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

  // Create the container to render
  const c = new PIXI.Container();
  c.scale.set(ratio);

  // Draw the blurred texture with BLUE fill
  const g = c.addChild(new PIXI.Graphics());
  g.beginFill(0x0000FF, 1.0).drawShape(this.los).endFill();
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
  g.filters = [gf];

    // Add light occlusion from tiles
  if(_levels?.lightOcclusion.spriteIndex[this._lightId]){
    c.addChild(_levels?.lightOcclusion.spriteIndex[this._lightId]);
  }

  // Render the texture
  canvas.app.renderer.render(c, {
    renderTexture: rt,
    transform: new PIXI.Matrix(1, 0, 0, 1, (-this.x + this.radius) * ratio, (-this.y + this.radius) * ratio)
  });
  this._flags.renderFOV = false;
  return this.fovTexture;
}