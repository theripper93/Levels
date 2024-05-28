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

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.AmbientLight.objectClass.prototype.isVisible", LevelsConfig.handlers.UIHandler.isVisibleWrapper, "WRAPPER");

    Hooks.on("refreshWall", (placeable) => {
        computeUI(placeable);
    })

    Hooks.on("refreshAmbientLight", (placeable) => {
        computeUI(placeable);
    })

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Tile.objectClass.prototype.isVisible", function (wrapped, ...args) {
        const visible = LevelsConfig.handlers.TileHandler.isTileVisible(this);
        let result = wrapped(...args);
        if (CONFIG.Levels.currentToken || canvas.tokens.controlled.length) {
            if ((CONFIG.Levels.currentToken ?? canvas.tokens.controlled[0]).losHeight < this.document.elevation) {
                if (!visible) {
                    if (this.mesh) {
                        /*this.mesh.occluded = true;
                        this.mesh.shader.enabled = false;
                        this.mesh.alpha = 0;*/
                    }
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
    }, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Drawing.objectClass.prototype.isVisible", function (wrapped, ...args){
        const result = wrapped(...args);
        const visible = LevelsConfig.handlers.DrawingHandler.isDrawingVisible(this);
        const uiVisible = computeUI(this);
        return result && visible && uiVisible;
    }, "WRAPPER");



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
            else {
                return CONFIG.Levels.currentToken ? [CONFIG.Levels.currentToken] : wrapped(...args);
            }
        },
        "MIXED",
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Tile.objectClass.prototype.isRoof",
        function isRoof(wrapped, ...args) {
            if (this.document.flags?.levels?.noCollision || this.document.flags["tile-scroll"]?.enableRotate || this.document.flags["tile-scroll"]?.enableScroll) return wrapped(...args);
            return wrapped(...args) || (this.document.overhead && Number.isFinite(this.document.elevation));
        },
        "WRAPPER",
        { perf_mode: "FAST" },
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CONFIG.Wall.objectClass.prototype.identifyInteriorState",
        function disableInteriorState(wrapped, ...args) {
            this.roof = null;
            for (const tile of canvas.tiles.roofs) {
                const allWallBlockSight = tile.document?.flags?.levels?.allWallBlockSight ?? true;
                if (tile.document.hidden || !allWallBlockSight) continue;
                const isBottomFinite = Number.isFinite(tile.document.elevation);
                if (isBottomFinite && Number.isFinite(tile.document?.flags?.levels?.rangeTop)) continue;
                if (isBottomFinite) {
                    const bottom = tile.document.elevation;
                    const wallBottom = this.document.flags["wall-height"]?.bottom ?? -Infinity;
                    if (wallBottom >= bottom) continue;
                }
                const [x1, y1, x2, y2] = this.document.c;
                const isInterior = tile.mesh?.containsCanvasPoint({ x: x1, y: y1 }) && tile.mesh?.containsCanvasPoint({ x: x2, y: y2 });
                if (isInterior) {
                    this.roof = tile;
                    break;
                }
            }
        },
        "OVERRIDE",
        { perf_mode: "FAST" },
    );

    /*libWrapper.register(
        LevelsConfig.MODULE_ID,
        "TilesLayer.prototype.displayRoofs", function displayRoofs(wrapped, ...args){
            const res = wrapped(...args);
            return res || (CONFIG.Levels.UI?.rangeEnabled && !canvas.tokens.controlled.length);
        },
        "WRAPPER"
    );*/

    const visibilityTestObjectStack = [];
    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "CanvasVisibility.prototype.testVisibility",
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

    function elevatePoints(config, visionSource) {
        const object = config.object;
        const unitsToPixel = canvas.dimensions.size / canvas.dimensions.distance;
        if (object instanceof Token) {
            if (config.tests._levels !== object) {
                config.tests.length = 0;
                for (const p of LevelsConfig.handlers.SightHandler.getTestPoints(object)) {
                    config.tests.push({ point: { x: p.x, y: p.y, z: p.z * unitsToPixel }, los: new Map() });
                }
                config.tests._levels = object;
            }
        } else {
            let z;
            if (object instanceof PlaceableObject) {
                z = object.document.elevation;
            } else if (object instanceof DoorControl) {
                z = visionSource?.elevation;
            }
            z ??= canvas.primary.background.elevation;
            z *= unitsToPixel;
            for (const test of config.tests) {
                test.point.z = z;
            }
        }
        return config;
    }

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "DetectionMode.prototype.testVisibility",
        function (wrapped, visionSource, mode, config) {
            return wrapped(visionSource, mode, elevatePoints(config, visionSource));
        },
        "WRAPPER",
        { perf_mode: "FAST" },
    );

    libWrapper.register(
        LevelsConfig.MODULE_ID,
        "foundry.canvas.sources.PointLightSource.prototype.testVisibility",
        function (wrapped, config) {
            return wrapped(elevatePoints(config, CONFIG.Levels.currentToken?.vision));
        },
        "WRAPPER",
        { perf_mode: "FAST" },
    );

    libWrapper.register(LevelsConfig.MODULE_ID, "CanvasVisibility.prototype._createVisibilityTestConfig", LevelsConfig.handlers.SightHandler._createVisibilityTestConfig, "OVERRIDE", { perf_mode: "FAST" });

    libWrapper.register(LevelsConfig.MODULE_ID, "DetectionMode.prototype._testRange", LevelsConfig.handlers.SightHandler._testRange, "OVERRIDE", { perf_mode: "FAST" });

    libWrapper.register(LevelsConfig.MODULE_ID, "ClockwiseSweepPolygon.prototype.contains", LevelsConfig.handlers.SightHandler.containsWrapper, "MIXED");

    libWrapper.register(LevelsConfig.MODULE_ID, "ClockwiseSweepPolygon.prototype._testCollision", LevelsConfig.handlers.SightHandler._testCollision, "MIXED");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.AmbientLight.objectClass.prototype.emitsLight", LevelsConfig.handlers.LightHandler.isLightVisibleWrapper, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Token.objectClass.prototype.emitsLight", LevelsConfig.handlers.LightHandler.isLightVisibleWrapper, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.AmbientSound.objectClass.prototype.isAudible", LevelsConfig.handlers.SoundHandler.isAudible, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Note.objectClass.prototype.isVisible", LevelsConfig.handlers.NoteHandler.isVisible, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.MeasuredTemplate.objectClass.prototype.draw", LevelsConfig.handlers.TemplateHandler.drawTooltip, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.MeasuredTemplate.objectClass.prototype._refreshRulerText", LevelsConfig.handlers.TemplateHandler._refreshRulerText, "OVERRIDE");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.MeasuredTemplate.objectClass.prototype.isVisible", LevelsConfig.handlers.TemplateHandler.isVisible, "WRAPPER");

    libWrapper.register(LevelsConfig.MODULE_ID, "CanvasOcclusionMask.prototype._identifyOccludedTiles", LevelsConfig.handlers.TileHandler._identifyOccludedTiles, "OVERRIDE");

    libWrapper.register(LevelsConfig.MODULE_ID, "CONFIG.Token.objectClass.prototype.isVisible", LevelsConfig.handlers.UIHandler.tokenUIWrapperIsVisible, "WRAPPER");
}
