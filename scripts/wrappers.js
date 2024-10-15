export function registerWrappers() {
    const LevelsConfig = CONFIG.Levels;
    const computeUI = LevelsConfig.handlers.UIHandler.UIVisible;

    Hooks.on("refreshToken", (placeable, renderFlags) => {
        LevelsConfig.handlers.TokenHandler.refreshTooltip(placeable);
        CONFIG.Levels.FoWHandler.lazyCreateBubble(placeable);
        LevelsConfig.handlers.TokenHandler.setScale(placeable, renderFlags);
        computeUI(placeable);
    });

    Hooks.on("updateToken", (token, updates) => {
        if ("elevation" in updates && CONFIG.Levels.settings.get("tokenElevScale")) {
            LevelsConfig.handlers.RefreshHandler.refresh(canvas.tokens);
        }
    });

    Hooks.on("controlToken", (token, control) => {
        CONFIG.Levels.settings.get("tokenElevScale") && LevelsConfig.handlers.RefreshHandler.refresh(canvas.tokens);
    });

    Hooks.on("refreshWall", (placeable) => {
        computeUI(placeable);
    });

    Hooks.on("refreshAmbientLight", (placeable) => {
        computeUI(placeable);
    });

    Hooks.on("refreshAmbientSound", (placeable) => {
        computeUI(placeable);
    });

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Tile.objectClass.prototype.isVisible",
        function (wrapped, ...args) {
            const visible = LevelsConfig.handlers.TileHandler.isTileVisible(this);
            //const hasRestrictions = (this.document.restrictions.light || this.document.restrictions.weather) && !CONFIG.Levels.UI?.rangeEnabled;
            //if(hasRestrictions) return wrapped(...args);
            let result = wrapped(...args);
            if (CONFIG.Levels.currentToken || canvas.tokens.controlled.length) {
                if ((CONFIG.Levels.currentToken ?? canvas.tokens.controlled[0]).losHeight < this.document.elevation) {
                    if (!visible) {
                        result = result && visible;
                    }
                } else {
                    result = result && visible;
                }
            } else {
                result = result && visible;
            }
            const uiVisible = computeUI(this);
            return result && uiVisible;
        },
        "WRAPPER",
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Drawing.objectClass.prototype.isVisible",
        function (wrapped, ...args) {
            const result = wrapped(...args);
            const visible = LevelsConfig.handlers.DrawingHandler.isDrawingVisible(this);
            const uiVisible = computeUI(this);
            return result && visible && uiVisible;
        },
        "WRAPPER",
    );

    Hooks.on("activateTilesLayer ", () => {
        if (CONFIG.Levels.UI?.rangeEnabled) {
            ui.controls.control.foreground = true;
            canvas.tiles._activateSubLayer(true);
        }
    });

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "TokenLayer.prototype._getOccludableTokens",
        function (wrapped, ...args) {
            if (game.user.isGM) return wrapped(...args);
            const isLevels = canvas.scene?.flags?.levels?.sceneLevels?.length > 0;
            if (!isLevels) return wrapped(...args);
            return CONFIG.Levels.currentToken && !CONFIG.Levels.currentToken.destroyed ? [CONFIG.Levels.currentToken] : [];
        },
        "MIXED",
    );

    libWrapper.register(LevelsConfig.MODULE_ID, "DetectionMode.prototype._testRange", LevelsConfig.handlers.SightHandler._testRange, "OVERRIDE", { perf_mode: "FAST" });

    libWrapper.register(LevelsConfig.MODULE_ID, "ClockwiseSweepPolygon.prototype.contains", LevelsConfig.handlers.SightHandler.containsWrapper, "MIXED");

    libWrapper.register(LevelsConfig.MODULE_ID, "ClockwiseSweepPolygon.prototype._testCollision", LevelsConfig.handlers.SightHandler._testCollision, "MIXED");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.AmbientLight.objectClass.prototype._isLightSourceDisabled", LevelsConfig.handlers.LightHandler._isLightSourceDisabled, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Token.objectClass.prototype._isLightSource", LevelsConfig.handlers.LightHandler.isLightVisibleWrapper, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.AmbientSound.objectClass.prototype.isAudible", LevelsConfig.handlers.SoundHandler.isAudible, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Note.objectClass.prototype.isVisible", LevelsConfig.handlers.NoteHandler.isVisible, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Token.objectClass.prototype.isVisible", LevelsConfig.handlers.UIHandler.tokenUIWrapperIsVisible, "WRAPPER");
}

export function registerSetupWrappers() {
    const LevelsConfig = CONFIG.Levels;

    const visibilityTestObjectStack = [];
    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Canvas.groups.visibility.groupClass.prototype.testVisibility",
        function visibilityWrapper(wrapped, ...args) {
            const options = (args[1] ??= {});
            if (options.object instanceof Token) options.tolerance = 0;
            visibilityTestObjectStack.push(LevelsConfig.visibilityTestObject);
            LevelsConfig.visibilityTestObject = args[1].object;
            const res = wrapped(...args);
            LevelsConfig.visibilityTestObject = visibilityTestObjectStack.pop();
            return !!res;
        },
        "WRAPPER",
    );

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Canvas.groups.visibility.groupClass.prototype._createVisibilityTestConfig", LevelsConfig.handlers.SightHandler._createVisibilityTestConfig, "OVERRIDE", { perf_mode: "FAST" });
}