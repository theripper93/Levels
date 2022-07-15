import { injectConfig } from "./injectConfig.js";

Hooks.on("init", () => {
  
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "Token.prototype.refresh",
    _levelsTokenRefresh,
    "MIXED"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "Tile.prototype.refresh",
    _levelsTileRefresh,
    "WRAPPER"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "Token.prototype._onMovementFrame",
    _levelsOnMovementFrame,
    "WRAPPER"
  );
  if (
    !game.modules.get("perfect-vision")?.active ||
    isNewerVersion("2.8.0", game.modules.get("perfect-vision").data.version)
  ) {
    libWrapper.register(
      CONFIG.Levels.MODULE_ID,
      "LightingLayer.prototype.refresh",
      _lightingRefresh,
      "OVERRIDE"
    );
    libWrapper.register(
      CONFIG.Levels.MODULE_ID,
      "SightLayer.prototype.testVisibility",
      _levelsTestVisibility,
      "OVERRIDE"
    );
    libWrapper.register(
      CONFIG.Levels.MODULE_ID,
      "AmbientSound.prototype.isAudible",
      _levelsIsAudible,
      "OVERRIDE"
    );
  }
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "MeasuredTemplate.prototype.draw",
    _levelsTemplatedraw,
    "WRAPPER"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "MeasuredTemplate.prototype._refreshRulerText",
    _levelsRefreshRulerText,
    "OVERRIDE"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "Token.prototype.isVisible",
    _levelsTokenIsVisible,
    "OVERRIDE"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "Note.prototype.isVisible",
    _levelsNoteIsVisible,
    "WRAPPER"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "LightSource.prototype._renderTexture",
    _levelsRenderLightTexture,
    "OVERRIDE"
  );
  libWrapper.register(
    CONFIG.Levels.MODULE_ID,
    "Token.prototype._drawTooltip",
    _levelsTokendrawTooltip,
    "MIXED"
  );


  
  if (_betterRoofs) _betterRoofs.initializeRoofs();
});

Hooks.once("ready", () => {
  // Module title
  const MODULE_ID = CONFIG.Levels.MODULE_ID;
  const MODULE_TITLE = game.modules.get(MODULE_ID).data.title;

  const FALLBACK_MESSAGE_TITLE = MODULE_TITLE;
  const FALLBACK_MESSAGE = `<large>
  <p><strong>This module may be very complicated for a first timer, be sure to stop by my <a href="https://theripper93.com/">Discord</a> for help and support from the wonderful community as well as many resources</strong></p>

  <p>Thanks to all the patreons supporting the development of this module making continued updates possible!</p>
  <p>If you want to support the development of the module or get customized support in setting up your maps you can do so here : <a href="https://www.patreon.com/theripper93">Patreon</a> </p></large>
  <p><strong>Patreons</strong> get also access to <strong>15+ premium modules</strong></p>
  <p>Is Levels not enough? Go Full 3D</p>
  <h1>3D Canvas</h1>
  <iframe width="385" height="225" src="https://www.youtube.com/embed/hC1QGZFUhcU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  <p>Check 3D Canvas and all my other <strong>15+ premium modules <a href="https://theripper93.com/">Here</a></strong></p>
  <p>Special thanks to Baileywiki for the support and feedback and Blair for the amazing UI elements</p>`;

  // Settings key used for the "Don't remind me again" setting
  const DONT_REMIND_AGAIN_KEY = "popup-dont-remind-again-2";

  // Dialog code
  game.settings.register(MODULE_ID, DONT_REMIND_AGAIN_KEY, {
    name: "",
    default: false,
    type: Boolean,
    scope: "world",
    config: false,
  });
  if (game.user.isGM && !game.settings.get(MODULE_ID, DONT_REMIND_AGAIN_KEY)) {
    new Dialog({
      title: FALLBACK_MESSAGE_TITLE,
      content: FALLBACK_MESSAGE,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: "Understood" },
        dont_remind: {
          icon: '<i class="fas fa-times"></i>',
          label: "Don't remind me again",
          callback: () =>
            game.settings.set(MODULE_ID, DONT_REMIND_AGAIN_KEY, true),
        },
      },
    }).render(true);
  }
});

Hooks.on("init", () => {
  game.settings.register(CONFIG.Levels.MODULE_ID, "tokenElevScale", {
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

  game.settings.register(CONFIG.Levels.MODULE_ID, "tokenElevScaleMultiSett", {
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

  game.settings.register(CONFIG.Levels.MODULE_ID, "fogHiding", {
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

  game.settings.register(CONFIG.Levels.MODULE_ID, "revealTokenInFog", {
    name: game.i18n.localize("levels.settings.revealTokenInFog.name"),
    hint: game.i18n.localize("levels.settings.revealTokenInFog.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (setting) => {
      _levels.revealTokenInFog = setting;
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "lockElevation", {
    name: game.i18n.localize("levels.settings.lockElevation.name"),
    hint: game.i18n.localize("levels.settings.lockElevation.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "hideElevation", {
    name: game.i18n.localize("levels.settings.hideElevation.name"),
    hint: game.i18n.localize("levels.settings.hideElevation.hint"),
    scope: "world",
    config: true,
    type: Number,
    choices: {
      0: game.i18n.localize("levels.settings.hideElevation.opt0"),
      1: game.i18n.localize("levels.settings.hideElevation.opt1"),
      2: game.i18n.localize("levels.settings.hideElevation.opt2"),
    },
    default: 0,
    onChange: (setting) => {
      _levels.hideElevation = setting;
      canvas.tokens.placeables.forEach((t) => t.refresh());
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "enableTooltips", {
    name: game.i18n.localize("levels.settings.enableTooltips.name"),
    hint: game.i18n.localize("levels.settings.enableTooltips.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "preciseTokenVisibility", {
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

  game.settings.register(CONFIG.Levels.MODULE_ID, "forceUiRefresh", {
    name: game.i18n.localize("levels.settings.forceUiRefresh.name"),
    hint: game.i18n.localize("levels.settings.forceUiRefresh.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "debugRaycast", {
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
  const isInjected = html.find(`input[name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"]`).length > 0;
  if(isInjected) return;
  let heightRangeTop = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

  let showAboveRange = app.object.getFlag(CONFIG.Levels.MODULE_ID, "showAboveRange");
  if (showAboveRange == undefined || showAboveRange == null)
    showAboveRange = Infinity;

  let showifbelow = app.object.getFlag(CONFIG.Levels.MODULE_ID, "showIfAbove");
  let checkedbox = showifbelow ? ` checked=""` : "";
  let isBasement = app.object.getFlag(CONFIG.Levels.MODULE_ID, "isBasement");
  let checkedboxisBasement = isBasement ? ` checked=""` : "";
  let noFogHide = app.object.getFlag(CONFIG.Levels.MODULE_ID, "noFogHide");
  let checkedboxnoFogHide = noFogHide ? ` checked=""` : "";

  const injHtml = injectConfig.inject(app, html, {
    "moduleId": "levels",
        "tab" : {
            "name": "levels",
            "label": "Levels",
            "icon": "fas fa-layers",
        },
        "rangeTop": {
          type: "text",
          dType: "Number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          default: Infinity,
        },
        "rangeTop": {
          type: "text",
          dType: "Number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: Infinity,
        },
        "rangeBottom": {
          type: "text",
          dType: "Number",
          label: game.i18n.localize("levels.tilecoonfig.rangeBottom.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: -Infinity,
        },
        "showIfAbove": {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.showIfAbove.name"),
        },
        "showAboveRange": {
          type: "text",
          dType: "Number",
          label: game.i18n.localize("levels.tilecoonfig.showAboveRange.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: Infinity,
        },
        "isBasement": {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.isBasement.name"),
        },
        "noFogHide": {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.noFogHide.name"),
        }
  });

  let newHtml = `
  <div class="form-group">
  <label for="rangeTop">${game.i18n.localize(
    "levels.tilecoonfig.rangeTop.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
  <div class="form-fields">
      <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
  </div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeBottom" data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

<div class="form-group">
            <label>${game.i18n.localize(
              "levels.tilecoonfig.showIfAbove.name"
            )}</label>
            <div class="form-fields">
                <input type="checkbox" name="flags.${CONFIG.Levels.MODULE_ID}.showIfAbove"${checkedbox}>
            </div>
        </div>


        <div class="form-group">
<label for="showAboveRange">${game.i18n.localize(
    "levels.tilecoonfig.showAboveRange.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.showAboveRange" data-dtype="Number" value="${showAboveRange}" step="1">
</div>
</div>

        <div class="form-group">
            <label>${game.i18n.localize(
              "levels.tilecoonfig.isBasement.name"
            )}</label>
            <div class="form-fields">
                <input type="checkbox" name="flags.${CONFIG.Levels.MODULE_ID}.isBasement"${checkedboxisBasement}>
            </div>
        </div>

        <div class="form-group">
        <label>${game.i18n.localize(
          "levels.tilecoonfig.noFogHide.name"
        )}</label>
        <div class="form-fields">
            <input type="checkbox" name="flags.${CONFIG.Levels.MODULE_ID}.noFogHide"${checkedboxnoFogHide}>
        </div>
    </div>

`;
  const overh = html.find('input[name="occlusion.alpha"]');
  const formGroup = overh.closest(".form-group");
  //formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientLightConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
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
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="config.angle"]');
  const formGroup = overh.closest(".form-group");
  formGroup.before(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderNoteConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
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
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('select[name="textAnchor"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
  let heightRangeTop = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
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
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.tilecoonfig.rangeBottom.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
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
  let heightRangeTop = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeTop");
  if (heightRangeTop == undefined || heightRangeTop == null)
    heightRangeTop = Infinity;

  let heightRangeBottom = app.object.getFlag(CONFIG.Levels.MODULE_ID, "rangeBottom");
  if (heightRangeBottom == undefined || heightRangeBottom == null)
    heightRangeBottom = -Infinity;

  let drawingMode = app.object.getFlag(CONFIG.Levels.MODULE_ID, "drawingMode") || 0;
  let opt0 = drawingMode == 0 ? `selected=""` : ``;
  let opt1 = drawingMode == 1 ? `selected=""` : ``;
  let opt2 = drawingMode == 2 ? `selected=""` : ``;
  let opt3 = drawingMode == 3 ? `selected=""` : ``;

  let elevatorFloors =
    app.object.getFlag(CONFIG.Levels.MODULE_ID, "elevatorFloors") || "";

  const newHtml = `

<div class="form-group">
            <label>${game.i18n.localize(
              "levels.drawingconfig.isHole.name"
            )}</label>
            <div class="form-fields">
                <select name="flags.${CONFIG.Levels.MODULE_ID}.drawingMode" data-dtype="Number">
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
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.elevatorFloors" value="${elevatorFloors}">
</div>
</div>


<div class="form-group">
<label for="rangeTop">${game.i18n.localize(
    "levels.drawingconfig.ht.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"  data-dtype="Number" value="${heightRangeTop}" step="1">
</div>
</div>

<div class="form-group">
<label for="rangeBottom">${game.i18n.localize(
    "levels.drawingconfig.hb.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
  <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.rangeBottom"  data-dtype="Number" value="${heightRangeBottom}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="z"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

/*Hooks.on("renderTokenConfig", (app, html, data) => {
  let tokenHeight = app.token.getFlag(CONFIG.Levels.MODULE_ID, "tokenHeight") || 0;

  let newHtml = `
<div class="form-group">
            <label>${game.i18n.localize(
              "levels.tokenconfig.tokenHeight.name"
            )}<span class="units">${game.i18n.localize(
    "levels.tokenconfig.tokenHeight.unit"
  )}</span></label>
            <input type="number" step="any" name="flags.${CONFIG.Levels.MODULE_ID}.tokenHeight" placeholder="units" value="${tokenHeight}">
        </div>
`;
  const overh = html.find('input[name="elevation"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});*/

Hooks.on("renderDrawingHUD", (data, hud, drawData) => {
  let drawing = data.object.document;
  if (drawing.getFlag(CONFIG.Levels.MODULE_ID, "drawingMode")) {
    let active = drawing.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked") || false;
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
        CONFIG.Levels.MODULE_ID,
        "stairLocked",
        !(drawing.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked") || false)
      );
      let hudbtn = hud.find(`div[id="toggleStair"]`);
      if (active) hudbtn.addClass("active");
      else hudbtn.removeClass("active");
    }
  }
});

Hooks.on("renderTokenHUD", (data, hud, drawData) => {
  if (
    game.settings.get(CONFIG.Levels.MODULE_ID, "lockElevation") &&
    !game.user.isGM
  ) {
    const controlIcons = hud.find(`div[class="attribute elevation"]`);
    $(controlIcons[0]).remove();
  }
});

Hooks.on("renderMeasuredTemplateConfig", (app, html, data) => {
  let elevation = app.object.getFlag(CONFIG.Levels.MODULE_ID, "elevation");

  let newHtml = `
<div class="form-group">
<label for="elevation">${game.i18n.localize(
    "levels.template.elevation.name"
  )}<span class="units">(${game.i18n.localize(
    "levels.tilecoonfig.range.unit"
  )})</span></label>
<div class="form-fields">
    <input type="text" name="flags.${CONFIG.Levels.MODULE_ID}.elevation"  data-dtype="Number" value="${elevation}" step="1">
</div>
</div>

`;
  const overh = html.find('input[name="width"]');
  const formGroup = overh.closest(".form-group");
  formGroup.after(newHtml);
  app.setPosition({ height: "auto" });
});

Hooks.on("preCreateMeasuredTemplate", (template) => {
  const templateData = CONFIG.Levels.TemplateHandler.getTemplateData();
  if(template.document.flags?.levels?.elevation) return;
  template.data.update({
    flags: { levels: { elevation: templateData.elevation, special: templateData.special } },
  });
});

//Incompatibility Warnings

Hooks.once('libChangelogsReady', function() {
  if(game.modules.get("midi-qol")?.active && game.settings.get("midi-qol","playerControlsInvisibleTokens"))libChangelogs.registerConflict("levels", "midi-qol",game.i18n.localize("levels.conflicts.midiqol.tokenvis"),"major")
})