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
  if (_levels && canvas.scene.data.tokenVision) {
    _levels._levelsOnSightRefresh();
    //Raycast Debug
    _levels.raycastDebug();
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
    if (_levels.floorContainer.children.find((c) => c.name == token.id))
      _levels.getTokenIconSprite(
        canvas.tokens.get(token.id),
        updates.x,
        updates.y,
        "rotation" in updates
      );
  }
  if ("elevation" in updates) {
    _levels._onElevationChangeUpdate();
  }
  if ("hidden" in updates && updates.hidden==true) {
    let nt = canvas.tokens.get(token.id)
    _levels.removeTempTokenOverhead(token);
    _levels.removeTempToken(token);
    nt.icon.alpha = game.user.isGM ? 0.5 : 1;
    nt.levelsHidden = false;
    nt.levelsVisible = undefined;
  }
  _levels.debounce3DRefresh(100);
});

Hooks.on("controlToken", (token, controlled) => {
  let ElevDiff;
  if (_levels) ElevDiff = token.data.elevation != _levels.currentElevation;
  if (controlled) {
    token.visible = true;
    token.levelsVisible = true;
    token.icon.alpha = 1;
  }
  if (!controlled && game.user.isGM) {
    _levels.restoreGMvisibility();
  } else {
    if (_levels && controlled && ElevDiff) _levels._onElevationChangeUpdate();
    if (_levels && !controlled && token) {
      if (ElevDiff) _levels._onElevationChangeUpdate(token);
      if (!game.user.isGM) _levels.lastReleasedToken = token;
    }
  }
  if (_levels) _levels.currentElevation = token.data.elevation;
  if (_levels && !controlled) _levels.currentElevation = undefined;
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

Hooks.on("deleteTile",()=>{_levels.findAllTiles();})
Hooks.on("deleteDrawing",()=>{_levels.getHoles();})
Hooks.on("updateDrawing",()=>{_levels.getHoles();})


Hooks.on("updateToken", (token, updates) => {
  _levels.executeStairs(updates, token);
  _levels.getTokensState(_levels.levelsTiles);
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






