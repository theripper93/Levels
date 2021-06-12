const _levelsModuleName = "levels";
let _levels;
Hooks.on("canvasReady", () => {
  _levels = Levels.get();
  if (canvas.tokens.controlled[0]) {
    _levels._onElevationChangeUpdate();
  }
});

// MIGRATION

Hooks.once("canvasReady", () => {
  if (!_levels) _levels = Levels.get();
  if (
    game.user.isGM &&
    !game.settings.get(_levelsModuleName, "disableMigrate")
  ) {
    _levels.migrateFlags();
  }
});

//////

Hooks.on("sightRefresh", () => {
  if (_levels) {
    let cToken = canvas.tokens.controlled[0] || _levels.lastReleasedToken;
    _levels.refreshTokens(cToken);
    _levels.computeDoors(cToken);
    if (!canvas.tokens.controlled[0] && !game.user.isGM) {
      let ownedTokens = canvas.tokens.placeables.filter(
        (t) => t.actor && t.actor.testUserPermission(game.user, 2)
      );
      let tokenPovs = [];
      ownedTokens.forEach((t) => {
        tokenPovs.push(_levels.refreshTokens(t));
        _levels.computeDoors(t);
      });
      tokenPovs.forEach((povs) => {
        povs.forEach((pov) => {
          if (pov.visible) {
            pov.token.token.visible = true;
            pov.token.token.icon.alpha = 1;
          }
        });
      });
      _levels.showOwnedTokensForPlayer();
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
    canvas.tokens.placeables.forEach((t) => {
      if (t.levelsHidden == true) {
        t.levelsHidden == false;
        t.icon.alpha = 1;
        _levels.removeTempToken(t);
      }
    });
    _levels.clearLights(_levels.getLights());
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
    let gridSize = canvas.scene.dimensions.size
    let newTokenCenter = { x: tokenX + (gridSize*token.data.width)/2, y: tokenY + (gridSize*token.data.height)/2 };
    let inStair
    for (let stair of stairs) {
      if(
        stair.poly.contains(newTokenCenter.x, newTokenCenter.y)){
          if(token.inStair){
            inStair=true
          }
          else{
            if (
              tokenElev <= stair.range[1] &&
              tokenElev >= stair.range[0]
            ) {
              if (tokenElev == stair.range[1]) {
                inStair=true
                newUpdates = { elevation: stair.range[0] };
              }
              if (tokenElev == stair.range[0]) {
                inStair=true
                newUpdates = { elevation: stair.range[1] };
              }
            }
          }

        }else{
          inStair = inStair || false
        }
      
    }
    token.inStair=inStair
    if(newUpdates)token.update(newUpdates)
  }
});
