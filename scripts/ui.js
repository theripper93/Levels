let _levelsTemplateTool;

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

  getData() {
    return {};
  }

  async activateListeners(html) {
    this.rangeEnabled = true;
    ui.controls.controls.find((c) => c.name == "tiles").layer = "foreground";
    this.loadLevels();
    html.on("click", ".level-item", this._onChangeLevel.bind(this));
    html.on("click", ".level-item .fa-trash", this._onRemoveLevel.bind(this));
    html.on(
      "click",
      "#levels-ui-controls .fa-trash",
      this._onClearLevels.bind(this)
    );
    html.on(
      "click",
      "#levels-ui-controls .fa-plus",
      this._onAddLevel.bind(this)
    );
    html.on(
      "click",
      "#levels-ui-controls .fa-edit",
      this._onToggleEdit.bind(this)
    );
    html.on(
      "click",
      "#levels-ui-controls .fa-map",
      this._onGetFromScene.bind(this)
    );
    html.on(
      "click",
      "#levels-ui-controls .fa-users",
      this._onShowPlayerList.bind(this)
    );
    html.on("click", ".player-portrait", this._onControlToken.bind(this));
    html.on("change", ".level-inputs input", this.saveData.bind(this));
    //make list sortable
    html.find("#levels-list").sortable({
      axis: "y",
      handle: ".fa-arrows-alt",
      update: this.saveData.bind(this),
    });
    const index = this.definedLevels
      ? this.definedLevels.indexOf(
          this.definedLevels.find(
            (l) =>
              l[0] == this.range[0] &&
              l[1] == this.range[1] &&
              l[2] == this.range[2]
          )
        )
      : undefined;
    if (index === undefined || index === -1) {
      html.find("#levels-list li:last-child").click();
    } else html.find("#levels-list li")[index].click();
    this.updatePlayerList();
    if(canvas.background._active) canvas.foreground.activate()
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
  }

  _onChangeLevel(event) {
    if(!$(event.target).hasClass("player-portrait")) canvas.tokens.releaseAll();
    let $target = $(event.currentTarget);
    let $parent = $target.parent();
    $parent.find(".fa-caret-right").removeClass("active");
    $parent.find("li").removeClass("active");
    $target.find(".fa-caret-right").addClass("active");
    $target.addClass("active");
    const top = $target.find(".level-top").val();
    const bottom = $target.find(".level-bottom").val();
    const name = $target.find(".level-name").val();
    this.definedLevels = canvas.scene.getFlag(_levelsModuleName, "sceneLevels");
    this.range = this.definedLevels.find(
      (l) => l[0] == bottom && l[1] == top && l[2] == name
    );
    if($(event.target).hasClass("player-portrait")) return
    game.currentTokenElevation = parseFloat(bottom)
    this.computeLevelsVisibility(this.range);
    setTimeout(() => {
      canvas.tokens.placeables.forEach((t) => {t.refresh()})
    }, 100)
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
      yes: async () => {
        this.getFromScene();
      },
      no: () => {},
      defaultYes: false,
    });
  }

  _onShowPlayerList(event) {
    this.element.find(".players-on-level").toggleClass("active");
  }

  _onControlToken(event) {
    canvas.tokens.releaseAll()
    const tokenId = event.currentTarget.dataset.tokenid;
    const token = canvas.tokens.get(tokenId);
    token.control();
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
    canvas.scene.setFlag(_levelsModuleName, "sceneLevels", data);
  }

  async loadLevels() {
    $("#levels-list").empty();
    let levelsFlag =
      canvas.scene.getFlag(_levelsModuleName, "sceneLevels") || [];
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
    <input type="text" class="level-name" value="${
      data[2] ?? ""
    }" placeholder="${game.i18n.localize("levels.widget.element")}">
    <i class="fas fa-caret-down"></i>
    <input type="number" class="level-bottom" value="${data[0]}" placeholder="0">
    <i class="fas fa-caret-up"></i>
    <input type="number" class="level-top" value="${
      data[1]
    }" placeholder="0">
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
        await canvas.scene.setFlag(_levelsModuleName, "sceneLevels", []);
        this.loadLevels();
      },
      no: () => {},
      defaultYes: false,
    });
  }

  updatePlayerList(){
    const playerActors = Array.from(game.users).map( user => user.character?.id)
    const players = canvas.tokens.placeables.filter( token => playerActors.includes(token.actor?.id))
    $(this.element)
    .find("li")
    .each((index, element) => {
      let $element = $(element);
      const top = $element.find(".level-top").val();
      const bottom = $element.find(".level-bottom").val();
      const $playerList = $element.find(".players-on-level");
      $playerList.empty();
      players.forEach(player => {
        if(player.data.elevation >= bottom && player.data.elevation <= top && player.id){
          const color = Array.from(game.users).find( user => user.character?.id == player?.actor?.id)?.border
          $playerList.append(`<img class="player-portrait" data-tokenid="${player.id}" title="${player.actor?.name}" style="border-color: ${color}" src="${player.data.img}">`);
        }
      })
    });
    this.element.css("height", "auto");
  }

  close(force=false) {
    if(!force) this.saveData();
    this.clearVisibility();
    this.rangeEnabled = false;
    ui.controls.controls.find((c) => c.name == "tiles").layer = "background";
    super.close();
  }

  async getFromScene() {
    let autoLevels = {};
    for (let wall of canvas.walls.placeables) {
      let entityRange = [
        wall.data.flags.wallHeight?.wallHeightBottom,
        wall.data.flags.wallHeight?.wallHeightTop,
      ];
      if (
        entityRange[0] != -Infinity &&
        entityRange[1] != Infinity &&
        (entityRange[0] || entityRange[0] == 0) &&
        (entityRange[1] || entityRange[1] == 0)
      ) {
        autoLevels[`${entityRange[0]}${entityRange[1]}`] = entityRange;
      }
    }

    for (let tile of canvas.foreground.placeables) {
      let { rangeBottom, rangeTop } = _levels.getFlagsForObject(tile);
      if (
        (rangeBottom || rangeBottom == 0) &&
        (rangeTop || rangeTop == 0) &&
        rangeTop != Infinity &&
        rangeBottom != -Infinity
      ) {
        autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
      }
    }

    for (let light of canvas.lighting.placeables) {
      let { rangeBottom, rangeTop } = _levels.getFlagsForObject(light);
      if (
        (rangeBottom || rangeBottom == 0) &&
        (rangeTop || rangeTop == 0) &&
        rangeTop != Infinity &&
        rangeBottom != -Infinity
      ) {
        autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
      }
    }

    for (let drawing of canvas.drawings.placeables) {
      let { rangeBottom, rangeTop } = _levels.getFlagsForObject(drawing);
      if (
        (rangeBottom || rangeBottom == 0) &&
        (rangeTop || rangeTop == 0) &&
        rangeTop != Infinity &&
        rangeBottom != -Infinity
      ) {
        autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
      }
    }
    let autoRange = Object.entries(autoLevels)
      .map((x) => x[1])
      .sort()
      .reverse();
    if (autoRange.length) {
      await canvas.scene.setFlag(_levelsModuleName, "sceneLevels", autoRange);
      this.loadLevels();
    }
  }

  computeLevelsVisibility(range) {
    _levels.floorContainer.removeChildren();
    _levels.floorContainer.spriteIndex = {};
    if(!range) range = this.range
    if (!range) return;
    range[0] = parseFloat(range[0]);
    range[1] = parseFloat(range[1]);
    for (let wall of canvas.walls.placeables) {
      let entityRange = [
        wall.data.flags.wallHeight?.wallHeightBottom,
        wall.data.flags.wallHeight?.wallHeightTop,
      ];
      if(entityRange[0] === entityRange[1] && (entityRange[0] === null || entityRange[0] === undefined)){
        wall.visible = true
        continue
      }
      if (entityRange[0] >= range[0] && entityRange[1] <= range[1]) {
        wall.visible = true;
      } else {
        wall.visible = false;
      }
      /*if (wall.data.door) {
        let door = canvas.controls.doors.children.find(
          (c) => c.wall.id == wall.id
        );
        if (door) door.visible = wall.visible;
      }*/
    }

    for (let tile of canvas.foreground.placeables) {
      tile.visible = this.computeRangeForDocument(
        tile,
        range,
        this.roofEnabled
      );
      if(tile.visible) tile.tile.alpha = 1
      if(tile.visible && tile.tileSortHidden || !canvas.foreground._active){
        tile.visible = false;
      }
      let { rangeBottom, rangeTop, isLevel } = _levels.getFlagsForObject(tile);
      let tileIndex = { tile: tile, range: [rangeBottom, rangeTop] };
      if (tileIndex.range[0] <= range[0] || tile.visible || (this.roofEnabled && tileIndex.range[0] == range[1]+1)) {
        _levels.mirrorTileInBackground(tileIndex);
      } else {
        _levels.removeTempTile(tileIndex);
      }
      //tile.levelsUIHideen = !tile.visible;
    }

    for (let light of canvas.lighting.placeables) {
      light.visible = this.computeRangeForDocument(light, range);
      light.source.skipRender = !light.visible;
    }
    canvas.perception.schedule({ lighting: { initialize: true, refresh: true } });

    for (let note of canvas.notes.placeables) {
      note.visible = this.computeRangeForDocument(note, range);
    }

    for (let sound of canvas.sounds.placeables) {
      sound.visible = this.computeRangeForDocument(sound, range);
    }

    for (let drawing of canvas.drawings.placeables) {
      drawing.visible = this.computeRangeForDocument(drawing, range);
    }
    for (let token of canvas.tokens.placeables) {
      token.levelsVisible =
        token.data.elevation <= range[1] && token.data.elevation >= range[0];
      token.visible = token.levelsVisible;
      if(token.visible) _levels.getTokenIconSpriteOverhead(token)
      else _levels.removeTempTokenOverhead(token)
    }
  }

  computeRangeForDocument(document, range, isTile = false) {
    let { rangeBottom, rangeTop } = _levels.getFlagsForObject(document);
    rangeBottom = rangeBottom ?? -Infinity;
    rangeTop = rangeTop ?? Infinity;
    range[0] = parseFloat(range[0]) ?? -Infinity;
    range[1] = parseFloat(range[1]) ?? Infinity;
    let entityRange = [rangeBottom, rangeTop];
    if (!isTile) {
      if (
        (entityRange[0] >= range[0] && entityRange[0] <= range[1]) ||
        (entityRange[1] >= range[0] && entityRange[1] <= range[1])
      ) {
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

  clearVisibility() {
    for (let wall of canvas.walls.placeables) {
      wall.visible = true;
      wall.refresh();
    }

    for (let tile of canvas.foreground.placeables) {
      tile.visible = true;
      tile.levelsUIHideen = false;
      if(!canvas.tokens._active)tile.refresh();
    }
    canvas.foreground.refresh()

    for (let light of canvas.lighting.placeables) {
      light.visible = true;
      light.source.skipRender = false;
      light.refresh();
    }

    for (let drawing of canvas.drawings.placeables) {
      drawing.visible = true;
      drawing.refresh();
    }

    for (let sound of canvas.sounds.placeables) {
      sound.visible = true;
      sound.refresh();
    }

    for (let note of canvas.notes.placeables) {
      note.visible = true;
      note.refresh();
    }

    _levels.floorContainer.removeChildren();
    _levels.floorContainer.spriteIndex = {};
    canvas.perception.schedule({ lighting: { initialize: true, refresh: true } });
  }

  getObjUpdateData(range) {
    return {
      flags: {
        [`${_levelsModuleName}`]: { rangeBottom: range[0], rangeTop: range[1] },
      },
    };
  }
}

Hooks.on("getSceneControlButtons", (controls, b, c) => {
  if (game.user.isGM) {
    if (_levels?.UI?.rangeEnabled) {
      controls.find((c) => c.name == "tiles").layer = "foreground";
      controls
        .find((c) => c.name == "tiles")
        .tools.push(
          {
            name: "placeRoof",
            title: game.i18n.localize("levels.controls.levelsroof.name"),
            icon: "fas fa-archway",
            toggle: true,
            active: _levels?.UI?.roofEnabled || false,
            onClick: (toggle) => {
              _levels.UI.roofEnabled = toggle;
              _levels.UI.computeLevelsVisibility();
            },
          },
          {
            name: "placeOverhead",
            title: game.i18n.localize("levels.controls.placeOverhead.name"),
            icon: "fas fa-tree",
            toggle: true,
            active: _levels?.UI?.placeOverhead || false,
            onClick: (toggle) => {
              _levels.UI.placeOverhead = toggle;
            },
          }
        );

      controls
        .find((c) => c.name == "drawings")
        .tools.push({
          name: "placeStair",
          title: game.i18n.localize("levels.controls.levelshole.name"),
          icon: "fab fa-firstdraft",
          toggle: true,
          active: _levels?.UI?.stairEnabled || false,
          onClick: (toggle) => {
            _levels.UI.stairEnabled = toggle;
          },
        });
    }

    let levelsTools = [
      {
        name: "enablerange",
        title: game.i18n.localize("levels.controls.levelsview.name"),
        icon: "fas fa-layer-group",
        button: true,
        onClick: () => {
          if (_levels.UI.rendered) {
            _levels.UI.close();
          } else {
            _levels.UI.render(true);
          }
        },
      },
      {
        name: "placeRoof",
        title: game.i18n.localize("levels.controls.levelsroof.name"),
        icon: "fas fa-archway",
        toggle: true,
        active: _levels?.UI?.roofEnabled || false,
        onClick: (toggle) => {
          _levels.UI.roofEnabled = toggle;
        },
      },
      {
        name: "placeOverhead",
        title: game.i18n.localize("levels.controls.placeOverhead.name"),
        icon: "fas fa-tree",
        toggle: true,
        active: _levels?.UI?.placeOverhead || false,
        onClick: (toggle) => {
          _levels.UI.placeOverhead = toggle;
          _levels.UI.computeLevelsVisibility(_levels.UI.range)
        },
      },
      {
        name: "placeStair",
        title: game.i18n.localize("levels.controls.levelshole.name"),
        icon: "fab fa-firstdraft",
        toggle: true,
        active: _levels?.UI?.stairEnabled || false,
        onClick: (toggle) => {
          _levels.UI.stairEnabled = toggle;
        },
      },
      {
        name: "clear",
        title: game.i18n.localize("levels.controls.levelsclear.name"),
        icon: "fas fa-trash",
        button: true,
        onClick: () => {
          _levels.UI.clearLevels();
        },
      },
    ];
    let levelsLayerTool = {
      name: "levels",
      layer: "levelsLayer",
      title: game.i18n.localize("levels.controls.main.name"),
      icon: "fas fa-layer-group",
      tools: levelsTools,
    };
    controls.push(levelsLayerTool);

    $("body")
      .on("mousedown", `li[data-control="levels"]`, (event) => {
        if (event.which == 3) {
          if (_levels.UI.rendered) {
            _levels.UI.close();
          } else {
            _levels.UI.render(true);
          }
        }
      });
  }
});

Hooks.on("ready", () => {
  if (game.user.isGM) {

    Hooks.on("canvasInit", () => {
      _levels.UI.close(true);
    })

    Hooks.on("updateToken", (token,updates)=>{
      if("elevation" in updates)_levels.UI.updatePlayerList();
    })

    Hooks.on("createToken", (token,updates)=>{
      _levels.UI.updatePlayerList();
    })

    Hooks.on("deleteToken", (token,updates)=>{
      _levels.UI.updatePlayerList();
    })

    Hooks.on("renderLevelsUI", (app, html) => {

      if(!app.positionSet){
        $("#levelsUI").css({
          top:"2px",
          left: "unset",
          right:"310px",
        })
        const pos = $("#levelsUI")[0]?.getBoundingClientRect()
        app.position.left = pos.left
        app.position.top = pos.top
        app.positionSet = true
      }
    })

    Hooks.on("renderSceneControls", () => {
      if (canvas["levelsLayer"]) canvas["levelsLayer"].deactivate();
    });

    Hooks.on("preCreateTile", (tile, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        tile.data.update({
          overhead: true,
          flags: {
            [`${_levelsModuleName}`]: {
              rangeBottom: _levels.UI.roofEnabled
                ? parseFloat(_levels.UI.range[1]) + 1
                : parseFloat(_levels.UI.range[0]),
              rangeTop: _levels.UI.roofEnabled ? Infinity : _levels.UI.range[1],
            }
          },
        });
        if(!_levels?.UI?.suppressBr){
          let brmode = 2
          if(_levels.UI.roofEnabled) brmode = 1
          if(_levels.UI.placeOverhead) brmode = 0
          tile.data.update({
            flags: {
              betterroofs: { 
                brMode: brmode
              },
            }
          })
        }
      }
    });

    Hooks.on("deleteTile", (tile, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        _levels.UI.computeLevelsVisibility();
      }
    });

    Hooks.on("updateTile", (tile, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        _levels.UI.computeLevelsVisibility();
        if (game.settings.get(_levelsModuleName, "enableTooltips")) {
          canvas.hud.levels.bind(tile.object);
        } else {
          canvas.hud.levels.clear();
        }
      }
    });

    Hooks.on("preCreateAmbientLight", (light, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        light.data.update(_levels.UI.getObjUpdateData(_levels.UI.range));
      }
    });

    Hooks.on("preCreateAmbientSound", (sound, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        sound.data.update(_levels.UI.getObjUpdateData(_levels.UI.range));
      }
    });

    Hooks.on("preCreateNote", (note, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        note.data.update(_levels.UI.getObjUpdateData(_levels.UI.range));
      }
    });

    Hooks.on("preCreateDrawing", (drawing, updates) => {
      let aboverange =
        _levels.UI.definedLevels[
          _levels.UI.definedLevels.indexOf(_levels.UI.range) - 1
        ];
      if (aboverange) {
        let newTop = aboverange[1];
        let newBot = aboverange[0];
        if (_levels.UI.rangeEnabled == true) {
          drawing.data.update({
            hidden: true,
            text: _levels.UI.stairEnabled
              ? `Levels Stair ${_levels.UI.range[0]}-${newBot}`
              : `Levels Hole ${_levels.UI.range[0]}-${newTop}`,
            flags: {
              levels: {
                drawingMode: _levels.UI.stairEnabled ? 2 : 1,
                rangeBottom: _levels.UI.range[0],
                rangeTop: _levels.UI.stairEnabled ? newBot - 1 : newTop,
              },
            },
          });
        }
      } else {
        if (_levels.UI.rangeEnabled == true) {
          drawing.data.update({
            hidden: true,
            text: _levels.UI.stairEnabled
              ? `Levels Stair ${_levels.UI.range[0]}-${_levels.UI.range[1] + 1}`
              : `Levels Hole ${_levels.UI.range[0]}-${_levels.UI.range[1]}`,
            flags: {
              levels: {
                drawingMode: _levels.UI.stairEnabled ? 2 : 1,
                rangeBottom: _levels.UI.range[0],
                rangeTop: _levels.UI.range[1],
              },
            },
          });
        }
      }
    });

    Hooks.on("preCreateWall", (wall, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        wall.data.update({
          flags: {
            wallHeight: {
              wallHeightBottom: _levels.UI.range[0],
              wallHeightTop: _levels.UI.range[1],
            },
          },
        });
      }
    });

    Hooks.on("preCreateToken", (token, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        token.data.update({
          elevation: _levels.UI.range[0],
        });
      }
    });
  }
});

Hooks.on("renderSceneControls", () => {
  if (
    _levels?.UI?.rangeEnabled // && !game.settings.get(_levelsModuleName, "forceUiRefresh")
  )
    _levels.UI.computeLevelsVisibility();
});

/*Hooks.on("renderApplication", () => {
  if (
    _levels?.UI?.rangeEnabled &&
    game.settings.get(_levelsModuleName, "forceUiRefresh")
  )
    _levels.UI.refreshLevels();
});

Hooks.on("sightRefresh", () => {
  if(canvas.tokens.controlled[0]) return
  if (
    _levels?.UI?.rangeEnabled &&
    game.settings.get(_levelsModuleName, "forceUiRefresh")
  )
    _levels.UI.refreshLevels();
});

Hooks.on("lightingRefresh", () => {
  if(canvas.tokens.controlled[0]) return
  if (
    _levels?.UI?.rangeEnabled &&
    game.settings.get(_levelsModuleName, "forceUiRefresh")
  )
    _levels.UI.refreshLevels();
});*/

Hooks.on("getSceneControlButtons", (controls, b, c) => {
  let templateTool = {
    name: "setTemplateElevation",
    title: game.i18n.localize("levels.controls.setTemplateElevation.name"),
    icon: "fas fa-sort",
    toggle: true,
    active: _levels?.templateElevation || false,
    onClick: (toggle) => {
      _levels.templateElevation = toggle;
      if (toggle) _levels.elevationDialog(templateTool);
      else _levels.nextTemplateHeight = undefined;
    },
  };
  _levelsTemplateTool = templateTool;
  controls.find((c) => c.name == "token").tools.push(templateTool);
});

Hooks.once("canvasReady", () => {
  console.log(
    `%cLEVELS\n%cWelcome to the 3rd Dimension`,
    "font-weight: bold;text-shadow: 10px 10px 0px rgba(0,0,0,0.8), 20px 20px 0px rgba(0,0,0,0.6), 30px 30px 0px rgba(0,0,0,0.4);font-size:100px;background: #444; color: #d43f3f; padding: 2px 28px 0 2px; display: inline-block;",
    "font-weight: bold;text-shadow: 2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6), 6px 6px 0px rgba(0,0,0,0.4);font-size:20px;background: #444; color: #d43f3f; padding: 10px 27px; display: inline-block; margin-left: -30px"
  );
});