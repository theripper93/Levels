import { LevelsMigration } from "./migration.js";
import { RegionHandler } from "./regionHandler.js";

const MODULE_ID = "levels";

export const API = {};

Hooks.once("init", () => {

    API.migration = new LevelsMigration();
    game.modules.get(MODULE_ID).API = API;
    CONFIG.Levels = {
        handlers: {
            RegionHandler,
        },
        helpers: {
            migration: API.migration,
        }
    };

    window.libWrapper?.register(MODULE_ID, "Scene.prototype.testSurfaceCollision", sceneTestSurfaceCollision, "MIXED");

    const renderTileConfig = (app, html, data) => {
        if (!game.user.isGM || html.querySelector("input[name='flags.patrol.blockSightMovement']")) return;
      
        const tile = app.document;
        const toggleHTML = `
          <div class="form-group notification warning" data-tooltip="${game.i18n.localize("levels.settings.blockSightMovement.hint")}">
            <label>${game.i18n.localize("levels.settings.blockSightMovement.name")}</label>
            <input type="checkbox" name="flags.levels.blockSightMovement" data-dtype="Boolean" ${tile.getFlag(MODULE_ID, "blockSightMovement") ? "checked" : ""}>
          </div>
        `;
      
        const levelsInput = html.querySelector("[name='levels']");
        const formGroup = levelsInput.closest(".form-group");
      
        const wrapper = document.createElement("div");
        wrapper.innerHTML = toggleHTML;
        formGroup.insertAdjacentElement("afterend", wrapper);
      
        app.setPosition({ height: "auto" });
    }

    Hooks.on("renderTileConfig", renderTileConfig);
    Hooks.on("getSceneContextOptions", API.migration.levelMergeContextOptions);

    game.settings.register(MODULE_ID, "migrateOnStartupDialog", {
        name: game.i18n.localize(`${MODULE_ID}.settings.migrateOnStartupDialog.name`),
        hint: game.i18n.localize(`${MODULE_ID}.settings.migrateOnStartupDialog.hint`),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true,
    });

    game.settings.register(MODULE_ID, "fastForwardMigration", {
        name: game.i18n.localize(`${MODULE_ID}.settings.fastForwardMigration.name`),
        hint: game.i18n.localize(`${MODULE_ID}.settings.fastForwardMigration.hint`),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });
});

Hooks.once("ready", () => {
    if (game.user.isGM && game.settings.get(MODULE_ID, "migrateOnStartupDialog")) API.migration.showManualMigrationDialog();
});

function sceneTestSurfaceCollision(wrapped, ...args) {
    const [ origin, destination, options ] = args;
    if (game.Levels3DPreview?._active) return wrapped(...args);
    if (!["move", "sight"].includes(options.type) || options.mode !== "any") return wrapped(...args);

    const ALPHATTHRESHOLD = options.type == "sight" ? 0.99 : 0.1;

    function getPointForPlane(z) {
        const x = ((z - origin.elevation) * (destination.x - origin.x) + origin.x * destination.elevation - origin.x * origin.elevation) / (destination.elevation - origin.elevation);
        const y = ((z - origin.elevation) * (destination.y - origin.y) + destination.elevation * origin.y - origin.elevation * origin.y) / (destination.elevation - origin.elevation);
        const point = { x: x, y: y };
        return point;
    }

    //Loop through all the planes and check for both ceiling and floor collision on each tile
    for (let tile of canvas.tiles.placeables) {
        // Checkbox tile
        if (!tile.document.flags?.levels?.blockSightMovement) continue;
        const bottom = tile.document.elevation ?? -Infinity;
        if (bottom != -Infinity) {
            const zIntersectionPoint = getPointForPlane(bottom);
            if (((origin.elevation < bottom && bottom < destination.elevation) || (destination.elevation < bottom && bottom < origin.elevation)) && tile.mesh?.containsCanvasPoint({ x: zIntersectionPoint.x, y: zIntersectionPoint.y }, ALPHATTHRESHOLD)) {
                return true
            }
        }
    }

    return wrapped(...args);
}