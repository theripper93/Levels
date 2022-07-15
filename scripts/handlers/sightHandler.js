export class SightHandler {
  static performLOSTest(sourceToken, token) {
    return this.advancedLosTestVisibility(sourceToken, token);
  }

  static advancedLosTestVisibility(sourceToken, token) {
    const gm = game.user.isGM;
    const visibilityOverride = this.overrideVisibilityTest(sourceToken, token);
    if (typeof visibilityOverride === "boolean") return visibilityOverride;
    const angleTest = this.testInAngle(sourceToken, token);
    if (!angleTest) return false;
    const inLOS = !this.advancedLosTestInLos(sourceToken, token);
    const inRange = this.tokenInRange(sourceToken, token);
    if (inLOS && inRange && token.document.hidden && gm) return true;
    if (inLOS && inRange && !token.document.hidden) return true;
    const inLight = this.advancedLOSCheckInLight(token);
    if (inLight === 2 && !token.document.hidden) return true;
    if (inLOS && inLight && !token.document.hidden) return true;
    return false;
  }

  //Method for modules to override the levels visibility test
  static overrideVisibilityTest(sourceToken, token) {}

  static advancedLosTestInLos(sourceToken, token) {
    const tol = 4;
    if (this.preciseTokenVisibility === false)
      return this.checkCollision(sourceToken, token, "sight");
    const targetLOSH = token.losHeight;
    const targetElevation =
      token.document.elevation + (targetLOSH - token.document.elevation) * 0.1;
    const sourceCenter = {
      x: sourceToken.center.x,
      y: sourceToken.center.y,
      z: sourceToken.losHeight,
    };
    const tokenCorners = [
      { x: token.center.x, y: token.center.y, z: targetLOSH },
      { x: token.x + tol, y: token.y + tol, z: targetLOSH },
      { x: token.x + token.w - tol, y: token.y + tol, z: targetLOSH },
      { x: token.x + tol, y: token.y + token.h - tol, z: targetLOSH },
      { x: token.x + token.w - tol, y: token.y + token.h - tol, z: targetLOSH },
    ];
    if (this.exactTokenVisibility) {
      const exactPoints = [
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
      ];
      tokenCorners.push(...exactPoints);
    }
    for (let point of tokenCorners) {
      let collision = this.testCollision(
        sourceCenter,
        point,
        "sight",
        sourceToken
      );
      if (!collision) return collision;
    }
    return true;
  }

  static testInAngle(sourceToken, token) {
    const documentAngle = sourceToken.document?.sight?.angle ?? sourceToken.document?.config?.angle
    if (documentAngle == 360) return true;

    //normalize angle
    function normalizeAngle(angle) {
      let normalized = angle % (Math.PI * 2);
      if (normalized < 0) normalized += Math.PI * 2;
      return normalized;
    }

    //check angled vision
    const angle = normalizeAngle(
      Math.atan2(
        token.center.y - sourceToken.center.y,
        token.center.x - sourceToken.center.x
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

  static tokenInRange(sourceToken, token) {
    const range = canvas.lighting.globalLight
      ? Infinity
      : sourceToken.vision.radius;
    if (range === 0) return false;
    if (range === Infinity) return true;
    const tokensSizeAdjust = (Math.min(token.w, token.h) || 0) / Math.SQRT2;
    const dist =
      (this.getUnitTokenDist(sourceToken, token) * canvas.dimensions.size) /
        canvas.dimensions.distance -
      tokensSizeAdjust;
    return dist <= range;
  }

  static advancedLOSCheckInLight(token) {
    for (let source of canvas.lighting.sources) {
      if (source.skipRender && source.object.document.documentName !== "Token")
        continue;
      if (!source.active) continue;
      if (source.object.document.documentName === "Token") {
        const lightRadius = Math.max(
          source.object.document.light.dim,
          source.object.document.light.bright
        );
        const lightTop =
          source.object.document.elevation + (lightRadius ?? Infinity);
        const lightBottom =
          source.object.document.elevation - (lightRadius ?? -Infinity);
        if (
          token.document.elevation >= lightBottom &&
          token.document.elevation <= lightTop
        ) {
          if (this.checkInLightCorners(source.los, token)) return true;
        }
      } else {
        const lightTop = source.object.document.flags.levels?.rangeTop ?? Infinity;
        const lightBottom =
          source.object.document.flags.levels?.rangeBottom ?? -Infinity;
        if (
          token.document.elevation >= lightBottom &&
          token.document.elevation <= lightTop
        ) {
          if (this.checkInLightCorners(source.los, token)) {
            return source.object?.data?.vision ? 2 : true;
          }
        }
      }
    }
    return false;
  }

  static checkInLightCorners(los, token) {
    if (!los) return false;
    const tol = 4;
    if (this.preciseTokenVisibility === false)
      return los.contains(token.center.x, token.center.y);
    const tokenCorners = [
      { x: token.center.x, y: token.center.y },
      { x: token.x + tol, y: token.y + tol },
      { x: token.x + token.w - tol, y: token.y + tol },
      { x: token.x + tol, y: token.y + token.h - tol },
      { x: token.x + token.w - tol, y: token.y + token.h - tol },
    ];
    for (let point of tokenCorners) {
      let inLos = los.contains(point.x, point.y);
      if (inLos) return inLos;
    }
    return false;
  }
  /**
   * Check whether the given wall should be tested for collisions, based on the collision type and wall configuration
   * @param {Object} wall - The wall being checked
   * @param {Integer} collisionType - The collision type being checked: 0 for sight, 1 for movement
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
    }
  }

  /**
   * Perform a collision test between 2 point in 3D space
   * @param {Object} p0 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {Object} p1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {String} type - "sight" or "collision" (defaults to "sight")
   * @returns {Boolean} returns the collision point if a collision is detected, flase if it's not
   **/

   static testCollision(p0, p1, type = "sight") {
    if (this.useCollision3D) {
      if (!game.Levels3DPreview?._active) return true;
      return game.Levels3DPreview.interactionManager.computeSightCollision(
        p0,
        p1
      );
    }
    //Declare points adjusted with token height to use in the loop
    const x0 = p0.x;
    const y0 = p0.y;
    const z0 = p0.z;
    const x1 = p1.x;
    const y1 = p1.y;
    const z1 = p1.z;
    const TYPE = type == "sight" ? 0 : 1;
    //If the point are on the same Z axis return the 3d wall test
    if (z0 == z1) {
      return walls3dTest.bind(this)();
    }

    //Loop through all the planes and check for both ceiling and floor collision on each tile
    for (let tile of canvas.tiles.placeables) {
      const bottom = tile.document.flags?.levels?.rangeBottom ?? -Infinity;
      const top = tile.document.flags?.levels?.rangeTop ?? Infinity;
      if (bottom != -Infinity) {
        const zIntersectionPoint = getPointForPlane(bottom);
        if (
          ((z0 < bottom && bottom < z1) || (z1 < bottom && bottom < z0)) &&
          tile.containsPixel(zIntersectionPoint.x, zIntersectionPoint.y)
        ) {
          if (checkForHole(zIntersectionPoint, bottom))
            return {
              x: zIntersectionPoint.x,
              y: zIntersectionPoint.y,
              z: bottom,
            };
        }
      }
      if ((top && top != Infinity) || top == 0) {
        const zIntersectionPoint = getPointForPlane(top);
        if (
          ((z0 < top && top < z1) || (z1 < top && top < z0)) &&
          tile.containsPixel(zIntersectionPoint.x, zIntersectionPoint.y)
        ) {
          if (checkForHole(zIntersectionPoint, top))
            return { x: zIntersectionPoint.x, y: zIntersectionPoint.y, z: top };
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
    //Check if a floor is hollowed by a hole
    function checkForHole(intersectionPT, zz) {
      return true;
      for (let hole of _levels.levelsHoles) {
        const hbottom = hole.range[0];
        const htop = hole.range[1];
        if (zz > htop || zz < hbottom) continue;
        if (hole.poly.contains(intersectionPT.x, intersectionPT.y)) {
          return false;
        }
      }
      return true;
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
      let terrainWalls = 0;
      for (let wall of canvas.walls.placeables) {
        if (this.shouldIgnoreWall(wall, TYPE)) continue;

        let isTerrain =
          TYPE === 0 && wall.document.sight === CONST.WALL_SENSE_TYPES.LIMITED;

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
   * @param {Object} token1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {Object} token2 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
   * @param {String} type - "sight" or "collision" (defaults to "sight")
   * @returns {Boolean} returns the collision point if a collision is detected, flase if it's not
   **/

   static checkCollision(token1, token2, type = "sight") {
    const token1LosH = token1.losHeight;
    const token2LosH = token2.losHeight;
    const p0 = {
      x: token1.center.x,
      y: token1.center.y,
      z: token1LosH,
    };
    const p1 = {
      x: token2.center.x,
      y: token2.center.y,
      z: token2LosH,
    };
    return this.testCollision(p0, p1, type, token1);
  }
}
