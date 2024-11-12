import { injectConfig } from "./lib/injectConfig.js";
import { TileHandler } from "./handlers/tileHandler.js";
import { RefreshHandler } from "./handlers/refreshHandler.js";
import { DrawingHandler } from "./handlers/drawingHandler.js";
import { UIHandler } from "./handlers/uiHandler.js";
import { SightHandler } from "./handlers/sightHandler.js";
import { LightHandler } from "./handlers/lightHandler.js";
import { SoundHandler } from "./handlers/soundHandler.js";
import { NoteHandler } from "./handlers/noteHandler.js";
import { TokenHandler } from "./handlers/tokenHandler.js";
import { TemplateHandler } from "./handlers/templateHandler.js";
import { FoWHandler } from "./handlers/fowHandler.js";
import {BackgroundHandler} from "./handlers/backgroundHandler.js";
import {RegionHandler} from "./handlers/regionHandler.js";
import { SettingsHandler } from "./handlers/settingsHandler.js";
import { LevelsAPI } from "./API.js";
import { registerWrappers, registerSetupWrappers } from "./wrappers.js";
import { inRange, getRangeForDocument, cloneTileMesh, inDistance } from "./helpers.js";
import { setupWarnings } from "./warnings.js";
import {LevelsMigration} from "./migration.js";
import {showWelcome} from "./showWelcome.js";

//warnings

Hooks.on("ready", () => {
    if (!game.user.isGM) return;

    setupWarnings();
});

Object.defineProperty(globalThis, "_levels", {
    get: () => {
        console.warn("Levels: _levels is deprecated. Use CONFIG.Levels.API instead.");
        return CONFIG.Levels.API;
    },
});

Tile.prototype.inTriggeringRange = function (token) {
    const bottom = this.document.elevation;
    let top = this.document.flags?.levels?.rangeTop ?? Infinity;
    if (game.Levels3DPreview?._active) {
        const depth = this.document.flags?.["levels-3d-preview"]?.depth;
        if (depth) top = bottom + (depth / canvas.scene.dimensions.size) * canvas.scene.dimensions.distance;
    }
    if (token) {
        return token.document.elevation >= bottom && token.document.elevation <= top;
    } else {
        return { bottom, top };
    }
};


Object.defineProperty(WeatherEffects.prototype, "elevation", {
    get: function () {
        return canvas?.scene?.flags?.levels?.weatherElevation ?? Infinity;
    },
    set: function (value) {
        console.error("Cannot set elevation on WeatherEffects. Levels overrides WeatherEffects.prototype.elevation core behaviour. If you wish to set the WeatherEffects elevation, use SceneDocument.flags.levels.weatherElevation");
    },
});

Hooks.on("init", () => {
    const canvas3d = game.modules.get("levels-3d-preview")?.active;

    CONFIG.Levels = {
        MODULE_ID: "levels",
    };

    Object.defineProperty(CONFIG.Levels, "useCollision3D", {
        get: function () {
            return canvas3d && canvas.scene.flags["levels-3d-preview"]?.object3dSight;
        },
    });

    Object.defineProperty(CONFIG.Levels, "currentToken", {
        get: function () {
            return this._currentToken;
        },
        set: function (value) {
            this._currentToken = value;
            Hooks.callAll("levelsPerspectiveChanged", this._currentToken);
        },
    });

    CONFIG.Levels.handlers = {
        TileHandler,
        RefreshHandler,
        DrawingHandler,
        UIHandler,
        SightHandler,
        LightHandler,
        SoundHandler,
        NoteHandler,
        TokenHandler,
        TemplateHandler,
        FoWHandler,
        BackgroundHandler,
        SettingsHandler,
        RegionHandler,
    };

    CONFIG.Levels.helpers = {
        inRange,
        getRangeForDocument,
        cloneTileMesh,
        inDistance,
        migration: new LevelsMigration(),
    };

    CONFIG.Levels.API = LevelsAPI;

    CONFIG.Levels.UI = new LevelsUI();

    CONFIG.Levels.settings = new SettingsHandler();

    Hooks.callAll("levelsInit", CONFIG.Levels);

    registerWrappers();

    CONFIG.Levels.FoWHandler = new FoWHandler();
    CONFIG.Levels.handlers.BackgroundHandler.setupElevation();


    Hooks.callAll("levelsReady", CONFIG.Levels);
});

Hooks.once("setup", () => {
    registerSetupWrappers();
} );

Hooks.once("ready", () => {

    if(game.user.isGM && game.settings.get("levels", "migrateOnStartup")) CONFIG.Levels.helpers.migration.migrateAll();

    showWelcome();
});

Hooks.on("init", () => {
    game.settings.register(CONFIG.Levels.MODULE_ID, "tokenElevScale", {
        name: game.i18n.localize("levels.settings.tokenElevScale.name"),
        hint: game.i18n.localize("levels.settings.tokenElevScale.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "tokenElevScaleMultiSett", {
        name: game.i18n.localize("levels.settings.tokenElevScaleMultiSett.name"),
        hint: game.i18n.localize("levels.settings.tokenElevScaleMultiSett.hint"),
        scope: "world",
        config: true,
        type: Number,
        range: {
            min: 0.1,
            max: 2,
            step: 0.1,
        },
        default: 1,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "fogHiding", {
        name: game.i18n.localize("levels.settings.fogHiding.name"),
        hint: game.i18n.localize("levels.settings.fogHiding.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "revealTokenInFog", {
        name: game.i18n.localize("levels.settings.revealTokenInFog.name"),
        hint: game.i18n.localize("levels.settings.revealTokenInFog.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "lockElevation", {
        name: game.i18n.localize("levels.settings.lockElevation.name"),
        hint: game.i18n.localize("levels.settings.lockElevation.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
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
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "preciseTokenVisibility", {
        name: game.i18n.localize("levels.settings.preciseTokenVisibility.name"),
        hint: game.i18n.localize("levels.settings.preciseTokenVisibility.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "exactTokenVisibility", {
        name: game.i18n.localize("levels.settings.exactTokenVisibility.name"),
        hint: game.i18n.localize("levels.settings.exactTokenVisibility.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            CONFIG.Levels.settings.cacheSettings();
        },
    });

    game.settings.register(CONFIG.Levels.MODULE_ID, "migrateOnStartup", {
        name: game.i18n.localize("levels.settings.migrateOnStartup.name"),
        hint: game.i18n.localize("levels.settings.migrateOnStartup.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true,
    });
});

Hooks.on("updateTile", (tile, updates) => {
    if (updates?.flags?.levels?.allWallBlockSight !== undefined) {
        canvas.walls.placeables.forEach((w) => w.identifyInteriorState());
        WallHeight.schedulePerceptionUpdate();
    }
});

Hooks.on("renderTileConfig", (app, html, data) => {
    const isInjected = html.find(`input[name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"]`).length > 0;
    if (isInjected) return;

    const injHtml = injectConfig.inject(app, html, {
        moduleId: "levels",
        tab: {
            name: "levels",
            label: "Levels",
            icon: "fas fa-layer-group",
        },
        rangeTop: {
            type: "number",
            label: game.i18n.localize("levels.tileconfig.rangeTop.name"),
            units: game.i18n.localize("levels.tileconfig.range.unit"),
            default: "",
            placeholder: "Infinity",
            step: "any",
        },
        showIfAbove: {
            type: "checkbox",
            label: game.i18n.localize("levels.tileconfig.showIfAbove.name"),
            notes: game.i18n.localize("levels.tileconfig.showIfAbove.hint"),
        },
        showAboveRange: {
            type: "number",
            label: game.i18n.localize("levels.tileconfig.showAboveRange.name"),
            notes: game.i18n.localize("levels.tileconfig.showAboveRange.hint"),
            units: game.i18n.localize("levels.tileconfig.range.unit"),
            default: "",
            placeholder: "Infinity",
        },
        noCollision: {
            type: "checkbox",
            label: game.i18n.localize("levels.tileconfig.noCollision.name"),
            notes: game.i18n.localize("levels.tileconfig.noCollision.hint"),
        },
        noFogHide: {
            type: "checkbox",
            label: game.i18n.localize("levels.tileconfig.noFogHide.name"),
            notes: game.i18n.localize("levels.tileconfig.noFogHide.hint"),
        },
        isBasement: {
            type: "checkbox",
            label: game.i18n.localize("levels.tileconfig.isBasement.name"),
            notes: game.i18n.localize("levels.tileconfig.isBasement.hint"),
        },
        allWallBlockSight: {
            type: "checkbox",
            label: game.i18n.localize("levels.tileconfig.allWallBlockSight.name"),
            notes: game.i18n.localize("levels.tileconfig.allWallBlockSight.hint"),
            default: true,
        },
    });
    injHtml.find(`input[name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"]`).closest(".form-group").before(`
  <p class="notes" style="color: red" id="occlusion-none-warning">${game.i18n.localize("levels.tileconfig.occlusionNone")}</>
  `);
    html.on("change", "input, select", (e) => {
        const occlusionMode = html.find(`select[name="occlusion.mode"]`).val();
        const isShowIfAbove = injHtml.find(`input[name="flags.levels.showIfAbove"]`).is(":checked");
        injHtml.find("input[name='flags.levels.showAboveRange']").closest(".form-group").toggle(isShowIfAbove);
        html.find("#occlusion-none-warning").toggle(occlusionMode == 0);
        app.setPosition({ height: "auto" });
    });
    html.find(`[name="occlusion.mode"]`).trigger("change");
    app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientLightConfig", (app, html, data) => {
    if(html.querySelector(`[name="flags.levels.rangeTop"]`)) return;
    const injHtml = injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'input[name="config.dim"]',
        rangeTop: {
            type: "number",
            label: game.i18n.localize("levels.tileconfig.rangeTop.name"),
            units: game.i18n.localize("levels.tileconfig.range.unit"),
            default: "",
            placeholder: "Infinity",
            step: "any",
        }
    });
});

Hooks.on("renderNoteConfig", (app, html, data) => {
    const injHtml = injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'select[name="textAnchor"]',
        rangeTop: {
            type: "number",
            label: game.i18n.localize("levels.tileconfig.rangeTop.name"),
            units: game.i18n.localize("levels.tileconfig.range.unit"),
            default: "",
            placeholder: "Infinity",
            step: "any",
        }
    });
});

Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
    if(html.querySelector(`[name="flags.levels.rangeTop"]`)) return;
    const injHtml = injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'input[name="radius"]',
        rangeTop: {
            type: "number",
            label: game.i18n.localize("levels.tileconfig.rangeTop.name"),
            units: game.i18n.localize("levels.tileconfig.range.unit"),
            default: "",
            placeholder: "Infinity",
            step: "any",
        }
    });
});

Hooks.on("renderDrawingConfig", (app, html, data) => {
    const injHtml = injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'input[name="sort"]',
        drawingMode: {
            type: "select",
            label: game.i18n.localize("levels.drawingconfig.isHole.name"),
            default: 0,
            dType: "Number",
            options: {
                0: game.i18n.localize("levels.drawingconfig.isHole.opt0"),
                2: game.i18n.localize("levels.drawingconfig.isHole.opt2"),
                21: game.i18n.localize("levels.drawingconfig.isHole.opt21"),
                22: game.i18n.localize("levels.drawingconfig.isHole.opt22"),
                3: game.i18n.localize("levels.drawingconfig.isHole.opt3"),
            },
        },
        elevatorFloors: {
            type: "text",
            label: game.i18n.localize("levels.drawingconfig.elevatorFloors.name"),
            notes: game.i18n.localize("levels.drawingconfig.elevatorFloors.hint"),
        },
        rangeTop: {
            type: "number",
            label: game.i18n.localize("levels.tileconfig.rangeTop.name"),
            units: game.i18n.localize("levels.tileconfig.range.unit"),
            default: "",
            placeholder: "Infinity",
            step: "any",
        }
    });
});

Hooks.on("renderMeasuredTemplateConfig", (app, html, data) => {
    const injHtml = injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: '[name="elevation"]',
        special: {
            type: "number",
            label: game.i18n.localize("levels.template.depth.name"),
            default: 0,
            dType: "Number",
        },
    });
});

Hooks.on("renderDrawingHUD", (data, hud, drawData) => {
    let drawing = data.object.document;
    if (drawing.getFlag(CONFIG.Levels.MODULE_ID, "drawingMode")) {
        let active = drawing.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked") || false;
        let toggleStairbtn = `<div class="control-icon${active ? " active" : ""}" id="toggleStair">
              <i class="fas fa-lock" width="36" height="36" title='${game.i18n.localize("levels.drawingHud.title")}'></i>
                              </div>`;
        const controlIcons = hud.find("div.control-icon");
        controlIcons.last().after(toggleStairbtn);
        $(hud.find(`div[id="toggleStair"]`)).on("click", test);
        function test() {
            console.log("test");
            active = !active;
            drawing.setFlag(CONFIG.Levels.MODULE_ID, "stairLocked", !(drawing.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked") || false));
            let hudbtn = hud.find(`div[id="toggleStair"]`);
            if (active) hudbtn.addClass("active");
            else hudbtn.removeClass("active");
        }
    }
});

Hooks.on("renderTokenHUD", (data, hud, drawData) => {
    if (CONFIG.Levels.settings.get("lockElevation") && !game.user.isGM) {
        const controlIcons = hud.find(`div[class="attribute elevation"]`);
        $(controlIcons[0]).remove();
    }
});

Hooks.on("preCreateMeasuredTemplate", (template) => {
    const templateData = CONFIG.Levels.handlers.TemplateHandler.getTemplateData();
    if (template.elevation) return;
    template.updateSource({
        elevation: templateData.elevation,
        flags: { levels: { special: templateData.special } },
    });
});

Hooks.on("renderSceneConfig", (app, html, data) => {
    injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'input[name="foregroundElevation"]',
        backgroundElevation: {
            type: "number",
            label: game.i18n.localize("levels.sceneconfig.backgroundElevation.name"),
            notes: game.i18n.localize("levels.sceneconfig.backgroundElevation.notes"),
            default: 0,
        },
    });

    injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'select[name="weather"]',
        weatherElevation: {
            type: "number",
            label: game.i18n.localize("levels.sceneconfig.weatherElevation.name"),
            notes: game.i18n.localize("levels.sceneconfig.weatherElevation.notes"),
            default: "",
            placeholder: "Infinity",
        },
    });

    injectConfig.inject(app, html, {
        moduleId: "levels",
        inject: 'input[name="fog.exploration"]',
        lightMasking: {
            type: "checkbox",
            label: game.i18n.localize("levels.sceneconfig.lightMasking.name"),
            notes: game.i18n.localize("levels.sceneconfig.lightMasking.notes"),
            default: true,
        },
    });
});
