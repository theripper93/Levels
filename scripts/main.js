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
  canvas.tokens.placeables.forEach(t => t.drawTooltip())
  Hooks.callAll("levelsReady");
});

Hooks.on("betterRoofsReady", () => {
  if (_levels) _levels.getTokensState(_levels.findAllTiles());
});

Hooks.on("sightRefresh", () => {
  if (_levels && canvas.sight.tokenVision) {
    _levels._levelsOnSightRefresh();
    //Raycast Debug
    _levels.raycastDebug();
  }
});

Hooks.on("updateToken", (token, updates) => {
  let rToken = canvas.tokens.get(token.id)
  if (
    "elevation" in updates ||
    "x" in updates ||
    "y" in updates ||
    "rotation" in updates ||
    "hidden" in updates
  ) {
    if (_levels.floorContainer.children.find((c) => c.name == token.id))
      _levels.getTokenIconSprite(
        rToken,
        updates.x,
        updates.y,
        "rotation" in updates
      );
  }
  if ("elevation" in updates && rToken._controlled) {
    _levels._onElevationChangeUpdate();
  }
  if ("hidden" in updates && updates.hidden==true) {
    let nt = canvas.tokens.get(token.id)
    _levels.removeTempTokenOverhead(token);
    _levels.removeTempToken(token);
    nt.icon.alpha = token.data.hidden
    ? Math.min(token.data.alpha, 0.5)
    : token.data.alpha;
    nt.levelsHidden = false;
    nt.levelsVisible = undefined;
  }
  _levels.debounce3DRefresh(100);
});

Hooks.on("controlToken", (token, controlled) => {
  let ElevDiff;
  if (_levels) ElevDiff = token.data.elevation != _levels.currentElevation;
  if (_levels && controlled) {
    token.visible = true;
    token.levelsVisible = true;
    /*token.icon.alpha = token.data.hidden
    ? Math.min(token.data.alpha, 0.5)
    : token.data.alpha;*/
    token.levelsHidden = false;
    _levels.removeTempTokenOverhead(token);
    _levels.removeTempToken(token);
  }
  if (!controlled && canvas.tokens.controlled.length == 0 && game.user.isGM) {
    _levels.restoreGMvisibility();
  } else {
    if (_levels && controlled && ElevDiff) _levels._onElevationChangeUpdate();
    if (_levels && !controlled && token) {
      if(ElevDiff || !game.user.isGM)_levels._onElevationChangeUpdate(token);
      if(!game.user.isGM)_levels.lastReleasedToken = token;
    }
  }
  if (_levels && !controlled && token && !game.user.isGM) {_levels.lastReleasedToken = token;}
  if (_levels) _levels.currentElevation = token.data.elevation;
  if (_levels && !controlled){
    _levels.currentElevation = undefined;}
  if(!controlled) _levels.lastTokenForTemplate = token
});

Hooks.on("updateTile", (tile, updates) => {
  if (canvas.tokens.controlled[0]) {
    if (_levels) {
      let tileIndex = { tile: tile.object };
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
  if(canvas.tokens.get(token.id)?._controlled)_levels.executeStairs(updates, token);
  _levels.getTokensState(_levels.levelsTiles);
});

Hooks.on("renderSceneControls", () => {
  if (_levels)
    _levels.computeNotes(
      _levels.lastReleasedToken || canvas.tokens.controlled[0]
    );
});

Hooks.on("deleteToken", (token) => {
  _levels.removeTempTokenOverhead({id:token.id});
  _levels.removeTempToken({id:token.id});
})

Hooks.on("preUpdateToken", (token,updates) => {
  if("elevation" in updates){
    const elevDiff = token.object.data.elevation - updates.elevation;
    const p0 = {x:token.object.x,y:token.object.y,z:updates.elevation}
    const p1 = {x:token.object.x,y:token.object.y,z:token.object.losHeight-elevDiff+0.1}
    const collision = _levels.testCollision(p0, p1, "collision")
    if(collision){
      ui.notifications.error(game.i18n.localize("levels.err.collision"))
      if(!game.user.isGM) delete updates.elevation
    }
  }
})

/*********************
 * DISPATCH WARNINGS *
 *********************/

Hooks.once("canvasReady", () => {
  //if(game.modules.get("lessfog")?.active) ui.notifications.error(game.i18n.localize("levels.err.lessfog"))
});






