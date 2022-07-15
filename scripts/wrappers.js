export function registerWrappers(){

    const LevelsConfig = CONFIG.Levels

    Hooks.on("tileRefresh", (tile) => {
        const visible = LevelsConfig.handlers.TileHandler.isTileVisible(tile);
        tile.visible = tile.visible && visible;
    })

    Hooks.on("drawingRefresh", (drawing) => {
        const visible = LevelsConfig.handlers.DrawingHandler.isDrawingVisible(drawing);
        drawing.visible = drawing.visible && visible;
    })

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CanvasVisibility.prototype.testVisibility",
        function visibilityWrapper(wrapped, ...args) {
            if(args[1]) args[1].tolerance = 0;
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
        function containsWrapper(wrapped, ...args) {
            const testTarget = LevelsConfig.visibilityTestObject;
            if(!(testTarget instanceof Token)) return wrapped(...args);
            return LevelsConfig.handlers.SightHandler.performLOSTest(this.config.source.object, testTarget);
        },
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