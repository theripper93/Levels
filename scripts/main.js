const _levelsModuleName = "levels";
let _levels;

Hooks.on("canvasReady", () => {
  _levels = Levels.get();
  if (canvas.tokens.controlled[0]) _levels._onElevationChangeUpdate();
});

Hooks.on("sightRefresh", () => {
  if (_levels) {
    _levels.refreshTokens();
    if(!canvas.tokens.controlled[0])_levels.hideAllTokensForPlayer();
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
    _levels._onElevationChangeUpdate();
  }
});
