Hooks.on("ready",()=>{
  libWrapper.register(_levelsModuleName,"Token.prototype.refresh", _levelsTokenRefresh, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"Token.prototype._onMovementFrame", _levelsOnMovementFrame, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"LightingLayer.prototype.refresh", _lightingRefresh, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"SightLayer.prototype.testVisibility", _levelsTestVisibility, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"WallsLayer.prototype.getRayCollisions", _levelsGetRayCollisions, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"WallsLayer.prototype.checkCollision", _levelsCheckCollision, "OVERRIDE")
  _betterRoofs.initializeRoofs();
})

Hooks.on("init",()=>{

  /*game.settings.register(_levelsModuleName, "showAllTokensGM", {
    name: game.i18n.localize("levels.settings.showTokensGM.name"),
    hint: game.i18n.localize("levels.settings.showTokensGM.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });*/

  /*game.settings.register(_levelsModuleName, "hideAllUnowned", {
    name: game.i18n.localize("levels.settings.hideAllUnowned.name"),
    hint: game.i18n.localize("levels.settings.hideAllUnowned.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });*/

})

Hooks.on("renderTileConfig", (app, html, data) => {
    let heightRange = app.object.getFlag(
      _levelsModuleName,
      "heightRange"
    ) || 0;

  let newHtml = `
  <div class="form-group">
  <label for="heightRange">${game.i18n.localize("levels.tilecoonfig.range.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
  <div class="form-fields">
      <input type="text" name="flags.${_levelsModuleName}.heightRange" value="${heightRange}" step="1">
  </div>
</div>
`;
  const overh = html.find('input[name="overhead"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
})

Hooks.on("renderLightConfig", (app, html, data) => {
  let heightRange = app.object.getFlag(
    _levelsModuleName,
    "heightRange"
  ) || 0;

let newHtml = `
<div class="form-group">
<label for="heightRange">${game.i18n.localize("levels.tilecoonfig.range.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.heightRange" value="${heightRange}" step="1">
</div>
</div>
`;
const overh = html.find('input[name="angle"]');
const formGroup = overh.closest(".form-group");
formGroup.after(newHtml);
app.setPosition({ height: "auto" });
})

Hooks.on("renderDrawingConfig", (app, html, data) => {
  let heightRange = app.object.getFlag(
    _levelsModuleName,
    "heightRange"
  ) || 0;

let newHtml = `
<div class="form-group">
<label for="heightRange">${game.i18n.localize("levels.drawingconfig.range.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.heightRange" value="${heightRange}" step="1">
</div>
</div>
`;
const overh = html.find('input[name="z"]');
const formGroup = overh.closest(".form-group");
formGroup.after(newHtml);
app.setPosition({ height: "auto" });
})