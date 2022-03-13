const _levelsModuleName = "levels";
let _levels;
Hooks.on("canvasReady", () => {
  _levels = Levels.get();
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
  canvas.tokens.placeables.forEach(t => t.refresh())
  Hooks.callAll("levelsReady");
});

Hooks.on("canvasReady", () => {
  canvas.tokens.controlled.forEach(t => t.updateSource());
  Hooks.once("controlToken", (token, controlled) => {
    if (controlled) {
      token.updateSource();
    }
  });
  Hooks.once("sightRefresh", () => {
    canvas.tokens.controlled.forEach(t => t.updateSource());
  })
})

Hooks.on("betterRoofsReady", () => {
  canvas.foreground.refresh();
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
  /*if ("hidden" in updates && updates.hidden==true) {
    let nt = canvas.tokens.get(token.id)
    _levels.removeTempTokenOverhead(token);
    _levels.removeTempToken(token);
    nt.icon.alpha = token.data.hidden
    ? Math.min(token.data.alpha, 0.5)
    : token.data.alpha;
    nt.levelsHidden = false;
    nt.levelsVisible = undefined;
  }*/
  _levels.debounce3DRefresh(100);
});

Hooks.on("controlToken", async (token, controlled) => {
  if(!_levels) return;
  if(!controlled && canvas.tokens.controlled.length == 0){
    await _levels.wait(100);
    if(canvas.tokens.controlled.length != 0) return;
  }
  let ElevDiff = true//token.data.elevation != _levels.currentElevation; Disabled this, check if it's needed
  _levels.currentElevation = token.data.elevation;
  //Remove clones and set token to visible if controlled
  if (controlled) {
    token.visible = true;
    token.levelsVisible = true;
    token.levelsHidden = false;
    _levels.removeTempTokenOverhead(token);
    _levels.removeTempToken(token);
  }else{
    _levels.currentElevation = undefined;
    _levels.lastTokenForTemplate = token
  }
  //Reveal and cleanup all tokens for gm if no token is controlled
  if (!controlled && canvas.tokens.controlled.length == 0 && game.user.isGM) {
    _levels.restoreGMvisibility();
  }
  if (controlled && ElevDiff) {
    //Debounce to prevent multiple triggers on multiple token selection
    _levels.debouncedElevationChange()
  };
  //Handle players  
  if (!controlled && token) {
    _levels.lastReleasedToken = token;
  }

  if ((!controlled && canvas.tokens.controlled.length == 0 && !game.user.isGM) || !token.data.vision){
    _levels._onElevationChangeUpdate( _levels.lastReleasedToken)
    _levels.collateVisions()
    setTimeout(() => {
      canvas.tokens.placeables.forEach(t => t.refresh())
    },50) 
  }

});

Hooks.on("updateTile", (tile, updates) => {
  if (canvas.tokens.controlled[0]) {
    if (_levels) {
      let tileIndex = { tile: tile.object };
      _levels.removeTempTile(tileIndex);
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
  _levels.tokenRevealFogContainer?.spriteIndex[token.id]?.destroy();
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

Hooks.once("ready", () => {
  if(game.settings.get("wall-height", "enableTokenHeight")){
    ui.notifications.error(game.i18n.localize("levels.err.tokenheight"))
    game.settings.set("wall-height", "enableTokenHeight", false)
  }
})

Hooks.once("controlToken", () => {
  canvas.tokens.placeables.forEach(t => t.updateSource())
})

/*Hooks.once('libChangelogsReady', function() {
  libChangelogs.registerConflict("levels", "parallaxia","Having Parallaxia Enabled will cause Levels to not function!","critical")
})*/