Hooks.on("ready",()=>{
  libWrapper.register(_levelsModuleName,"Token.prototype.refresh", _levelsTokenRefresh, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"Token.prototype._onMovementFrame", _levelsOnMovementFrame, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"LightingLayer.prototype.refresh", _lightingRefresh, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"SightLayer.prototype.testVisibility", _levelsTestVisibility, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"WallsLayer.prototype.getRayCollisions", _levelsGetRayCollisions, "OVERRIDE")
  libWrapper.register(_levelsModuleName,"WallsLayer.prototype.checkCollision", _levelsCheckCollision, "OVERRIDE")
  if(_betterRoofs)_betterRoofs.initializeRoofs();
})

Hooks.on("init",()=>{

  /*game.settings.register(_levelsModuleName, "disableMigrate", {
    name: "Disable Migration on Startup",
    hint: "Disable the migration to the new system when opening a wold (requires refresh)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {window.location.reload()}
  });*/
  
  game.settings.register(_levelsModuleName, "enableTooltips", {
    name: game.i18n.localize("levels.settings.enableTooltips.name"),
    hint: game.i18n.localize("levels.settings.enableTooltips.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

})

Hooks.on("renderTileConfig", (app, html, data) => {
    let heightRangeTop = app.object.getFlag(
      _levelsModuleName,
      "rangeTop"
    )
    if(heightRangeTop==undefined || heightRangeTop==null)heightRangeTop=Infinity

    let heightRangeBottom = app.object.getFlag(
      _levelsModuleName,
      "rangeBottom"
    )
    if(heightRangeBottom==undefined || heightRangeBottom==null)heightRangeBottom=-Infinity

  let newHtml = `
  <div class="form-group">
  <label for="rangeTop">${game.i18n.localize("levels.tilecoonfig.rangeTop.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
  <div class="form-fields">
      <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
  </div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize("levels.tilecoonfig.rangeBottom.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeBottom" data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="occlusion.alpha"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
})

Hooks.on("renderLightConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(
    _levelsModuleName,
    "rangeTop"
  )
  if(heightRangeTop==undefined || heightRangeTop==null)heightRangeTop=Infinity

  let heightRangeBottom = app.object.getFlag(
    _levelsModuleName,
    "rangeBottom"
  )
  if(heightRangeBottom==undefined || heightRangeBottom==null)heightRangeBottom=-Infinity

let newHtml = `
<div class="form-group">
<label for="rangeTop">${game.i18n.localize("levels.tilecoonfig.rangeTop.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize("levels.tilecoonfig.rangeBottom.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${_levelsModuleName}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
const overh = html.find('input[name="angle"]');
const formGroup = overh.closest(".form-group");
formGroup.after(newHtml);
app.setPosition({ height: "auto" });
})

Hooks.on("renderDrawingConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(
    _levelsModuleName,
    "rangeTop"
  )
  if(heightRangeTop==undefined || heightRangeTop==null)heightRangeTop=Infinity

  let heightRangeBottom = app.object.getFlag(
    _levelsModuleName,
    "rangeBottom"
  )
  if(heightRangeBottom==undefined || heightRangeBottom==null)heightRangeBottom=-Infinity

  let drawingMode = app.object.getFlag(
    _levelsModuleName,
    "drawingMode"
  ) || 0;
let opt0 = drawingMode == 0 ? `selected=""` : ``
let opt1 = drawingMode == 1 ? `selected=""` : ``
let opt2 = drawingMode == 2 ? `selected=""` : ``

const newHtml = `

<div class="form-group">
            <label>${game.i18n.localize("levels.drawingconfig.isHole.name")}</label>
            <div class="form-fields">
                <select name="flags.${_levelsModuleName}.drawingMode" data-dtype="Number">
                    <option value="0" ${opt0}>${game.i18n.localize("levels.drawingconfig.isHole.opt0")}</option><option value="1" ${opt1}>${game.i18n.localize("levels.drawingconfig.isHole.opt1")}</option><option value="2" ${opt2}>${game.i18n.localize("levels.drawingconfig.isHole.opt2")}</option>
                </select>
            </div>
        </div>

<div class="form-group">
<label for="rangeTop">${game.i18n.localize("levels.drawingconfig.ht.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize("levels.drawingconfig.hb.name")}<span class="units">(${game.i18n.localize("levels.tilecoonfig.range.unit")})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${_levelsModuleName}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
const overh = html.find('input[name="z"]');
const formGroup = overh.closest(".form-group");
formGroup.after(newHtml);
app.setPosition({ height: "auto" });
})