export function registerWrappers(){

    const LevelsConfig = CONFIG.Levels

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "Tile.prototype.refresh",
        function tileWrapper(wrapped, ...args) {
            wrapped(...args);
            const visible = LevelsConfig.handlers.TileHandler.isTileVisible(this);
            this.visible = this.visible && visible;
        },
        "WRAPPER"
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CanvasVisibility.prototype.testVisibility",
        function visibilityWrapper(wrapped, ...args) {
            args[1].tollerance = 0;
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
}