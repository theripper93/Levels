Hooks.on("updateToken", (token, updates) => {
  if(!token?.object?.controlled) return;
  if("elevation" in updates) CONFIG.Levels.handlers.RefreshHandler.refreshPlaceables();
})

Hooks.on("controlToken", (token, controlled)=>{
  if(controlled){
    CONFIG.Levels.currentToken = canvas.tokens.controlled.find(t => t.document.sight.enabled) ?? canvas.tokens.controlled[0];
  }else{
    if(game.user.isGM && !canvas.tokens.controlled.length) CONFIG.Levels.currentToken = null;
  }
  CONFIG.Levels.handlers.RefreshHandler.refreshPlaceables();
})

Hooks.on("preUpdateToken", (token, updates, updateData) => {
  if (token?.object?.controlled) CONFIG.Levels.handlers.DrawingHandler.executeStairs(updates, token);
  const isStairUpdate = updates?.flags?.levels?.stairUpdate;
  if (isStairUpdate) {
    delete updates.flags.levels.stairUpdate;
  }
  if(token.object && "elevation" in updates && !CONFIG.Levels?.useCollision3D && !isStairUpdate && !updateData.teleport){
    const elevDiff = token.object.document.elevation - updates.elevation;
    const prevElevation = token.object.losHeight;
    const newElevation = prevElevation - elevDiff;
    const p0 = {x:token.object.x,y:token.object.y,z:prevElevation}
    const p1 = {x:token.object.x,y:token.object.y,z:newElevation+0.1}
    const collision = CONFIG.Levels.handlers.SightHandler.testCollision(p0, p1, "collision")
    if(collision){
      ui.notifications.error(game.i18n.localize("levels.err.collision"))
      if(!game.user.isGM) delete updates.elevation
    }
  }
})

Hooks.on("tearDownPrimaryCanvasGroup", () => {
  if ( canvas.primary.quadtree.all.length !== 0 ) debugger;
});