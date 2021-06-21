function _levelsTokenRefresh() {
  // Token position and visibility
  if (!this._movement) this.position.set(this.data.x, this.data.y);

  // Size the texture aspect ratio within the token frame
  const tex = this.texture;
  if (tex) {
    let aspect = tex.width / tex.height;
    const scale = this.icon.scale;
    if (aspect >= 1) {
      this.icon.width = this.w * this.data.scale;
      scale.y = Number(scale.x);
    } else {
      this.icon.height = this.h * this.data.scale;
      scale.x = Number(scale.y);
    }
  }
  // Mirror horizontally or vertically
  this.icon.scale.x =
    Math.abs(this.icon.scale.x) * (this.data.mirrorX ? -1 : 1) * (this.elevationScaleFactor || 1);
  this.icon.scale.y =
    Math.abs(this.icon.scale.y) * (this.data.mirrorY ? -1 : 1) * (this.elevationScaleFactor || 1);

  // Set rotation, position, and opacity
  this.icon.rotation = this.data.lockRotation
    ? 0
    : Math.toRadians(this.data.rotation);
  this.icon.position.set(this.w / 2, this.h / 2);
  if (!this.levelsHidden)
    this.icon.alpha = this.data.hidden
      ? Math.min(this.data.alpha, 0.5)
      : this.data.alpha;

  // Refresh Token border and target
  this._refreshBorder();
  this._refreshTarget();

  // Refresh nameplate and resource bars
  this.nameplate.visible = this._canViewMode(this.data.displayName);
  this.bars.visible = this._canViewMode(this.data.displayBars);
  return this;
}

function _levelsOnMovementFrame(dt, anim, config) {
  // Update the displayed position of the Token
  this.data.x = this.x;
  this.data.y = this.y;
  // Update the token copy
  let tempTokenSprite = _levels.floorContainer.spriteIndex[this.id];
  let tempTokenSpriteOverhead = _levels.overContainer.spriteIndex[this.id];
  if (tempTokenSprite) {
    tempTokenSprite.width = this.data.width * canvas.scene.dimensions.size * this.data.scale * (this.elevationScaleFactor || 1);
    tempTokenSprite.height = this.data.height * canvas.scene.dimensions.size * this.data.scale * (this.elevationScaleFactor || 1);
    tempTokenSprite.position.x = this.position.x;
    tempTokenSprite.position.y = this.position.y;
    tempTokenSprite.position.x += this.icon.x;
    tempTokenSprite.position.y += this.icon.y;
    tempTokenSprite.anchor = this.icon.anchor;
    tempTokenSprite.angle = this.icon.angle;
    tempTokenSprite.alpha = this.visible ? 1 : 0;
    tempTokenSprite.zIndex = this.data.elevation+1;
  }

  if (tempTokenSpriteOverhead) {
    tempTokenSpriteOverhead.width = this.data.width * canvas.scene.dimensions.size * this.data.scale * (this.elevationScaleFactor || 1);
    tempTokenSpriteOverhead.height = this.data.height * canvas.scene.dimensions.size * this.data.scale * (this.elevationScaleFactor || 1);
    tempTokenSpriteOverhead.position.x = this.position.x;
    tempTokenSpriteOverhead.position.y = this.position.y;
    tempTokenSpriteOverhead.position.x += this.icon.x;
    tempTokenSpriteOverhead.position.y += this.icon.y;
    tempTokenSpriteOverhead.anchor = this.icon.anchor;
    tempTokenSpriteOverhead.angle = this.icon.angle;
    tempTokenSpriteOverhead.alpha = this.data.hidden ? 0 : 1;
    tempTokenSpriteOverhead.zIndex = this.data.elevation+1;
  }
  // Animate perception changes
  if (!config.animate || !anim.length) return;
  let updateFog = config.fog;
  if (config.source) {
    const dist = Math.hypot(anim[0].done, anim[1]?.done || 0);
    const n = Math.floor(dist / canvas.dimensions.size);
    if (n > 0 && anim[0].dist !== n) {
      updateFog = true;
      anim[0].dist = n;
    }
  }
  this._animatePerceptionFrame({
    source: config.source,
    sound: config.sound,
    fog: updateFog,
  });
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
  const ilm = this.illumination;
  ilm.lights.removeChildren();
  const col = this.coloration;
  col.removeChildren();
  this._animatedSources = [];

  // Tint the background color
  canvas.app.renderer.backgroundColor = this.channels.canvas.hex;
  ilm.background.tint = this.channels.background.hex;

  // Render light sources
  for ( let sources of [this.sources, canvas.sight.sources] ) {
    for ( let source of sources ) {
      // Check the active state of the light source
      const isActive = source.skipRender ? false : darkness.between(source.darkness.min, source.darkness.max);
      if ( source.active !== isActive ) refreshVision = true;
      source.active = isActive;
      if ( !source.active ) continue;

      // Draw the light update
      const light = source.drawLight();
      if ( light ) ilm.lights.addChild(light);
      const color = source.drawColor();
      if ( color ) col.addChild(color);
      if ( source.animation?.type ) this._animatedSources.push(source);
    }
  }

  // Draw non-occluded roofs that block light
  const displayRoofs = canvas.foreground.displayRoofs;
  for ( let roof of canvas.foreground.roofs ) {
    if ( !displayRoofs || roof.occluded) continue;
    const si = roof.getRoofSprite();
    if ( !si ) continue;

    // Block illumination
    si.tint = this.channels.background.hex;
    this.illumination.lights.addChild(si)

    // Block coloration
    const sc = roof.getRoofSprite();
    sc.tint = 0x000000;
    this.coloration.addChild(sc);
  }

  // Refresh vision if necessary
  if ( refreshVision ) canvas.perception.schedule({sight: {refresh: true}});

  // Refresh audio if darkness changed
  if ( darknessChanged ) {
    this._onDarknessChange(darkness, priorLevel);
    canvas.sounds._onDarknessChange(darkness, priorLevel);
  }

  // Dispatch a hook that modules can use
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

  // Test that a point falls inside a line-of-sight polygon
  let inLOS = false;
  for ( let source of visionSources.values() ) {
    if ( points.some(p => source.los.contains(p.x, p.y) ) ) {
      inLOS = true;
      break;
    }
  }
  if ( !inLOS ) return false;

  // If global illumination is active, nothing more is required
  if ( canvas.lighting.globalLight ) return true;

  // Test that a point is also within some field-of-vision polygon
  for ( let source of visionSources.values() ) {
    if ( points.some(p => source.fov.contains(p.x, p.y)) ) return true;
  }
  for ( let source of lightSources.values() ) {
    if(source.skipRender) continue
    if ( points.some(p => source.fov.contains(p.x, p.y)) ) return true;
  }
  return false;
}

function _levelsGetRayCollisions(ray, {type="movement", mode="all", _performance}={},roomTest) {
  // Define inputs
  const angleBounds = [ray.angle - (Math.PI/2), ray.angle + (Math.PI/2)];
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
  for ( let i=1; i<=stages; i++ ) {

    // Determine and iterate over the (unordered) set of nodes to test at this level of projection
    const limit = i < stages ? ray.project(i / stages) : ray.B;
    const bounds = new NormalizedRectangle(ray.A.x, ray.A.y, limit.x - ray.A.x, limit.y - ray.A.y);
    const nodes = this.quadtree.getLeafNodes(bounds);
    for ( let n of nodes ) {
      if ( testedNodes.has(n) ) continue;
      testedNodes.add(n);

      // Iterate over walls in the node to test
      const objects = n.objects;
      for ( let o of objects ) {
        const w = o.t;
        const wt = w.data[wallType];
        if (testedWalls.has(w)) continue;
        testedWalls.add(w);

        // Skip walls which don't fit the criteria
        if ( wt === CONST.WALL_SENSE_TYPES.NONE ) continue;
        if ((w.data.door > CONST.WALL_DOOR_TYPES.NONE) && (w.data.ds === CONST.WALL_DOOR_STATES.OPEN)) continue;
        if (w.direction !== null) { // Directional walls where the ray angle is not in the same hemisphere
          if (!w.isDirectionBetweenAngles(...angleBounds)) continue;
        }

        // Test a single wall
        const x = WallsLayer.testWall(ray, w,roomTest);
        if (_performance) _performance.tests++;
        if (!x) continue;
        if (isAny) return true;

        // Update a known collision point to flag the sense type
        const pt = `${x.x},${x.y}`;
        let c = collisions[pt];
        if (c) {
          c.type = Math.min(wt, c.type);
          for ( let n of o.n ) c.nodes.push(n);
        } else {
          x.type = wt;
          x.nodes = Array.from(o.n);
          collisions[pt] = x;
          collided = true;
        }
      }
    }

    // At this point we may be done if the closest collision has been fully tested
    if ( isClosest && collided ) {
      const closest = this.getClosestCollision(Object.values(collisions));
      if ( closest && closest.nodes.every(n => testedNodes.has(n) ) ) {
        return closest;
      }
    }
  }

  // Return the collision result
  if ( isAny ) return false;
  if ( isClosest ) {
    const closest = this.getClosestCollision(Object.values(collisions));
    return closest || null;
  }
  return Object.values(collisions);
}

function _levelsCheckCollision(ray, {type="movement", mode="any"}={}, roomTest=false) {
  if ( !canvas.grid.hitArea.contains(ray.B.x, ray.B.y) ) return true;
  if ( !canvas.scene.data.walls.size ) return false;
  return this.getRayCollisions(ray, {type, mode},roomTest);
}

function _levelsIsAudible() {
  if(this.levelsInaudible) return false;
  if ( this.data.hidden ) return false;
  return canvas.lighting.darknessLevel.between(this.data.darkness.min ?? 0, this.data.darkness.max ?? 1);
}

function _levelsTokenIsVisible() {
  if(!_levels || !_levels.advancedLOS){
    const gm = game.user.isGM;
    if ( this.data.hidden ) return gm;
    if ( !canvas.sight.tokenVision ) return true;
    if ( this._controlled ) return true;
    if ( canvas.sight.sources.has(this.sourceId) ) return true;
    const tolerance = Math.min(this.w, this.h) / 4;
    return canvas.sight.testVisibility(this.center, {tolerance, object: this});
  }else{
    if(this.levelsVisible === true || this.levelsVisible === false && canvas.tokens.controlled[0]) return this.levelsVisible
    this.levelsVisible=undefined
    const gm = game.user.isGM;
    if ( this.data.hidden ) return gm;
    if ( !canvas.sight.tokenVision ) return true;
    if ( this._controlled ) return true;
    if ( canvas.sight.sources.has(this.sourceId) ) return true;
    const tolerance = Math.min(this.w, this.h) / 4;
    return canvas.sight.testVisibility(this.center, {tolerance, object: this});
  }
  
}

/*WallsLayer.prototype.computePolygon = function computePolygon(origin, radius, {type="sight", angle=360, density=6, rotation=0, unrestricted=false, elevation=false}={}) {
  // Determine the maximum ray distance needs to reach all areas of the canvas
  let d = canvas.dimensions;
  let {x, y} = origin;
  const dx = Math.max(origin.x, d.width - origin.x);
  const dy = Math.max(origin.y, d.height - origin.y);
  const distance = Math.max(radius, Math.hypot(dx, dy));
  const limit = radius / distance;
  const wallType = this.constructor._mapWallCollisionType(type);

  // Determine the direction of facing, the angle of vision, and the angles of boundary rays
  const limitAngle = angle.between(0, 360, false);
  const aMin = limitAngle ? Math.normalizeRadians(Math.toRadians(rotation + 90 - (angle / 2))) : -Math.PI;
  const aMax = limitAngle ? aMin + Math.toRadians(angle) : Math.PI;

  // For high wall count maps, restrict to a subset of endpoints using quadtree bounds
  // Target wall endpoints within the vision radius or within 10 grid units, whichever is larger
  let endpoints = unrestricted ? [] : this.endpoints;
  let bounds = null;
  if ( endpoints.length > SightLayer.EXACT_VISION_THRESHOLD ) {
    const rb2 = Math.max(d.size * 10, radius);
    bounds = new NormalizedRectangle(origin.x - rb2, origin.y - rb2, (2 * rb2), (2 * rb2));
    let walls = this.quadtree.getObjects(bounds);
    endpoints = WallsLayer.getUniqueEndpoints(walls, {bounds, type});
  }

  // Cast sight rays at target endpoints using the full unrestricted line-of-sight distance
  const rays = WallsLayer.castRays(x, y, distance, {density, endpoints, limitAngle, aMin, aMax});
  const rayQueue = new Set(rays);

  // Record which Rays appear in each Quadtree quadrant
  const quadMap = new Map();
  for ( let r of rays ) {
    r._cs = null;
    r._c = null;
    const nodes = this.quadtree.getLeafNodes(r.bounds);
    for ( let n of nodes ) {
      let s = quadMap.get(n);
      if ( !s ) {
        s = new Set();
        quadMap.set(n, s);
      }
      s.add(r);
    }
  }

  // Identify the closest quadtree vertex as the origin point for progressive testing
  const quadSize = Math.max(d.sceneWidth, d.sceneHeight) / (this.quadtree.maxDepth * 2);
  const originNode = this.quadtree.getLeafNodes({x: origin.x, y: origin.y, width: 0, height: 0})[0];
  const ob = originNode.bounds;
  const testFrame = new PIXI.Rectangle((origin.x - ob.x) < (ob.width / 2) ? ob.x : ob.x + ob.width,
    (origin.y - ob.y) < (ob.height / 2) ? ob.y : ob.y + ob.height, 0, 0).pad(quadSize);

  // Iterate until we have matched all rays or run out of quadtree nodes
  const nodeQueue = new Set(unrestricted ? [] : this.quadtree.getLeafNodes(testFrame));
  const testedNodes = new Set();
  while ( rayQueue.size && nodeQueue.size ) {

    // Check every ray+wall collision for each quadrant in the batch
    const nodes = Array.from(nodeQueue);
    for (let node of nodes) {
      const rays = quadMap.get(node) || [];

      // Iterate over each wall which appears in the quadrant
      for (let obj of node.objects) {
        const w = obj.t;
        let wt = w.data[wallType];

        // Coerce interior walls beneath roofs as vision blocking for sight polygons
        const isInterior = (type === "sight") && (w.roof?.occluded === false);
        if ( isInterior ) wt = CONST.WALL_SENSE_TYPES.NORMAL;

        // Ignore walls and open doors that don't block senses
        else if ( wt === CONST.WALL_SENSE_TYPES.NONE ) continue;
        else if ((w.data.door > CONST.WALL_DOOR_TYPES.NONE) && (w.data.ds === CONST.WALL_DOOR_STATES.OPEN)) continue;

        // Iterate over rays
        for (let r of rays) {
          if ( r._c || !w.canRayIntersect(r) ) continue;

          // Test collision for the ray
          let x
          if(elevation){
            x = WallsLayer.testWall(r, w,elevation);
          } else{
              x = WallsLayer.testWall(r, w);
            }
          
          if ( SightLayer._performance ) SightLayer._performance.tests++;
          if ( !x ) continue;

          // Flag the collision
          r._cs = r._cs || new Map();
          const pt = (Math.round(x.x) << 16) + Math.round(x.y); // 32 bit integer, x[16]y[16]
          const c = r._cs.get(pt);
          if ( c ) {
            c.type = Math.min(wt, c.type);
            for ( let n of obj.n ) c.nodes.push(n);
          }
          else {
            x.type = wt;
            x.nodes = Array.from(obj.n);
            r._cs.set(pt, x);
          }
        }
      }

      // Mark this node as tested
      testedNodes.add(node);
      nodeQueue.delete(node);
    }

    // After completing a batch of quadrants, test rays that were hit for the closest collision
    for ( let r of rayQueue ) {
      if ( !r._cs ) continue;
      const closest = WallsLayer.getClosestCollision([...r._cs.values()]);
      if ( closest && closest.nodes.every(n => testedNodes.has(n)) ) {
        rayQueue.delete(r);
        r._c = closest;
      }
    }

    // If all rays have been hit we are done, otherwise expand the test frame
    if ( !rayQueue.size ) break;
    while ( (nodeQueue.size === 0) && (testedNodes.size < quadMap.size) ) {
      testFrame.pad(quadSize);
      for ( let a of this.quadtree.getLeafNodes(testFrame)) {
        if (!testedNodes.has(a)) nodeQueue.add(a);
      }
    }
  }

  // Construct visibility polygons
  const losPoints = [];
  const fovPoints = [];
  for ( let r of rays ) {
    r.los = r._c || { x: r.B.x, y: r.B.y, t0: 1, t1: 0};
    losPoints.push(r.los);
    r.fov = r.los.t0 <= limit ? r.los : r.project(limit);
    fovPoints.push(r.fov)
  }
  const los = new SourcePolygon(x, y, distance, ...losPoints);
  const fov = new SourcePolygon(x, y, radius, ...fovPoints);

  // Visualize vision rendering
  if ( CONFIG.debug.sightRays ) canvas.sight._visualizeSight(bounds, endpoints, rays, los, fov);
  if ( CONFIG.debug.sight && SightLayer._performance ) SightLayer._performance.rays = rays.length;

  // Return rays and polygons
  return {rays, los, fov};
}

PointSource.prototype.initialize = function initialize(data={},elevation=false) {
  // Clean input data
  if ( data.animation instanceof foundry.abstract.DocumentData ) data.animation = data.animation.toObject();
  data.animation = data.animation || {type: null};
  data.angle = data.angle ?? 360;
  data.alpha = data.alpha ?? 0.5;
  data.bright = data.bright ?? 0;
  data.color = typeof data.color === "string" ? foundry.utils.colorStringToHex(data.color) : (data.color ?? null);
  data.darkness = {min: data.darkness?.min ?? 0, max: data.darkness?.max ?? 1};
  data.dim = data.dim ?? 0;
  data.rotation = data.rotation ?? 0;
  data.type = data.type ?? CONST.SOURCE_TYPES.LOCAL;
  data.x = data.x ?? 0;
  data.y = data.y ?? 0;
  data.z = data.z ?? null;

  // Identify changes and assign cleaned data
  const changes = foundry.utils.flattenObject(foundry.utils.diffObject(this, data));
  foundry.utils.mergeObject(this, data);

  // Derived data attributes
  this.colorRGB = foundry.utils.hexToRGB(this.color);
  this.radius = Math.max(Math.abs(this.dim), Math.abs(this.bright));
  this.ratio = Math.clamped(Math.abs(this.bright) / this.radius, 0, 1);
  this.isDarkness = Math.min(this.dim, this.bright) < 0;
  this.limited = this.angle !== 360;
  this._animateSeed = data.seed ?? this._animateSeed ?? Math.floor(Math.random() * 100000);

  // Always update polygons for the source as the environment may have changed
  const origin = {x: this.x, y: this.y};
  const {fov, los} = canvas.walls.computePolygon(origin, this.radius, {
    type: this.sourceType || "sight",
    angle: this.angle,
    rotation: this.rotation,
    unrestricted: this.type === CONST.SOURCE_TYPES.UNIVERSAL,
    elevation: this.elevation
  });
  this.fov = fov;
  this.los = los;

  // Update shaders if the animation type changed
  const updateShaders =["animation.type", "color"].some(k => k in changes);
  if ( updateShaders ) this._initializeShaders();

  // Initialize uniforms if the appearance of the light changed
  if ( updateShaders || ["dim", "bright", "alpha"].some(k => k in changes) ) {
    this._resetColorationUniforms = true;
    this._resetIlluminationUniforms = true;
  }

  // Initialize blend modes and sorting
  this._initializeBlending();
  return this;
}

AmbientLight.prototype.updateSource = function updateSource({defer=false, deleted=false}={}) {
  if ( deleted ) {
    this.layer.sources.delete(this.sourceId);
    return defer ? null : this.layer.refresh();
  }
  console.log(this.sourceId)
  canvas.tokens.placeables.find(t=>t.sourceId == this.sourceId)
  const elevation = this.data.elevation || this.data.flags.levels?.rangeBottom
  // Update source data
  this.source.initialize({
    x: this.data.x,
    y: this.data.y,
    z: this.document.getFlag("core", "priority") || null,
    dim: this.dimRadius,
    bright: this.brightRadius,
    angle: this.data.angle,
    rotation: this.data.rotation,
    color: this.data.tintColor,
    alpha: this.data.tintAlpha,
    animation: this.data.lightAnimation,
    seed: this.document.getFlag("core", "animationSeed"),
    darkness: this.data.darkness,
    type: this.data.t,
  },elevation);

  // Update the lighting layer sources
  const isActive = (this.source.radius > 0) && !this.data.hidden;
  if ( isActive ) this.layer.sources.set(this.sourceId, this.source);
  else this.layer.sources.delete(this.sourceId);

  // Refresh the layer, unless we are deferring that update
  if ( !defer ) canvas.perception.schedule({lighting: {refresh: true}, sight: {refresh: true}});
}

Token.prototype.updateSource = function updateSource({defer=false, deleted=false, noUpdateFog=false}={}) {
  if ( CONFIG.debug.sight ) {
    SightLayer._performance = { start: performance.now(), tests: 0, rays: 0 }
  }

  // Prepare some common data
  const origin = this.getSightOrigin();
  const sourceId = this.sourceId;
  const d = canvas.dimensions;

  // Update light source
  const isLightSource = this.emitsLight && !this.data.hidden;
  if ( isLightSource && !deleted ) {
    const bright = Math.min(this.getLightRadius(this.data.brightLight), d.maxR);
    const dim = Math.min(this.getLightRadius(this.data.dimLight), d.maxR);
    this.light.initialize({
      x: origin.x,
      y: origin.y,
      dim: dim,
      bright: bright,
      angle: this.data.lightAngle,
      rotation: this.data.rotation,
      color: this.data.lightColor,
      alpha: this.data.lightAlpha,
      animation: this.data.lightAnimation
    });
    this.light.elevation=this.data.elevation
    canvas.lighting.sources.set(sourceId, this.light);
    if ( !defer ) {
      this.light.drawLight();
      this.light.drawColor();
    }
  }
  else {
    canvas.lighting.sources.delete(sourceId);
    if ( isLightSource && !defer ) canvas.lighting.refresh();
  }

  // Update vision source
  const isVisionSource = this._isVisionSource();
  if ( isVisionSource && !deleted ) {
    let dim = Math.min(this.getLightRadius(this.data.dimSight), d.maxR);
    const bright = Math.min(this.getLightRadius(this.data.brightSight), d.maxR);
    this.vision.initialize({
      x: origin.x,
      y: origin.y,
      dim: dim,
      bright: bright,
      angle: this.data.sightAngle,
      rotation: this.data.rotation
    });
    canvas.sight.sources.set(sourceId, this.vision);
    if ( !defer ) {
      this.vision.drawLight();
      canvas.sight.refresh({noUpdateFog});
    }
  }
  else {
    canvas.sight.sources.delete(sourceId);
    if ( isVisionSource && !defer ) canvas.sight.refresh();
  }
}*/