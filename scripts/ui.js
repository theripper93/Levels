class LevelsUI extends FormApplication {
    constructor() {
        super();
        this.range = [];
        this.rangeEnabled = false;
        this.isEdit = false;
        this.definedLevels = [];
        this.roofEnabled = false;
        this.placeOverhead = false;
        this.stairEnabled = true;
        this.tokensOnly = false;
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: game.i18n.localize("levels.ui.title"),
            id: "levelsUI",
            template: `modules/levels/templates/layerTool.hbs`,
            resizable: true,
            dragDrop: [{ dragSelector: null, dropSelector: null }],
        };
    }

    get currentRange() {
        const bgElev = canvas.primary.background.elevation;
        if (!this.rangeEnabled) return { bottom: bgElev, top: bgElev };
        if (!this.range?.length) return { bottom: bgElev, top: bgElev };
        return {
            bottom: parseFloat(this.range[0]),
            top: parseFloat(this.range[1]),
        };
    }

    getRange() {
        return {
            bottom: parseFloat(this.range[0] ?? -Infinity),
            top: parseFloat(this.range[1] ?? Infinity),
        };
    }

    getData() {
        return {
            lightMasking: canvas.scene.getFlag(CONFIG.Levels.MODULE_ID, "lightMasking") ?? true,
            isTA: false,
        };
    }

    async activateListeners(html) {
        ui.controls.control.foreground = true;
        canvas.tiles._activateSubLayer(true);
        this.rangeEnabled = true;
        this.loadLevels();
        html.on("click", ".level-item", this._onChangeLevel.bind(this));
        html.on("click", ".level-item .fa-trash", this._onRemoveLevel.bind(this));
        html.on("click", "#levels-ui-controls .fa-trash", this._onClearLevels.bind(this));
        html.on("click", "#levels-ui-controls .fa-plus", this._onAddLevel.bind(this));
        html.on("click", "#levels-ui-controls .fa-edit", this._onToggleEdit.bind(this));
        html.on("click", "#levels-ui-controls .fa-map", this._onGetFromScene.bind(this));
        html.on("click", "#levels-ui-controls .fa-users", this._onShowPlayerList.bind(this));
        html.on("click", "#levels-ui-controls .fa-archway", () => {
            this.roofEnabled = !this.roofEnabled;
            this.setButtonStyles();
            this.computeLevelsVisibility();
        });
        html.on("click", "#levels-ui-controls .fa-tree", () => {
            this.placeOverhead = !this.placeOverhead;
            this.setButtonStyles();
        });
        html.on("click", "#levels-ui-controls .fa-sort-amount-up-alt", () => {
            this.stairEnabled = !this.stairEnabled;
            this.setButtonStyles();
        });
        html.on("click", "#levels-ui-controls .fa-circle-exclamation", async () => {
            await canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "lightMasking", false);
            this.render(true);
        });

        html.on("click", "#levels-ui-controls .fa-link", async () => {
            this.tokensOnly = !this.tokensOnly;
            this.setButtonStyles();
        });

        html.on("drop", (event) => {
            let data;
            try {
                data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
            } catch (err) {
                return false;
            }
            if (data.type === "Scene") this._onDropScene(data.uuid);
        });

        html.on("click", ".player-portrait", this._onControlToken.bind(this));
        html.on("change", ".level-inputs input", this.saveData.bind(this));
        //make list sortable
        html.find("#levels-list").sortable({
            axis: "y",
            handle: ".fa-arrows-alt",
            update: this.saveData.bind(this),
        });
        const index = this.definedLevels ? this.definedLevels.indexOf(this.definedLevels.find((l) => l[0] == this.range[0] && l[1] == this.range[1] && l[2] == this.range[2])) : undefined;
        if (index === undefined || index === -1) {
            html.find("#levels-list li:last-child").click();
        } else html.find("#levels-list li")[index].click();
        this.updatePlayerList();
        this.setButtonStyles();
    }

    setButtonStyles() {
        this.element.find(".fa-archway").toggleClass("active", this.roofEnabled);
        this.element.find(".fa-tree").toggleClass("active", this.placeOverhead);
        this.element.find(".fa-sort-amount-up-alt").toggleClass("active", this.stairEnabled);
        this.element.find(".fa-users").toggleClass("active", this.element.find(".players-on-level").hasClass("active"));
        this.element.find(".fa-link").toggleClass("active", this.tokenOnly);
    }

    _onAddLevel(event) {
        let $li = this.generateLi([0, 0, ""]);
        $("#levels-list").append($li);
    }
    //toggle readonly property of inputs and toggle visibility of trash icon
    _onToggleEdit(event) {
        this.isEdit = !this.isEdit;
        let $inputs = $(".level-inputs input");
        $inputs.prop("readonly", !$inputs.prop("readonly"));
        $(".level-item .fa-trash").toggleClass("hidden");
        $(".level-item .fa-arrows-alt").toggleClass("hidden");
        this.saveData();
    }

    activateForeground() {
        try {
            ui.controls.control.foreground = true;
            ui.controls.control.foreground = true;
            canvas.tiles._activateSubLayer(true);
            canvas.perception.update({ refreshLighting: true, refreshTiles: true }, true);
            const fgControl = document.querySelector(`[data-tool="foreground"]`);
            if (fgControl) fgControl.classList.add("active");
        } catch (e) {}
    }

    _onChangeLevel(event) {
        this.activateForeground();
        if (!$(event.target).hasClass("player-portrait")) canvas.tokens.releaseAll();
        let $target = $(event.currentTarget);
        let $parent = $target.parent();
        $parent.find(".fa-caret-right").removeClass("active");
        $parent.find("li").removeClass("active");
        $target.find(".fa-caret-right").addClass("active");
        $target.addClass("active");
        const top = $target.find(".level-top").val();
        const bottom = $target.find(".level-bottom").val();
        const name = $target.find(".level-name").val();
        this.definedLevels = canvas.scene.getFlag(CONFIG.Levels.MODULE_ID, "sceneLevels");
        this.range = this.definedLevels?.find((l) => l[0] == bottom && l[1] == top) ?? [parseFloat(bottom), parseFloat(top)];
        if ($(event.target).hasClass("player-portrait")) return;
        WallHeight.currentTokenElevation = parseFloat(bottom);
        this.computeLevelsVisibility(this.range);
        Hooks.callAll("levelsUiChangeLevel");
    }

    _onRemoveLevel(event) {
        Dialog.confirm({
            title: game.i18n.localize("levels.dialog.removeLevel.title"),
            content: game.i18n.localize("levels.dialog.removeLevel.content"),
            yes: () => {
                let $target = $(event.currentTarget);
                $target.remove();
                this.saveData();
            },
            no: () => {},
            defaultYes: false,
        });
    }

    _onGetFromScene(event) {
        Dialog.confirm({
            title: game.i18n.localize("levels.dialog.getFromScene.title"),
            content: game.i18n.localize("levels.dialog.getFromScene.content"),
            yes: (html) => {
                const maxRange = parseFloat(html.find("#maxelevationdifference").val());
                this.getFromScene(maxRange);
            },
            no: () => {},
            render: (html) => {
                const maxRange = `
        <hr>
        <div class="form-group" style="display: grid;grid-template-columns: 1fr 1fr;align-items: center;">
          <label>${game.i18n.localize("levels.ui.minElevDiff")}</label>
          <input type="text" id="maxelevationdifference" data-dtype="Number" value="9" placeholder="">
        </div>
        <br>
        `;
                $(html[0]).append(maxRange);
            },
            defaultYes: false,
        });
    }

    _onShowPlayerList(event) {
        this.element.find(".players-on-level").toggleClass("active");
        this.setButtonStyles();
    }

    _onControlToken(event) {
        canvas.tokens.releaseAll();
        const tokenId = event.currentTarget.dataset.tokenid;
        const token = canvas.tokens.get(tokenId);
        token.control();
    }

    async _onDropScene(uuid) {
        const scene = await fromUuid(uuid);
        if (!scene) return;
        const dialogResult = await Dialog.confirm({
            title: game.i18n.localize("levels.dialog.sceneDrop.title"),
            content: game.i18n.localize("levels.dialog.sceneDrop.content"),
        });
        if (!dialogResult) return;
        const collections = Object.keys(scene.collections);
        for (const collection of collections) {
            const documents = Array.from(scene[collection]);
            if (!documents.length) continue;
            await canvas.scene.createEmbeddedDocuments(documents[0].documentName, documents);
        }
        const sceneBg = scene.background.src;
        if (!sceneBg) return;
        const { sceneWidth, sceneHeight, sceneX, sceneY } = scene.dimensions;
        await canvas.scene.createEmbeddedDocuments("Tile", [
            {
                "texture.src": sceneBg,
                width: sceneWidth,
                height: sceneHeight,
                x: sceneX,
                y: sceneY,
            },
        ]);
    }

    saveData() {
        let data = [];
        $(this.element)
            .find("li")
            .each((index, element) => {
                let $element = $(element);
                let name = $element.find(".level-name").val();
                let top = $element.find(".level-top").val();
                let bottom = $element.find(".level-bottom").val();
                data.push([bottom, top, name]);
            });
        canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "sceneLevels", data).then(() => {
            const active = this.element.find(".level-item.active");
            const first = this.element.find(".level-item").first();
            if (active.length) active.click();
            else if (first.length) first.click();
        });
    }

    async loadLevels() {
        $("#levels-list").empty();
        let levelsFlag = canvas.scene.getFlag(CONFIG.Levels.MODULE_ID, "sceneLevels") || [];
        this.definedLevels = levelsFlag;
        this.range = this.range ?? this.definedLevels[levelsFlag.length - 1];
        if (levelsFlag) {
            for (let level of levelsFlag) {
                this.element.find("#levels-list").append(this.generateLi(level));
            }
        }
    }

    generateLi(data) {
        //data 0 - top 1- bottom 2- name
        let $li = $(`
	<li class="level-item" draggable>
    <i class="fas fa-arrows-alt"></i>
    <div class="players-on-level"></div>
    <i class="fas fa-caret-right"></i>
    <div class="level-inputs">
    <input type="text" class="level-name" value="${data[2] ?? ""}" placeholder="${game.i18n.localize("levels.widget.element")}">
    <i class="fas fa-caret-down"></i>
    <input type="number" class="level-bottom" value="${data[0]}" placeholder="0">
    <i class="fas fa-caret-up"></i>
    <input type="number" class="level-top" value="${data[1]}" placeholder="0">
    <i class="fas fa-trash"></i>
    </div>
	</li>
	`);
        $li.find("input").prop("readonly", !this.isEdit);
        $li.find(".fa-trash").toggleClass("hidden", this.isEdit);
        $li.find(".fa-arrows-alt").toggleClass("hidden", this.isEdit);
        return $li;
    }

    async _onClearLevels() {
        Dialog.confirm({
            title: game.i18n.localize("levels.dialog.levelsclear.title"),
            content: game.i18n.localize("levels.dialog.levelsclear.content"),
            yes: async () => {
                await canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "sceneLevels", []);
                this.loadLevels();
            },
            no: () => {},
            defaultYes: false,
        });
    }

    updatePlayerList() {
        const playerActors = Array.from(game.users).map((user) => user.character?.id);
        const players = canvas.tokens.placeables.filter((token) => playerActors.includes(token.actor?.id));
        $(this.element)
            .find("li")
            .each((index, element) => {
                let $element = $(element);
                const top = $element.find(".level-top").val();
                const bottom = $element.find(".level-bottom").val();
                const $playerList = $element.find(".players-on-level");
                $playerList.empty();
                players.forEach((player) => {
                    if (player.losHeight >= bottom && player.losHeight < top && player.id) {
                        const color = Array.from(game.users).find((user) => user.character?.id == player?.actor?.id)?.border;
                        $playerList.append(`<img class="player-portrait" data-tokenid="${player.id}" title="${player.actor?.name}" style="border-color: ${color}" src="${player.document.texture.src}">`);
                    }
                });
            });
        this.element.css("height", "auto");
    }

    close(force = false) {
        if (!force) this.saveData();
        this.rangeEnabled = false;
        if (!force) this.computeLevelsVisibility();
        CONFIG.Levels.handlers.RefreshHandler.restoreVisAll();
        CONFIG.Levels.handlers.RefreshHandler.refreshAll();
        WallHeight.schedulePerceptionUpdate();
        super.close();
    }

    async getFromScene(maxRange = 9) {
        let autoLevels = {};
        for (let wall of canvas.walls.placeables) {
            const { top, bottom } = WallHeight.getWallBounds(wall);
            let entityRange = [bottom, top];
            if (entityRange[0] != -Infinity && entityRange[1] != Infinity && (entityRange[0] || entityRange[0] == 0) && (entityRange[1] || entityRange[1] == 0)) {
                autoLevels[`${entityRange[0]}${entityRange[1]}`] = entityRange;
            }
        }

        for (let tile of canvas.tiles.placeables.filter((t) => t.document.overhead)) {
            let { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(tile);
            if ((rangeBottom || rangeBottom == 0) && (rangeTop || rangeTop == 0) && rangeTop != Infinity && rangeBottom != -Infinity) {
                autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
            }
        }

        for (let light of canvas.lighting.placeables) {
            let { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(light);
            if ((rangeBottom || rangeBottom == 0) && (rangeTop || rangeTop == 0) && rangeTop != Infinity && rangeBottom != -Infinity) {
                autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
            }
        }

        for (let drawing of canvas.drawings.placeables) {
            let { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(drawing);
            if ((rangeBottom || rangeBottom == 0) && (rangeTop || rangeTop == 0) && rangeTop != Infinity && rangeBottom != -Infinity) {
                autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
            }
        }
        let autoRange = Object.entries(autoLevels)
            .map((x) => x[1])
            .filter((x) => Math.abs(x[1] - x[0]) >= maxRange)
            .sort()
            .reverse();
        if (autoRange.length) {
            await canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "sceneLevels", autoRange);
            this.loadLevels();
        }
    }

    computeLevelsVisibility() {
        WallHeight.currentTokenElevation = parseFloat(this.range[0] ?? 0);
        CONFIG.Levels.handlers.RefreshHandler.refreshAll();
        WallHeight.schedulePerceptionUpdate();
    }

    computeRangeForDocument(document, range, isTile = false) {
        let { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(document);
        rangeBottom = rangeBottom ?? -Infinity;
        rangeTop = rangeTop ?? Infinity;
        range[0] = parseFloat(range[0]) ?? -Infinity;
        range[1] = parseFloat(range[1]) ?? Infinity;
        let entityRange = [rangeBottom, rangeTop];
        if (!isTile) {
            if ((entityRange[0] >= range[0] && entityRange[0] <= range[1]) || (entityRange[1] >= range[0] && entityRange[1] <= range[1])) {
                return true;
            } else {
                return false;
            }
        } else {
            if (entityRange[0] == range[1] + 1 && entityRange[1] == Infinity) {
                return true;
            } else {
                if (entityRange[0] >= range[0] && entityRange[1] <= range[1]) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    }

    getObjUpdateData(range) {
        return {
            flags: {
                [`${CONFIG.Levels.MODULE_ID}`]: {
                    rangeBottom: parseFloat(range[0]),
                    rangeTop: parseFloat(range[1]),
                },
            },
        };
    }

    async elevationDialog(tool) {
        let content = `
    <div class="form-group">
    <label for="elevation">${game.i18n.localize("levels.template.elevation.name")}</label>
    <div class="form-fields">
        <input type="number" name="templateElevation" data-dtype="Number" value="${canvas.tokens.controlled[0]?.document?.elevation ?? 0}" step="1">
    </div>
    </div>
    <p></p>
    <div class="form-group">
    <label for="special">${game.i18n.localize("levels.template.special.name")}</label>
    <div class="form-fields">
        <input type="number" name="special" data-dtype="Number" value="0" step="1">
    </div>
    </div>
    <p></p>
    `;
        let ignoreClose = false;
        let toolhtml = $("body").find(`li[data-tool="setTemplateElevation"]`);
        let dialog = new Dialog({
            title: game.i18n.localize("levels.dialog.elevation.title"),
            content: content,
            buttons: {
                confirm: {
                    label: game.i18n.localize("levels.yesnodialog.yes"),
                    callback: (html) => {
                        CONFIG.Levels.UI.nextTemplateHeight = html.find(`input[name="templateElevation"]`)[0].valueAsNumber;
                        CONFIG.Levels.UI.nextTemplateSpecial = html.find(`input[name="special"]`)[0].valueAsNumber;
                        CONFIG.Levels.UI.templateElevation = true;
                        ignoreClose = true;
                        tool.active = true;
                        if (toolhtml[0]) $("body").find(`li[data-tool="setTemplateElevation"]`).addClass("active");
                    },
                },
                close: {
                    label: game.i18n.localize("levels.yesnodialog.no"),
                    callback: () => {
                        CONFIG.Levels.UI.nextTemplateHeight = undefined;
                        CONFIG.Levels.UI.nextTemplateSpecial = undefined;
                        CONFIG.Levels.UI.templateElevation = false;
                        tool.active = false;
                        if (toolhtml[0]) $("body").find(`li[data-tool="setTemplateElevation"]`).removeClass("active");
                    },
                },
            },
            default: "confirm",
            close: () => {
                if (ignoreClose == true) {
                    ignoreClose = false;
                    return;
                }
                CONFIG.Levels.nextTemplateHeight = undefined;
                CONFIG.Levels.nextTemplateSpecial = undefined;
                CONFIG.Levels.templateElevation = false;
                tool.active = false;
                if (toolhtml[0]) $("body").find(`li[data-tool="setTemplateElevation"]`).removeClass("active");
            },
        });
        await dialog._render(true);
    }
}

$(document).on("click", `li[data-control="levels"]`, (e) => {
    CONFIG.Levels.UI.render(true);
});

Hooks.on("renderSceneControls", (controls, b, c) => {
    if (game.user.isGM) {
        $(".main-controls").append(`
    <li class="scene-control " data-control="levels" data-tooltip="${game.i18n.localize("levels.controls.main.name")}">
    <i class="fas fa-layer-group"></i>
    </li>
    `);
    }
});

Hooks.on("ready", () => {
    if (game.user.isGM) {
        Hooks.on("activateTilesLayer", () => {
            if (CONFIG.Levels.UI.rangeEnabled) {
                Hooks.once("renderSceneControls", () => {
                    CONFIG.Levels.UI.activateForeground();
                });
            }
        });

        Hooks.on("canvasInit", () => {
            CONFIG.Levels.UI.close(true);
        });

        Hooks.on("updateToken", (token, updates) => {
            if ("elevation" in updates) CONFIG.Levels.UI.updatePlayerList();
        });

        Hooks.on("createToken", (token, updates) => {
            CONFIG.Levels.UI.updatePlayerList();
        });

        Hooks.on("deleteToken", (token, updates) => {
            CONFIG.Levels.UI.updatePlayerList();
        });

        Hooks.on("controlToken", (token, controlled) => {
            if (CONFIG.Levels.UI.rangeEnabled && !canvas.tokens.controlled.length) {
                CONFIG.Levels.UI.computeLevelsVisibility();
            } else if (CONFIG.Levels.UI.rangeEnabled) {
                CONFIG.Levels.handlers.RefreshHandler.refresh(canvas.tokens);
            }
        });

        Hooks.on("renderLevelsUI", (app, html) => {
            if (!app.positionSet) {
                console.log(window.innerWidth - $("#sidebar").width() - $("#levelsUI").width());
                app.setPosition({
                    top: 2,
                    left: window.innerWidth - $("#sidebar").width() - $("#levelsUI").width() - 10,
                    width: $("#levelsUI").width(),
                    height: Math.max(150, $("#levelsUI").height()) + 10,
                });
                app.positionSet = true;
            }
        });

        Hooks.on("preCreateTile", (tile, updates) => {
            if (CONFIG.Levels.UI.tokensOnly) return;
            if (CONFIG.Levels.UI.rangeEnabled == true) {
                tile.updateSource({
                    overhead: true,
                });
                if (!game.Levels3DPreview?._active) {
                    tile.updateSource({
                        flags: {
                            betterroofs: {
                                brMode: CONFIG.Levels.UI.roofEnabled,
                            },
                            [`${CONFIG.Levels.MODULE_ID}`]: {
                                rangeBottom: CONFIG.Levels.UI.roofEnabled ? parseFloat(CONFIG.Levels.UI.range[1]) : parseFloat(CONFIG.Levels.UI.range[0]),
                                rangeTop: CONFIG.Levels.UI.roofEnabled ? Infinity : parseFloat(CONFIG.Levels.UI.range[1]),
                                allWallBlockSight: CONFIG.Levels.UI.roofEnabled,
                            },
                        },
                        roof: CONFIG.Levels.UI.roofEnabled,
                    });
                } else {
                    tile.updateSource({
                        flags: {
                            [`${CONFIG.Levels.MODULE_ID}`]: {
                                rangeTop: CONFIG.Levels.UI.roofEnabled ? Infinity : CONFIG.Levels.UI.range[1],
                            },
                        },
                    });
                }
                if (CONFIG.Levels.UI.placeOverhead) {
                    tile.updateSource({
                        roof: false,
                        flags: {
                            [`${CONFIG.Levels.MODULE_ID}`]: {
                                showIfAbove: true,
                                noCollision: true,
                                showAboveRange: parseFloat(CONFIG.Levels.UI.range[1]) - parseFloat(CONFIG.Levels.UI.range[0]),
                                rangeBottom: parseFloat(CONFIG.Levels.UI.range[1]),
                                rangeTop: parseFloat(CONFIG.Levels.UI.range[1]),
                            },
                        },
                    });
                }
            }
        });

        Hooks.on("preCreateAmbientLight", (light, updates) => {
            if (CONFIG.Levels.UI.tokensOnly) return;
            if (CONFIG.Levels.UI.rangeEnabled == true && !game.Levels3DPreview?._active) {
                light.updateSource(CONFIG.Levels.UI.getObjUpdateData(CONFIG.Levels.UI.range));
            }
        });

        Hooks.on("preCreateAmbientSound", (sound, updates) => {
            if (CONFIG.Levels.UI.tokensOnly) return;

            if (CONFIG.Levels.UI.rangeEnabled == true) {
                sound.updateSource(CONFIG.Levels.UI.getObjUpdateData(CONFIG.Levels.UI.range));
            }
        });

        Hooks.on("preCreateNote", (note, updates) => {
            if (CONFIG.Levels.UI.tokensOnly) return;
            if (CONFIG.Levels.UI.rangeEnabled == true) {
                note.updateSource(CONFIG.Levels.UI.getObjUpdateData(CONFIG.Levels.UI.range));
            }
        });

        Hooks.on("preCreateDrawing", (drawing, updates) => {
            if (CONFIG.Levels.UI.tokensOnly) return;
            let sortedLevels = [...CONFIG.Levels.UI.definedLevels].sort((a, b) => {
                return parseFloat(b[0]) - parseFloat(a[0]);
            });
            let aboverange = sortedLevels.find((l) => CONFIG.Levels.UI.range[0] === l[0] && CONFIG.Levels.UI.range[1] === l[1]);
            aboverange = sortedLevels.indexOf(aboverange) === 0 ? undefined : sortedLevels[sortedLevels.indexOf(aboverange) - 1];

            if (aboverange) {
                let newTop = aboverange[1];
                let newBot = aboverange[0];
                if (CONFIG.Levels.UI.rangeEnabled == true) {
                    drawing.updateSource({
                        hidden: CONFIG.Levels.UI.stairEnabled,
                        text: CONFIG.Levels.UI.stairEnabled ? `Levels Stair ${CONFIG.Levels.UI.range[0]}-${newBot}` : "",
                        flags: {
                            levels: {
                                drawingMode: CONFIG.Levels.UI.stairEnabled ? 2 : 0,
                                rangeBottom: parseFloat(CONFIG.Levels.UI.range[0]),
                                rangeTop: newBot - 1,
                            },
                        },
                    });
                }
            } else {
                if (CONFIG.Levels.UI.rangeEnabled == true) {
                    drawing.updateSource({
                        hidden: CONFIG.Levels.UI.stairEnabled,
                        text: CONFIG.Levels.UI.stairEnabled ? `Levels Stair ${CONFIG.Levels.UI.range[0]}-${parseFloat(CONFIG.Levels.UI.range[1]) + 1}` : "",
                        flags: {
                            levels: {
                                drawingMode: CONFIG.Levels.UI.stairEnabled ? 2 : 0,
                                rangeBottom: parseFloat(CONFIG.Levels.UI.range[0]),
                                rangeTop: parseFloat(CONFIG.Levels.UI.range[1]),
                            },
                        },
                    });
                }
            }
        });

        Hooks.on("preCreateWall", (wall, updates) => {
            if (CONFIG.Levels.UI.tokensOnly) return;

            if (CONFIG.Levels.UI.rangeEnabled == true) {
                wall.updateSource({
                    flags: {
                        "wall-height": {
                            bottom: parseFloat(CONFIG.Levels.UI.range[0]),
                            top: parseFloat(CONFIG.Levels.UI.range[1]),
                        },
                    },
                });
            }
        });

        Hooks.on("preCreateToken", (token, updates) => {
            if (CONFIG.Levels.UI.rangeEnabled == true) {
                if (updates) updates.elevation = parseFloat(CONFIG.Levels.UI.range[0]);
                token.updateSource({
                    elevation: updates?.elevation ?? parseFloat(CONFIG.Levels.UI.range[0]),
                });
            }
        });
    }
});

Hooks.on("getSceneControlButtons", (controls, b, c) => {
    let templateTool = {
        name: "setTemplateElevation",
        title: game.i18n.localize("levels.controls.setTemplateElevation.name"),
        icon: "fas fa-sort",
        toggle: true,
        active: CONFIG.Levels?.UI.templateElevation || false,
        onClick: (toggle) => {
            CONFIG.Levels.UI.templateElevation = toggle;
            if (toggle) CONFIG.Levels.UI.elevationDialog(templateTool);
            else CONFIG.Levels.UI.nextTemplateHeight = undefined;
        },
    };
    CONFIG.Levels.UI._levelsTemplateTool = templateTool;
    controls.find((c) => c.name == "token").tools.push(templateTool);
});

Hooks.once("canvasReady", () => {
    console.log(`%cLEVELS\n%cWelcome to the 3rd Dimension`, "font-weight: bold;text-shadow: 10px 10px 0px rgba(0,0,0,0.8), 20px 20px 0px rgba(0,0,0,0.6), 30px 30px 0px rgba(0,0,0,0.4);font-size:100px;background: #444; color: #d43f3f; padding: 2px 28px 0 2px; display: inline-block;", "font-weight: bold;text-shadow: 2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6), 6px 6px 0px rgba(0,0,0,0.4);font-size:20px;background: #444; color: #d43f3f; padding: 10px 27px; display: inline-block; margin-left: -30px");
});
