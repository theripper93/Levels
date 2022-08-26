export function registerWrappers(){

    const LevelsConfig = CONFIG.Levels
    const computeUI = LevelsConfig.handlers.UIHandler.UIVisible
    Hooks.on("refreshTile", (placeable) => {
        
        const visible = LevelsConfig.handlers.TileHandler.isTileVisible(placeable);
        placeable.visible = placeable.visible && visible;
        computeUI(placeable);
    })

    Hooks.on("refreshDrawing", (placeable) => {
        const visible = LevelsConfig.handlers.DrawingHandler.isDrawingVisible(placeable);
        placeable.visible = placeable.visible && visible;
        computeUI(placeable);
    })

    Hooks.on("refreshToken", (placeable) => {
        CONFIG.Levels.FoWHandler.lazyCreateBubble(placeable);
        LevelsConfig.handlers.TokenHandler.setScale(placeable);
        computeUI(placeable);
    })

    Hooks.on("updateToken", (token, updates) => {
        if("elevation" in updates && CONFIG.Levels.settings.get("tokenElevScale")){
            LevelsConfig.handlers.RefreshHandler.refresh(canvas.tokens)
        }
    })


    Hooks.on("controlToken", (token, control) => {
        CONFIG.Levels.settings.get("tokenElevScale") && LevelsConfig.handlers.RefreshHandler.refresh(canvas.tokens)
    })

    Hooks.on("refreshAmbientLight", (placeable) => {
        computeUI(placeable);
    })

    Hooks.on("refreshWall", (placeable) => {
        computeUI(placeable);
    })

    Hooks.on("refreshAmbientSound", (placeable) => {
        computeUI(placeable);
    })

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Wall.objectClass.prototype.identifyInteriorState", function disableInteriorState(wrapped,...args){
            this.roof = null;
            for (const tile of canvas.tiles.roofs) {
              if (tile.document.hidden) continue;
              if (Number.isFinite(tile.document?.flags?.levels?.rangeBottom)) continue;
              const [x1, y1, x2, y2] = this.document.c;
              const isInterior = tile.containsPixel(x1, y1) && tile.containsPixel(x2, y2);
              if (isInterior) {
                this.roof = tile;
                break;
              }
            }
        },
        "OVERRIDE",
        { perf_mode: "FAST" }
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Tile.objectClass.prototype.isRoof", function isRoof(wrapped, ...args){
            if(this.document.overhead && Number.isFinite(this.document.flags?.levels?.rangeBottom)) return true;
            else return wrapped(...args);
        },
        "MIXED"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CanvasVisibility.prototype.testVisibility",
        function visibilityWrapper(wrapped, ...args) {
            args[1] ??= {};
            args[1].tolerance = 0;
            LevelsConfig.visibilityTestObject = args[1].object;
            const res = wrapped(...args);
            LevelsConfig.visibilityTestObject = null;
            return res;
        },
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "ClockwiseSweepPolygon.prototype.contains",
        LevelsConfig.handlers.SightHandler.containsWrapper,
        "MIXED"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.AmbientLight.objectClass.prototype.emitsLight",
        LevelsConfig.handlers.LightHandler.isLightVisibleWrapper,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Token.objectClass.prototype.emitsLight",
        LevelsConfig.handlers.LightHandler.isLightVisibleWrapper,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.AmbientSound.objectClass.prototype.isAudible",
        LevelsConfig.handlers.SoundHandler.isAudible,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Note.objectClass.prototype.isVisible",
        LevelsConfig.handlers.NoteHandler.isVisible,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Token.objectClass.prototype._drawTooltip",
        LevelsConfig.handlers.TokenHandler._drawTooltip,
        "MIXED"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.MeasuredTemplate.objectClass.prototype.draw",
        LevelsConfig.handlers.TemplateHandler.drawTooltip,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.MeasuredTemplate.objectClass.prototype._refreshRulerText",
        LevelsConfig.handlers.TemplateHandler._refreshRulerText,
        "OVERRIDE"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.MeasuredTemplate.objectClass.prototype.isVisible",
        LevelsConfig.handlers.TemplateHandler.isVisible,
        "WRAPPER"
    );
}