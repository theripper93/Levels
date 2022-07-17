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
        "AmbientLight.prototype.emitsLight",
        LevelsConfig.handlers.LightHandler.isLightVisibleWrapper,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "AmbientSound.prototype.isAudible",
        LevelsConfig.handlers.SoundHandler.isAudible,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "Note.prototype.isVisible",
        LevelsConfig.handlers.NoteHandler.isVisible,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "Token.prototype._drawTooltip",
        LevelsConfig.handlers.TokenHandler._drawTooltip,
        "MIXED"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "MeasuredTemplate.prototype.draw",
        LevelsConfig.handlers.TemplateHandler.drawTooltip,
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "MeasuredTemplate.prototype._refreshRulerText",
        LevelsConfig.handlers.TemplateHandler._refreshRulerText,
        "OVERRIDE"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "MeasuredTemplate.prototype.isVisible",
        LevelsConfig.handlers.TemplateHandler.isVisible,
        "WRAPPER"
    );
}