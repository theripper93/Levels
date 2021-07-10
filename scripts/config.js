Hooks.on("init", () => {
  libWrapper.register(
    _levelsModuleName,
    "Token.prototype.refresh",
    _levelsTokenRefresh,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "Token.prototype._onMovementFrame",
    _levelsOnMovementFrame,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "LightingLayer.prototype.refresh",
    _lightingRefresh,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "SightLayer.prototype.testVisibility",
    _levelsTestVisibility,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "WallsLayer.prototype.getRayCollisions",
    _levelsGetRayCollisions,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "WallsLayer.prototype.checkCollision",
    _levelsCheckCollision,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "AmbientSound.prototype.isAudible",
    _levelsIsAudible,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "MeasuredTemplate.prototype.draw",
    _levelsTemplatedraw,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "Token.prototype.isVisible",
    _levelsTokenIsVisible,
    "OVERRIDE"
  );
  libWrapper.register(
    _levelsModuleName,
    "Token.prototype.checkCollision",
    _levelsTokenCheckCollision,
    "OVERRIDE"
  );
  if (_betterRoofs) _betterRoofs.initializeRoofs();
});

Hooks.once('ready', () => {
  // Module title
  MODULE_ID= _levelsModuleName;
  const MODULE_TITLE = game.modules.get(MODULE_ID).data.title;

  const FALLBACK_MESSAGE_TITLE = MODULE_TITLE;
  const FALLBACK_MESSAGE = `<large>
  <p><strong>This module may be very complicated for a first timer, be sure to stop by my <a href="https://discord.gg/F53gBjR97G">Discord</a> for help and support from the wonderfull community as well as many resources</strong></p>

  <p>Thanks to all the patreons supporting the developement of this module making continued updates possible!</p>
  <p>If you want to support the developement of the module or get customized support in setting up your maps you can do so here : <a href="https://www.patreon.com/theripper93">Patreon</a> </p></large>
  <p>Special thanks to Baileywiki for the support and feedback and Blair for the amazing UI elements</p>`;

  // Settings key used for the "Don't remind me again" setting
  const DONT_REMIND_AGAIN_KEY = "popup-dont-remind-again";

  // Dialog code
  game.settings.register(MODULE_ID, DONT_REMIND_AGAIN_KEY, { name: '', default: false, type: Boolean, scope: 'world', config: false });
  if(game.user.isGM && !game.settings.get(MODULE_ID, DONT_REMIND_AGAIN_KEY)) {
      new Dialog({
          title: FALLBACK_MESSAGE_TITLE,
          content: FALLBACK_MESSAGE, buttons: {
              ok: { icon: '<i class="fas fa-check"></i>', label: 'Understood' },
              dont_remind: { icon: '<i class="fas fa-times"></i>', label: "Don't remind me again", callback: () => game.settings.set(MODULE_ID, DONT_REMIND_AGAIN_KEY, true) }
          }
      }).render(true);
  }
});

Hooks.on("init", () => {
  game.settings.register(_levelsModuleName, "tokenElevScale", {
    name: game.i18n.localize("levels.settings.tokenElevScale.name"),
    hint: game.i18n.localize("levels.settings.tokenElevScale.name"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (setting) => {
      _levels.elevationScale = setting;
      _levels.updateScales();
    },
  });

  game.settings.register(_levelsModuleName, "tokenElevScaleMultiSett", {
    name: game.i18n.localize("levels.settings.tokenElevScaleMultiSett.name"),
    hint: game.i18n.localize("levels.settings.tokenElevScaleMultiSett.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    onChange: (setting) => {
      _levels.tokenElevScaleMultiSett = setting;
    },
  });

  game.settings.register(_levelsModuleName, "fogHiding", {
    name: game.i18n.localize("levels.settings.fogHiding.name"),
    hint: game.i18n.localize("levels.settings.fogHiding.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (setting) => {
      _levels.fogHiding = setting;
      _levels._onElevationChangeUpdate();
    },
  });

  game.settings.register(_levelsModuleName, "lockElevation", {
    name: game.i18n.localize("levels.settings.lockElevation.name"),
    hint: game.i18n.localize("levels.settings.lockElevation.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(_levelsModuleName, "defaultLosHeight", {
    name: game.i18n.localize("levels.settings.defaultLosHeight.name"),
    hint: game.i18n.localize("levels.settings.defaultLosHeight.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 6,
    onChange: (setting) => {
      _levels.defaultTokenHeight = setting;
    },
  });

  game.settings.register(_levelsModuleName, "autoLOSHeight", {
    name: game.i18n.localize("levels.settings.autoLOSHeight.name"),
    hint: game.i18n.localize("levels.settings.autoLOSHeight.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (setting) => {
      _levels.autoLOSHeight = setting;
    },
  });

  game.settings.register(_levelsModuleName, "enableTooltips", {
    name: game.i18n.localize("levels.settings.enableTooltips.name"),
    hint: game.i18n.localize("levels.settings.enableTooltips.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(_levelsModuleName, "preciseLightOcclusion", {
    name: game.i18n.localize("levels.settings.preciseLightOcclusion.name"),
    hint: game.i18n.localize("levels.settings.preciseLightOcclusion.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (setting) => {
      _levels.preciseLightOcclusion = setting;
    },
  });

  game.settings.register(_levelsModuleName, "preciseTokenVisibility", {
    name: game.i18n.localize("levels.settings.preciseTokenVisibility.name"),
    hint: game.i18n.localize("levels.settings.preciseTokenVisibility.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (setting) => {
      _levels.preciseTokenVisibility = setting;
    },
  });

  game.settings.register(_levelsModuleName, "blockSightMovement", {
    name: game.i18n.localize("levels.settings.blockSightMovement.name"),
    hint: game.i18n.localize("levels.settings.blockSightMovement.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(_levelsModuleName, "debugRaycast", {
    name: game.i18n.localize("levels.settings.debugRaycast.name"),
    hint: game.i18n.localize("levels.settings.debugRaycast.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (setting) => {
      _levels.RAYS = setting;
    },
  });
});

Hooks.on("renderTileConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(_levelsModuleName, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(_levelsModuleName, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

    let showAboveRange = app.object.getFlag(_levelsModuleName, "showAboveRange");
    if (showAboveRange == undefined || showAboveRange == null)
    showAboveRange = Infinity;


  let showifbelow = app.object.getFlag(_levelsModuleName, "showIfAbove");
  let checkedbox = showifbelow ? ` checked=""` : "";
  let isBasement = app.object.getFlag(_levelsModuleName, "isBasement");
  let checkedboxisBasement = isBasement ? ` checked=""` : "";
  let noFogHide = app.object.getFlag(_levelsModuleName, "noFogHide");
  let checkedboxnoFogHide = noFogHide ? ` checked=""` : "";


  let newHtml = `
  <div class="form-group">
  <label for="rangeTop">${game.i18n.localize(
    "levels.tilecoonfig.rangeTop.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
  <div class="form-fields">
      <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
  </div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeBottom" data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

<div class="form-group">
            <label>${game.i18n.localize(
              "levels.tilecoonfig.showIfAbove.name"
            )}</label>
            <div class="form-fields">
                <input type="checkbox" name="flags.${_levelsModuleName}.showIfAbove"${checkedbox}>
            </div>
        </div>


        <div class="form-group">
<label for="showAboveRange">${game.i18n.localize(
    "levels.tilecoonfig.showAboveRange.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.showAboveRange" data-dtype="Number" value="${showAboveRange}" step="1">
</div>
</div>

        <div class="form-group">
            <label>${game.i18n.localize(
              "levels.tilecoonfig.isBasement.name"
            )}</label>
            <div class="form-fields">
                <input type="checkbox" name="flags.${_levelsModuleName}.isBasement"${checkedboxisBasement}>
            </div>
        </div>

        <div class="form-group">
        <label>${game.i18n.localize(
          "levels.tilecoonfig.noFogHide.name"
        )}</label>
        <div class="form-fields">
            <input type="checkbox" name="flags.${_levelsModuleName}.noFogHide"${checkedboxnoFogHide}>
        </div>
    </div>

`;
  const overh = html.find('input[name="occlusion.alpha"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderLightConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(_levelsModuleName, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(_levelsModuleName, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

  let newHtml = `
<div class="form-group">
<label for="rangeTop">${game.i18n.localize(
    "levels.tilecoonfig.rangeTop.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${_levelsModuleName}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="angle"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderNoteConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(_levelsModuleName, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(_levelsModuleName, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

  let newHtml = `
<div class="form-group">
<label for="rangeTop">${game.i18n.localize(
    "levels.tilecoonfig.rangeTop.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${_levelsModuleName}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('select[name="textAnchor"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(_levelsModuleName, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(_levelsModuleName, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

  let newHtml = `
<div class="form-group">
<label for="rangeTop">${game.i18n.localize(
    "levels.tilecoonfig.rangeTop.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${_levelsModuleName}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html
    .find('p[class="hint"]')
    .eq(html.find('p[class="hint"]').length - 1);
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderDrawingConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(_levelsModuleName, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(_levelsModuleName, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

  let drawingMode = app.object.getFlag(_levelsModuleName, "drawingMode") || 0;
  let opt0 = drawingMode == 0 ? `selected=""` : ``;
  let opt1 = drawingMode == 1 ? `selected=""` : ``;
  let opt2 = drawingMode == 2 ? `selected=""` : ``;
  let opt3 = drawingMode == 3 ? `selected=""` : ``;

  let elevatorFloors =
    app.object.getFlag(_levelsModuleName, "elevatorFloors") || "";

  const newHtml = `

<div class="form-group">
            <label>${game.i18n.localize(
              "levels.drawingconfig.isHole.name"
            )}</label>
            <div class="form-fields">
                <select name="flags.${_levelsModuleName}.drawingMode" data-dtype="Number">
                    <option value="0" ${opt0}>${game.i18n.localize(
    "levels.drawingconfig.isHole.opt0"
  )}</option><option value="1" ${opt1}>${game.i18n.localize(
    "levels.drawingconfig.isHole.opt1"
  )}</option><option value="2" ${opt2}>${game.i18n.localize(
    "levels.drawingconfig.isHole.opt2"
  )}</option><option value="3" ${opt3}>${game.i18n.localize(
    "levels.drawingconfig.isHole.opt3"
  )}</option>
                </select>
            </div>
        </div>

<div class="form-group">
<p class="notes">${game.i18n.localize(
    "levels.drawingconfig.elevatorFloors.hint"
  )}.</p>
<label for="elevatorFloors">${game.i18n.localize(
    "levels.drawingconfig.elevatorFloors.name"
  )}</label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.elevatorFloors" value="${elevatorFloors}">
</div>
</div>


<div class="form-group">
<label for="rangeTop">${game.i18n.localize(
    "levels.drawingconfig.ht.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.drawingconfig.hb.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${_levelsModuleName}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="z"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderTokenConfig", (app, html, data) => {
  let tokenHeight = app.object.getFlag(_levelsModuleName, "tokenHeight") || 0;

  let newHtml = `
<div class="form-group">
            <label>${game.i18n.localize(
              "levels.tokenconfig.tokenHeight.name"
            )}<span class="units">${game.i18n.localize(
    "levels.tokenconfig.tokenHeight.unit"
  )}</span></label>
            <input type="number" name="flags.${_levelsModuleName}.tokenHeight" placeholder="units" value="${tokenHeight}">
        </div>
`;
  const overh = html.find('input[name="elevation"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderDrawingHUD", (data, hud, drawData) => {
  let drawing = data.object.document;
  if (drawing.getFlag(_levelsModuleName, "drawingMode")) {
    let active = drawing.getFlag(_levelsModuleName, "stairLocked") || false;
    let toggleStairbtn = `<div class="control-icon${
      active ? " active" : ""
    }" id="toggleStair">
              <i class="fas fa-lock" width="36" height="36" title='${game.i18n.localize(
                "levels.drawingHud.title"
              )}'></i>
                              </div>`;
    const controlIcons = hud.find("div.control-icon");
    controlIcons.last().after(toggleStairbtn);
    $(hud.find(`div[id="toggleStair"]`)).on("click", test);
    function test() {
      console.log("test");
      active = !active;
      drawing.setFlag(
        _levelsModuleName,
        "stairLocked",
        !(drawing.getFlag(_levelsModuleName, "stairLocked") || false)
      );
      let hudbtn = hud.find(`div[id="toggleStair"]`);
      if (active) hudbtn.addClass("active");
      else hudbtn.removeClass("active");
    }
  }
});

Hooks.on("renderTokenHUD", (data, hud, drawData) => {
  if (
    game.settings.get(_levelsModuleName, "lockElevation") &&
    !game.user.isGM
  ) {
    const controlIcons = hud.find(`div[class="attribute elevation"]`);
    $(controlIcons[0]).remove();
  }
});

Hooks.on("renderMeasuredTemplateConfig", (app, html, data) => {
  let elevation = app.object.getFlag(_levelsModuleName, "elevation");

  let newHtml = `
<div class="form-group">
<label for="elevation">${game.i18n.localize(
    "levels.template.elevation.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${_levelsModuleName}.elevation"  data-dtype="Number" value="${elevation}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="width"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("preCreateMeasuredTemplate", (template) => {
  const cToken = canvas.tokens.controlled[0] || _levels.lastTokenForTemplate;
  const handMode = (typeof LevelsVolumetricTemplates !== 'undefined') && LevelsVolumetricTemplates.tools.handMode && cToken ? Math.round((_levels.getTokenLOSheight(cToken) - cToken?.data?.elevation)*0.8) : 0
  let elevation;
  let special
  if (_levels.nextTemplateHeight !== undefined) {
    elevation = _levels.nextTemplateHeight;
    special = _levels.nextTemplateSpecial;
    _levels.nextTemplateHeight = undefined;
    _levels.templateElevation = false;
    _levelsTemplateTool.active = false;
      $("body")
        .find(`li[data-tool="setTemplateElevation"]`)
        .removeClass("active");
  } else {
    elevation = cToken?.data?.elevation+handMode || 0;
  }
  template.data.update({ flags: { levels: { elevation: elevation,special:special } } });
});
