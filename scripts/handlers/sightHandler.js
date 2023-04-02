export class SightHandler {

  static _testRange(visionSource, mode, target, test) {
    if (mode.range <= 0) return false;
    let radius = visionSource.object.getLightRadius(mode.range);
    const unitsToPixel = canvas.dimensions.size / canvas.dimensions.distance;
    const sourceZ = visionSource.elevation * unitsToPixel;
    const dx = test.point.x - visionSource.x;
    const dy = test.point.y - visionSource.y;
    const dz = (test.point.z ?? sourceZ) - sourceZ;
    return (dx * dx + dy * dy + dz * dz) <= radius*radius;
  }

  static performLOSTest(sourceToken, tokenOrPoint, source, type = "sight") {
    return this.advancedLosTestVisibility(sourceToken, tokenOrPoint, source, type);
  }

  static advancedLosTestVisibility(sourceToken, tokenOrPoint, source, type = "sight") {
    const angleTest = this.testInAngle(sourceToken, tokenOrPoint, source);
    if (!angleTest) return false;
    return !this.advancedLosTestInLos(sourceToken, tokenOrPoint, type);
    const inLOS = !this.advancedLosTestInLos(sourceToken, tokenOrPoint, type);
    if(sourceToken.vision.los === source) return inLOS;
    const inRange = this.tokenInRange(sourceToken, tokenOrPoint);
    if (inLOS && inRange) return true;
    return false;
  }

  static getTestPoints(token, tol = 4) {
    const targetLOSH = token.losHeight;
    if (CONFIG.Levels.settings.get("preciseTokenVisibility") === false)
      return [{ x: token.center.x, y: token.center.y, z: targetLOSH }];
    const targetElevation =
      token.document.elevation + (targetLOSH - token.document.elevation) * 0.1;
    const tokenCorners = [
      { x: token.center.x, y: token.center.y, z: targetLOSH },
      { x: token.x + tol, y: token.y + tol, z: targetLOSH },
      { x: token.x + token.w - tol, y: token.y + tol, z: targetLOSH },
      { x: token.x + tol, y: token.y + token.h - tol, z: targetLOSH },
      { x: token.x + token.w - tol, y: token.y + token.h - tol, z: targetLOSH },
    ];
    if (CONFIG.Levels.settings.get("exactTokenVisibility")) {
      tokenCorners.push(
        {
          x: token.center.x,
          y: token.center.y,
          z: targetElevation + (targetLOSH - targetElevation) / 2,
        },
        { x: token.center.x, y: token.center.y, z: targetElevation },
        { x: token.x + tol, y: token.y + tol, z: targetElevation },
        { x: token.x + token.w - tol, y: token.y + tol, z: targetElevation },
        { x: token.x + tol, y: token.y + token.h - tol, z: targetElevation },
        {
          x: token.x + token.w - tol,
          y: token.y + token.h - tol,
          z: targetElevation,
        },
      );
    }
    return tokenCorners;
  }

  static advancedLosTestInLos(sourceToken, tokenOrPoint, type = "sight") {
    if (!(tokenOrPoint instanceof Token) || CONFIG.Levels.settings.get("preciseTokenVisibility") === false)
      return this.checkCollision(sourceToken, tokenOrPoint, type);
    const sourceCenter = {
      x: sourceToken.vision.x,
      y: sourceToken.vision.y,
      z: sourceToken.losHeight,
    };
    for (let point of this.getTestPoints(tokenOrPoint)) {
      let collision = this.testCollision(
        sourceCenter,
        point,
        type,
        sourceToken
      );
      if (!collision) return collision;
    }
    return true;
  }

  static testInAngle(sourceToken, tokenOrPoint, source) {
    const documentAngle = source?.config?.angle ?? sourceToken.document?.sight?.angle ?? sourceToken.document?.config?.angle
    if (documentAngle == 360) return true;

    //normalize angle
    function normalizeAngle(angle) {
      let normalized = angle % (Math.PI * 2);
      if (normalized < 0) normalized += Math.PI * 2;
      return normalized;
    }

    const point = tokenOrPoint instanceof Token ? tokenOrPoint.center : tokenOrPoint;

    //check angled vision
    const angle = normalizeAngle(
      Math.atan2(
        point.y - sourceToken.vision.y,
        point.x - sourceToken.vision.x
      )
    );
    const rotation = (((sourceToken.document.rotation + 90) % 360) * Math.PI) / 180;
    const end = normalizeAngle(
      rotation + (documentAngle * Math.PI) / 180 / 2
    );
    const start = normalizeAngle(
      rotation - (documentAngle * Math.PI) / 180 / 2
    );
    if (start > end) return angle >= start || angle <= end;
    return angle >= start && angle <= end;
  }

  static tokenInRange(sourceToken, tokenOrPoint) {
    const range = sourceToken.vision.radius;
    if (range === 0) return false;
    if (range === Infinity) return true;
    const tokensSizeAdjust = tokenOrPoint instanceof Token
      ? (Math.min(tokenOrPoint.w, tokenOrPoint.h) || 0) / Math.SQRT2 : 0;
    const dist =
      (this.getUnitTokenDist(sourceToken, tokenOrPoint) * canvas.dimensions.size) /
        canvas.dimensions.distance -
      tokensSizeAdjust;
    return dist <= range;
  }

  static getUnitTokenDist(token1, tokenOrPoint2) {
    const unitsToPixel = canvas.dimensions.size / canvas.dimensions.distance;
    const x1 = token1.vision.x;
    const y1 = token1.vision.y;
    const z1 = token1.losHeight;
    let x2, y2, z2;

    if (tokenOrPoint2 instanceof Token) {
      x1 = tokenOrPoint2.center.x;
      y1 = tokenOrPoint2.center.y;
      z1 = tokenOrPoint2.losHeight;
    } else {
      x1 = tokenOrPoint2.x;
      y1 = tokenOrPoint2.y;
      z1 = tokenOrPoint2.z;
    }

    const d =
      Math.sqrt(
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow((z2 - z1) * unitsToPixel, 2)
      ) / unitsToPixel;
    return d;
  }

  static testInLight(object, testTarget, source, result){
    const unitsToPixel = canvas.dimensions.size / canvas.dimensions.distance;
    const top = object.document.flags?.levels?.rangeTop ?? Infinity;
    const bottom = object.document.flags?.levels?.rangeBottom ?? -Infinity;
    let lightHeight = null;
    if(object instanceof Token){
      lightHeight = object.losHeight;
    }else if(top != Infinity && bottom != -Infinity){
      lightHeight = (top + bottom) / 2;
    }
    else if(top != Infinity){
      lightHeight = top;
    }
    else if(bottom != -Infinity){
      lightHeight = bottom;
    }
    if(lightHeight == null) return result;
    const lightRadius = source.config.radius/unitsToPixel;
    const targetLOSH = testTarget.losHeight;
    const targetElevation = testTarget.document.elevation;
    const lightTop = lightHeight + lightRadius;
    const lightBottom = lightHeight - lightRadius;
    if(targetLOSH <= lightTop && targetLOSH >= lightBottom){
      return result;
    }
    if(targetElevation <= lightTop && targetElevation >= lightBottom){
      return result;
    }
    return false;
  }

  static _testCollision(wrapped, ...args) {
    const visionSource = this.config?.source;
    const target = CONFIG?.Levels?.visibilityTestObject;
    if(!visionSource?.object || !target) return wrapped(...args);
    let targetElevation;
    if (target instanceof Token) {
      targetElevation = target.losHeight;
    } else if (target instanceof PlaceableObject) {
      targetElevation = target.document.elevation ?? target.document.flags.levels?.rangeBottom;
    } else if (target instanceof DoorControl) {
      targetElevation = visionSource.elevation;
    } else {
      targetElevation = canvas.primary.background.elevation;
    }
    const p1 = {
      x: args[0].A.x,
      y: args[0].A.y,
      z: visionSource.elevation,
    };
    const p2 = {
      x: args[0].B.x,
      y: args[0].B.y,
      z: targetElevation,
    };
    const result = CONFIG.Levels.API.testCollision(p1,p2, this.config.type);
    switch (args[1]) {
      case "any": return !!result;
      case "all": return result ? [PolygonVertex.fromPoint(result)] : [];
      default: return result ? PolygonVertex.fromPoint(result) : null;
    }
  }

  static containsWrapper(wrapped, ...args){
    const LevelsConfig = CONFIG.Levels;
    const testTarget = LevelsConfig.visibilityTestObject;
    if(!this.config?.source?.object || !(testTarget instanceof Token) || this.config.source instanceof GlobalLightSource) return wrapped(...args);
    let result;
    if(this.config.source instanceof LightSource){
      result = LevelsConfig.handlers.SightHandler.testInLight(this.config.source.object, testTarget, this, wrapped(...args));
    }else if(this.config.source.object instanceof Token){
        const point = {
          x: args[0],
          y: args[1],
          z: testTarget.losHeight,
        };
        result = LevelsConfig.handlers.SightHandler.performLOSTest(this.config.source.object, point, this, this.config.type);
    }else{
        result = wrapped(...args);
    }
    return result;
}
  /**
   * Check whether the given wall should be tested for collisions, based on the collision type and wall configuration
   * @param {Object} wall - The wall being checked
   * @param {Integer} collisionType - The collision type being checked: 0 for sight, 1 for movement, 2 for sound, 3 for light
   * @returns {boolean} Whether the wall should be ignored
   */
   static shouldIgnoreWall(wall, collisionType) {
    if (collisionType === 0) {
      return (
        wall.document.sight === CONST.WALL_SENSE_TYPES.NONE ||
        (wall.document.door != 0 && wall.document.ds === 1)
      );
    } else if (collisionType === 1) {
      return (
        wall.document.move === CONST.WALL_MOVEMENT_TYPES.NONE ||
        (wall.document.door != 0 && wall.document.ds === 1)
      );
    } else if (collisionType === 2) {
      return (
        wall.document.sound === CONST.WALL_MOVEMENT_TYPES.NONE ||
        (wall.document.door != 0 && wall.document.ds === 1)
      );
    } else if (collisionType === 3) {
      return (
        wall.document.light === CONST.WALL_MOVEMENT_TYPES.NONE ||
        (wall.document.door != 0 && wall.document.ds === 1)
      );
    }
  }

  /**
   * Perform a collision test between 2 point in 3D space
   * @param {Object} p0 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {Object} p1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {String} type - "sight" or "move"/"collision" or "sound" or "light" (defaults to "sight")
   * @returns {Boolean} returns the collision point if a collision is detected, flase if it's not
   **/

   static testCollision(p0, p1, type = "sight") {
    if (canvas?.scene?.flags['levels-3d-preview']?.object3dSight) {
      if (!game.Levels3DPreview?._active) return true;
      return game.Levels3DPreview.interactionManager.computeSightCollision(
        p0,
        p1,
        type
      );
    }
    //Declare points adjusted with token height to use in the loop
    const x0 = p0.x;
    const y0 = p0.y;
    const z0 = p0.z;
    const x1 = p1.x;
    const y1 = p1.y;
    const z1 = p1.z;
     const TYPE = type == "sight" ? 0 : type == "sound" ? 2 : type == "light" ? 3 : 1;
     const ALPHATTHRESHOLD = type == "sight" ? 0.99 : 0.1;
    //If the point are on the same Z axis return the 3d wall test
    if (z0 == z1) {
      return walls3dTest.bind(this)();
    }

    //Check the background for collisions
    const bgElevation = canvas?.scene?.flags?.levels?.backgroundElevation ?? 0
    const zIntersectionPointBG = getPointForPlane(bgElevation);
    if (((z0 < bgElevation && bgElevation < z1) || (z1 < bgElevation && bgElevation < z0))) {
        return {
          x: zIntersectionPointBG.x,
          y: zIntersectionPointBG.y,
          z: bgElevation,
        };
    }


    //Loop through all the planes and check for both ceiling and floor collision on each tile
    for (let tile of canvas.tiles.placeables) {
      if(tile.document.flags?.levels?.noCollision || !tile.document.overhead) continue;
      const bottom = tile.document.flags?.levels?.rangeBottom ?? -Infinity;
      const top = tile.document.flags?.levels?.rangeTop ?? Infinity;
      if (bottom != -Infinity) {
        const zIntersectionPoint = getPointForPlane(bottom);
        if (((z0 < bottom && bottom < z1) || (z1 < bottom && bottom < z0)) && tile.containsPixel(zIntersectionPoint.x, zIntersectionPoint.y, ALPHATTHRESHOLD)) {
            return {
                x: zIntersectionPoint.x,
                y: zIntersectionPoint.y,
                z: bottom,
            };
        }
      }
    }

    //Return the 3d wall test if no collisions were detected on the Z plane
    return walls3dTest.bind(this)();

    //Get the intersection point between the ray and the Z plane
    function getPointForPlane(z) {
      const x = ((z - z0) * (x1 - x0) + x0 * z1 - x0 * z0) / (z1 - z0);
      const y = ((z - z0) * (y1 - y0) + z1 * y0 - z0 * y0) / (z1 - z0);
      const point = { x: x, y: y };
      return point;
    }
    //Check if a point in 2d space is betweeen 2 points
    function isBetween(a, b, c) {
      //test
      //return ((a.x<=c.x && c.x<=b.x && a.y<=c.y && c.y<=b.y) || (a.x>=c.x && c.x >=b.x && a.y>=c.y && c.y >=b.y))

      const dotproduct = (c.x - a.x) * (b.x - a.x) + (c.y - a.y) * (b.y - a.y);
      if (dotproduct < 0) return false;

      const squaredlengthba =
        (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
      if (dotproduct > squaredlengthba) return false;

      return true;
    }
    //Get wall heights flags, avoid infinity, use arbitrary large number instead
    function getWallHeightRange3Dcollision(wall) {
      let { top, bottom } = WallHeight.getWallBounds(wall);
      if (bottom == -Infinity) bottom = -1e9;
      if (top == Infinity) top = 1e9;
      let wallRange = [bottom, top];
      if (!wallRange[0] && !wallRange[1]) return false;
      else return wallRange;
    }
    //Compute 3d collision for walls
    function walls3dTest() {
      const rectX = Math.min(x0, x1);
      const rectY = Math.min(y0, y1);
      const rectW = Math.abs(x1 - x0);
      const rectH = Math.abs(y1 - y0);
      const rect = new PIXI.Rectangle(rectX, rectY, rectW, rectH);
      const walls = canvas.walls.quadtree.getObjects(rect);
      let terrainWalls = 0;
      for (let wall of walls) {
        if (this.shouldIgnoreWall(wall, TYPE)) continue;

        let isTerrain =
          TYPE === 0 && wall.document.sight === CONST.WALL_SENSE_TYPES.LIMITED ||
          TYPE === 1 && wall.document.move === CONST.WALL_SENSE_TYPES.LIMITED ||
          TYPE === 2 && wall.document.sound === CONST.WALL_SENSE_TYPES.LIMITED ||
          TYPE === 3 && wall.document.light === CONST.WALL_SENSE_TYPES.LIMITED;

        //declare points in 3d space of the rectangle created by the wall
        const wallBotTop = getWallHeightRange3Dcollision(wall);
        const wx1 = wall.document.c[0];
        const wx2 = wall.document.c[2];
        const wx3 = wall.document.c[2];
        const wy1 = wall.document.c[1];
        const wy2 = wall.document.c[3];
        const wy3 = wall.document.c[3];
        const wz1 = wallBotTop[0];
        const wz2 = wallBotTop[0];
        const wz3 = wallBotTop[1];

        //calculate the parameters for the infinite plane the rectangle defines
        const A = wy1 * (wz2 - wz3) + wy2 * (wz3 - wz1) + wy3 * (wz1 - wz2);
        const B = wz1 * (wx2 - wx3) + wz2 * (wx3 - wx1) + wz3 * (wx1 - wx2);
        const C = wx1 * (wy2 - wy3) + wx2 * (wy3 - wy1) + wx3 * (wy1 - wy2);
        const D =
          -wx1 * (wy2 * wz3 - wy3 * wz2) -
          wx2 * (wy3 * wz1 - wy1 * wz3) -
          wx3 * (wy1 * wz2 - wy2 * wz1);

        //solve for p0 p1 to check if the points are on opposite sides of the plane or not
        const P1 = A * x0 + B * y0 + C * z0 + D;
        const P2 = A * x1 + B * y1 + C * z1 + D;

        //don't do anything else if the points are on the same side of the plane
        if (P1 * P2 > 0) continue;

        //Check for directional walls

        if (wall.direction !== null) {
          // Directional walls where the ray angle is not in the same hemisphere
          const rayAngle = Math.atan2(y1 - y0, x1 - x0);
          const angleBounds = [rayAngle - Math.PI / 2, rayAngle + Math.PI / 2];
          if (!wall.isDirectionBetweenAngles(...angleBounds)) continue;
        }

        //calculate intersection point
        const t =
          -(A * x0 + B * y0 + C * z0 + D) /
          (A * (x1 - x0) + B * (y1 - y0) + C * (z1 - z0)); //-(A*x0 + B*y0 + C*z0 + D) / (A*x1 + B*y1 + C*z1)
        const ix = x0 + (x1 - x0) * t;
        const iy = y0 + (y1 - y0) * t;
        const iz = Math.round(z0 + (z1 - z0) * t);

        //return true if the point is inisde the rectangle
        const isb = isBetween(
          { x: wx1, y: wy1 },
          { x: wx2, y: wy2 },
          { x: ix, y: iy }
        );
        if (
          isTerrain &&
          isb &&
          iz <= wallBotTop[1] &&
          iz >= wallBotTop[0] &&
          terrainWalls == 0
        ) {
          terrainWalls++;
          continue;
        }
        if (isb && iz <= wallBotTop[1] && iz >= wallBotTop[0])
          return { x: ix, y: iy, z: iz };
      }
      return false;
    }
  }

  /**
   * Perform a collision test between 2 TOKENS in 3D space
   * @param {Token|{x:number,y:number,z:number}} token1 - a token or a point in 3d space where z is the elevation
   * @param {Token|{x:number,y:number,z:number}} token2 - a token or a point in 3d space where z is the elevation
   * @param {String} type - "sight" or "move"/"collision" or "sound" or "light" (defaults to "sight")
   * @returns {Boolean} returns the collision point if a collision is detected, flase if it's not
   **/
   static checkCollision(tokenOrPoint1, tokenOrPoint2, type = "sight") {
    const p0 = tokenOrPoint1 instanceof Token ? {
      x: tokenOrPoint1.vision.x,
      y: tokenOrPoint1.vision.y,
      z: tokenOrPoint1.losHeight,
    } : tokenOrPoint1;
    const p1 = tokenOrPoint2 instanceof Token ? {
      x: tokenOrPoint2.center.x,
      y: tokenOrPoint2.center.y,
      z: tokenOrPoint2.losHeight,
    } : tokenOrPoint2;
    return this.testCollision(p0, p1, type);
  }
}
