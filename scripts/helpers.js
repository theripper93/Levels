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
  if(this.levelsVisible !== undefined) this.visible = this.levelsVisible;
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
  const darknessChanged = darkness !== undefined && darkness !== priorLevel;
  this.darknessLevel = darkness = Math.clamped(
    darkness ?? this.darknessLevel,
    0,
    1
  );

  // Update lighting channels
  if (darknessChanged || !this.channels)
    this.channels = this._configureChannels(darkness);

  // Track global illumination
  let refreshVision = false;
  const globalLight = this.hasGlobalIllumination();
  if (globalLight !== this.globalLight) {
    this.globalLight = globalLight;
    canvas.perception.schedule({ sight: { initialize: true, refresh: true } });
  }

  // Clear currently rendered sources
  const ilm = this.illumination;
  ilm.lights.removeChildren();
  const col = this.coloration;
  col.removeChildren();
  this._animatedSources = [];

  // Tint the background color
  canvas.app.renderer.backgroundColor = this.channels.canvas.hex;
  ilm.background.tint = this.channels.background.hex;

  // Render light sources
  for (let sources of [this.sources, canvas.sight.sources]) {
    for (let source of sources) {
      // Check the active state of the light source
      const isActive = source.skipRender //OVERRIDE SKIP RENDER
        ? false
        : darkness.between(source.darkness.min, source.darkness.max);
      if (source.active !== isActive) refreshVision = true;
      source.active = isActive;
      if (!source.active) continue;

      // Draw the light update
      const light = source.drawLight();
      if (light) ilm.lights.addChild(light);
      const color = source.drawColor();
      if (color) col.addChild(color);
      if (source.animation?.type) this._animatedSources.push(source);
    }
  }

  // Draw non-occluded roofs that block light
  const displayRoofs = canvas.foreground.displayRoofs;
  for (let roof of canvas.foreground.roofs) {
    if (!displayRoofs || roof.occluded) continue;
    const si = roof.getRoofSprite();
    if (!si) continue;

    // Block illumination
    si.tint = this.channels.background.hex;
    this.illumination.lights.addChild(si);

    // Block coloration
    const sc = roof.getRoofSprite();
    sc.tint = 0x000000;
    this.coloration.addChild(sc);
  }

  // Refresh vision if necessary
  if (refreshVision) canvas.perception.schedule({ sight: { refresh: true } });

  // Refresh audio if darkness changed
  if (darknessChanged) {
    this._onDarknessChange(darkness, priorLevel);
    canvas.sounds._onDarknessChange(darkness, priorLevel);
  }

  // Dispatch a hook that modules can use
  Hooks.callAll("lightingRefresh", this);
}

function _levelsTestVisibility(point, { tolerance = 2, object = null } = {}) {
  const visionSources = this.sources;
  const lightSources = canvas.lighting.sources;
  if (!visionSources.size) return game.user.isGM;

  // Determine the array of offset points to test
  const t = tolerance;
  const offsets =
    t > 0
      ? [
          [0, 0],
          [-t, 0],
          [t, 0],
          [0, -t],
          [0, t],
          [-t, -t],
          [-t, t],
          [t, t],
          [t, -t],
        ]
      : [[0, 0]];
  const points = offsets.map(
    (o) => new PIXI.Point(point.x + o[0], point.y + o[1])
  );

  // Test that a point falls inside a line-of-sight polygon
  let inLOS = false;
  for (let source of visionSources.values()) {
    if (points.some((p) => source.los.contains(p.x, p.y))) {
      inLOS = true;
      break;
    }
  }
  if (!inLOS) return false;

  // If global illumination is active, nothing more is required
  if (canvas.lighting.globalLight) return true;

  // Test that a point is also within some field-of-vision polygon
  for (let source of visionSources.values()) {
    if (points.some((p) => source.fov.contains(p.x, p.y))) return true;
  }
  for (let source of lightSources.values()) {
    if (source.skipRender) continue; //OVERRIDE SKIP RENDER
    if (points.some((p) => source.fov.contains(p.x, p.y))) return true;
  }
  return false;
}

function _levelsGetRayCollisions(
  ray,
  { type = "movement", mode = "all", _performance } = {},
  roomTest
) {
  // Define inputs
  const angleBounds = [ray.angle - Math.PI / 2, ray.angle + Math.PI / 2];
  const isClosest = mode === "closest";
  const isAny = mode === "any";
  const wallType = this.constructor._mapWallCollisionType(type);

  // Track collisions
  const collisions = {};
  let collided = false;

  // Track quadtree nodes and walls which have already been tested
  const testedNodes = new Set();
  const testedWalls = new Set();

  // Expand the ray outward from the origin, identifying candidate walls as we go
  const stages = 4;
  for (let i = 1; i <= stages; i++) {
    // Determine and iterate over the (unordered) set of nodes to test at this level of projection
    const limit = i < stages ? ray.project(i / stages) : ray.B;
    const bounds = new NormalizedRectangle(
      ray.A.x,
      ray.A.y,
      limit.x - ray.A.x,
      limit.y - ray.A.y
    );
    const nodes = this.quadtree.getLeafNodes(bounds);
    for (let n of nodes) {
      if (testedNodes.has(n)) continue;
      testedNodes.add(n);

      // Iterate over walls in the node to test
      const objects = n.objects;
      for (let o of objects) {
        const w = o.t;
        const wt = w.data[wallType];
        if (testedWalls.has(w)) continue;
        testedWalls.add(w);

        // Skip walls which don't fit the criteria
        if (wt === CONST.WALL_SENSE_TYPES.NONE) continue;
        if (
          w.data.door > CONST.WALL_DOOR_TYPES.NONE &&
          w.data.ds === CONST.WALL_DOOR_STATES.OPEN
        )
          continue;
        if (w.direction !== null) {
          // Directional walls where the ray angle is not in the same hemisphere
          if (!w.isDirectionBetweenAngles(...angleBounds)) continue;
        }

        // Test a single wall
        const x = WallsLayer.testWall(ray, w, roomTest); //OVERRIDE add elevation parameter to testWall
        if (_performance) _performance.tests++;
        if (!x) continue;
        if (isAny) return true;

        // Update a known collision point to flag the sense type
        const pt = `${x.x},${x.y}`;
        let c = collisions[pt];
        if (c) {
          c.type = Math.min(wt, c.type);
          for (let n of o.n) c.nodes.push(n);
        } else {
          x.type = wt;
          x.nodes = Array.from(o.n);
          collisions[pt] = x;
          collided = true;
        }
      }
    }

    // At this point we may be done if the closest collision has been fully tested
    if (isClosest && collided) {
      const closest = this.getClosestCollision(Object.values(collisions));
      if (closest && closest.nodes.every((n) => testedNodes.has(n))) {
        return closest;
      }
    }
  }

  // Return the collision result
  if (isAny) return false;
  if (isClosest) {
    const closest = this.getClosestCollision(Object.values(collisions));
    return closest || null;
  }
  return Object.values(collisions);
}

function _levelsCheckCollision(//OVERRIDE PASS roomtest to the next function
  ray,
  { type = "movement", mode = "any" } = {},
  roomTest = false
) {
  if (!canvas.grid.hitArea.contains(ray.B.x, ray.B.y)) return true;
  if (!canvas.scene.data.walls.size) return false;
  return this.getRayCollisions(ray, { type, mode }, roomTest);
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

  /**
   * Update the displayed ruler tooltip text
   * @private
   */
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
    this.ruler.text = text;
    this.ruler.position.set(this.ray.dx + 10, this.ray.dy + 5);
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
      { type: "movement", mode: "any" },
      this.data.elevation
    );
  } else {
    return canvas.walls.checkCollision(ray);
  }
}

function _levelsTokendrawTooltip(wrapped,...args) {
  if(!_levels || _levels.hideElevation == 0) return wrapped(...args);
  if(_levels.hideElevation == 1 && game.user.isGM) return wrapped(...args);
  this.tooltip.removeChildren().forEach(c => c.destroy());
  return
}