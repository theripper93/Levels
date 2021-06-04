const _levelsModuleName = "levels";
let _levels;

Hooks.on("canvasReady", () => {
  _levels = Levels.get();
});

Hooks.on("sightRefresh", () => {
  let cToken = canvas.tokens.controlled[0];
  if (!cToken) return;
  let perfEnd,perfStart; if(_levels.DEBUG) perfStart = performance.now()
  let allTiles = _levels.findAllTiles()
  let holes = _levels.getHoles()
  let tokensState = _levels.getTokensState(allTiles);
  _levels.computeTokens(
    tokensState,
    cToken.data.elevation,
    holes,
    cToken.data.elevation,
    cToken.id
  );
  allTiles.forEach((tile)=>{
    _levels.computeTile(tile,_levels.getPositionRelativeToTile(cToken.data.elevation, tile))
  })

  if(_levels.DEBUG){perfEnd = performance.now();console.log(`Levels compute took ${perfEnd-perfStart} ms, FPS:${Math.round(canvas.app.ticker.FPS)}, Elevation: ${cToken.data.elevation} TokensState: `,tokensState)} 

});

Hooks.on("updateToken", (token, updates) => {
  if ("elevation" in updates) canvas.sight.refresh();
});

Hooks.on("controlToken", (token, contorlled) => {
  if(!contorlled){
    canvas.foreground.placeables.forEach((t)=>{
      _levels.removeTempTile(t);
    })
  }
});
