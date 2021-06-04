/****************************************************
 * ADD BETTER ROOF CONFIGURATION TO THE TILE CONFIG *
 ****************************************************/

Hooks.on("renderTileConfig", (app, html, data) => {
  let tile = canvas.foreground.get(app.object.id)
    let heightRange = app.object.getFlag(
      _levelsModuleName,
      "heightRange"
    ) || 0;

  let newHtml = `
  <div class="form-group">
  <label for="heightRange">Height Range<span class="units">(Pixels)</span></label>
  <div class="form-fields">
      <input type="number" name="heightRange" value="${heightRange}" step="1">
  </div>
</div>
`;
  const overh = html.find('input[name="overhead"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  html.find($('button[name="submit"]')).click(app.object,_levels.saveTileConfig)
})
