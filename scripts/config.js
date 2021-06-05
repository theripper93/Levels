Hooks.on("ready",()=>{
  libWrapper.register(_levelsModuleName,"Token.prototype.refresh", levelsTokenRefresh, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"Token.prototype._onMovementFrame", _levelsOnMovementFrame, "OVERRIDE")
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
      <input type="text" name="heightRange" value="${heightRange}" step="1">
  </div>
</div>
`;
  const overh = html.find('input[name="overhead"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  html.find($('button[name="submit"]')).click(app.object,_levels.saveTileConfig)
})
