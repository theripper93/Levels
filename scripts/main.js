const _levelsModuleName = "levels";
let _levels;

Hooks.on("canvasReady", () => {
  _levels = Levels.get();
  if(canvas.tokens.controlled[0])_levels._onElevationChangeUpdate();
});

Hooks.on("sightRefresh", () => {
  if(_levels)_levels.refreshTokens()
});

Hooks.on("updateToken", (token, updates) => {
  if(token._controlled) return
  if ("elevation" in updates || "x" in updates || "y" in updates || "rotation" in updates) {
    _levels.getTokenIconSprite(canvas.tokens.get(token.id),updates.x,updates.y,"rotation" in updates)
    _levels.refreshTokens()
  }
  if("elevation" in updates){
    _levels._onElevationChangeUpdate();
  }
});

Hooks.on("controlToken", (token, contorlled) => {
  if(!contorlled && game.user.isGM){
    canvas.foreground.placeables.forEach((t)=>{
      _levels.removeTempTile(t);
    })
    canvas.tokens.placeables.forEach((t)=>{
      if(t.levelsHidden==true){
        t.levelsHidden==false
        t.icon.alpha=1
        _levels.removeTempToken(t)
      }
    })
  }else{
    _levels._onElevationChangeUpdate();
  }
});

