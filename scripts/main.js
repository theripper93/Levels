const _levelsModuleName = "levels";
let _levels;
Hooks.on("canvasReady", () => {
  _levels = Levels.get();
  _levels.getTokensState(_levels.findAllTiles());
  _levels.hideNotes();
  _levels.hideDrawings();
  if (canvas.tokens.controlled[0]) {
    _levels._onElevationChangeUpdate();
  }

  Hooks.once("controlToken", (token, contorlled) => {
    if (contorlled) {
      _levels.init = true;
    }
  });
});

Hooks.on("betterRoofsReady", () => {
  if (_levels) _levels.getTokensState(_levels.findAllTiles());
});

Hooks.on("sightRefresh", () => {
  if (_levels) {
    _levels._levelsOnSightRefresh();
    //Raycast Debug
    if (_levels.RAYS && canvas.tokens.controlled[0]) {
      let oldcontainer = canvas.controls.debug.children.find(
        (c) => (c.name = "levelsRAYS")
      );
      if (oldcontainer) oldcontainer.clear();
      let g = oldcontainer || new PIXI.Graphics();
      g.name = "levelsRAYS";
      let ctk = canvas.tokens.controlled[0];
      canvas.tokens.placeables.forEach((t) => {
        let isCollision = _levels.checkCollision(ctk, t, "sight");
        let color = isCollision ? 0xff0000 : 0x00ff08;
        let coords = [ctk.center.x, ctk.center.y, t.center.x, t.center.y];
        if (ctk != t)
          g.beginFill(color).lineStyle(5, color).drawPolygon(coords).endFill();
      });
      if (!oldcontainer) canvas.controls.debug.addChild(g);
    }
  }
});

Hooks.on("updateToken", (token, updates) => {
  if (token._controlled) return;
  if (
    "elevation" in updates ||
    "x" in updates ||
    "y" in updates ||
    "rotation" in updates ||
    "hidden" in updates
  ) {
    _levels.getTokenIconSprite(
      canvas.tokens.get(token.id),
      updates.x,
      updates.y,
      "rotation" in updates
    );
    _levels.refreshTokens();
  }
  if ("elevation" in updates) {
    _levels._onElevationChangeUpdate();
  }
});

Hooks.on("controlToken", (token, contorlled) => {
  if (!contorlled && game.user.isGM) {
    levelLigths = _levels.getLights();
    canvas.foreground.placeables.forEach((t) => {
      t.visible = true;
      _levels.removeTempTile(t);
      levelLigths.forEach((light) => {
        _levels.unoccludeLights(t, light, true);
      });
    });
    _levels.floorContainer.removeChildren();
    _levels.floorContainer.spriteIndex = {};
    canvas.tokens.placeables.forEach((t) => {
      if (t.levelsHidden == true) {
        t.levelsHidden == false;
        t.icon.alpha = 1;
        _levels.removeTempToken(t);
      }
    });
    _levels.clearLights(_levels.getLights());
    canvas.drawings.placeables.forEach((d) => (d.visible = true));
  } else {
    if (_levels && contorlled) _levels._onElevationChangeUpdate();
    if (_levels && !contorlled && token) {
      _levels._onElevationChangeUpdate(token);
      if (!game.user.isGM) _levels.lastReleasedToken = token;
    }
  }
});

Hooks.on("updateTile", (tile, updates) => {
  if (canvas.tokens.controlled[0]) {
    if (_levels) {
      let tileIndex = { tile: tile };
      _levels.removeTempTile(tileIndex);
      _levels.refreshTokens();
      _levels.computeDoors(canvas.tokens.controlled[0]);
      _levels._onElevationChangeUpdate();
    }
  }
});

Hooks.on("updateToken", (token, updates) => {
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
                  _levelsModuleName,
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
    if (newUpdates) token.update(newUpdates);
  }
});

Hooks.on("renderSceneControls", () => {
  if (_levels)
    _levels.computeNotes(
      _levels.lastReleasedToken || canvas.tokens.controlled[0]
    );
});

/*********************
 * DISPATCH WARNINGS *
 *********************/

Hooks.once("canvasReady", () => {
  //if(game.modules.get("lessfog")?.active) ui.notifications.error(game.i18n.localize("levels.err.lessfog"))
});
