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
    html.on(
      "click",
      "#levels-ui-controls .fa-bug",
      this._onCheckScene.bind(this)
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
    const brokenTiles = this._onCheckScene(undefined, false)
    if(brokenTiles) {
      html.find("#levels-ui-controls .fa-bug").addClass("broken")
    }
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
    this.definedLevels = canvas.scene.getFlag(CONFIG.Levels.MODULE_ID, "sceneLevels");
    this.range = this.definedLevels.find(
      (l) => l[0] == bottom && l[1] == top
    );
    if($(event.target).hasClass("player-portrait")) return
    WallHeight.currentTokenElevation = parseFloat(bottom)
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

  _onCheckScene(event, showDialog = true) {
    const brokenTiles = canvas.tiles.placeables.filter(t => t.document.overhead).filter((t) =>  !t.document.getFlag("levels", "excludeFromChecker")  && _betterRoofsHelpers.getRoomPoly(t, false, true).isBroken);
    const excludedTiles = canvas.tiles.placeables.filter(t => t.document.overhead).filter((t) => t.document.getFlag("levels", "excludeFromChecker")).length;
    if(showDialog) {
      const dContent = `
      <p><a href="https://theripper93.com/#/module/levels" target="_blank"><h6 style="margin: 0;">${game.i18n.localize("levels.dialog.checkScene.learnMore")}</h6></a></p>
      <h3 style="font-weight: 500;">${game.i18n.localize("levels.dialog.checkScene.content")}</h3>
      <hr>
      <ul>
      ${brokenTiles.map((t) => `<li data-tileid=${t.id}><a>${t.data.img}</a></li>`).join("")}
      </ul>
      <h4>${brokenTiles.length === 0 ? game.i18n.localize("levels.dialog.checkScene.noIssues") : "" }</h4>
      `;
      Dialog.prompt({
        title: excludedTiles > 0 ? game.i18n.localize("levels.dialog.checkScene.title") + " | " + game.i18n.localize("levels.dialog.checkScene.excluded") + ` (${excludedTiles})` : game.i18n.localize("levels.dialog.checkScene.title"),
        content: dContent,
        render: (html) => {
          html.on("click", "li", (e) => {
            const $target = $(e.currentTarget);
            const tileId = $target.data("tileid");
            const tile = brokenTiles.find((t) => t.id == tileId);
            if(tile) tile.sheet.render(true);
          })
        },
        callback: () => {},
      })
    }
    return brokenTiles.length > 0;
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
    canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "sceneLevels", data);
  }

  async loadLevels() {
    $("#levels-list").empty();
    let levelsFlag =
      canvas.scene.getFlag(CONFIG.Levels.MODULE_ID, "sceneLevels") || [];
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
        await canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "sceneLevels", []);
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
    if(!force) this.clearVisibility();
    this.rangeEnabled = false;
    ui.controls.controls.find((c) => c.name == "tiles").layer = "background";
    super.close();
  }

  async getFromScene() {
    let autoLevels = {};
    for (let wall of canvas.walls.placeables) {
      const {top, bottom} = WallHeight.getWallBounds(wall);
      let entityRange = [bottom, top];
      if (
        entityRange[0] != -Infinity &&
        entityRange[1] != Infinity &&
        (entityRange[0] || entityRange[0] == 0) &&
        (entityRange[1] || entityRange[1] == 0)
      ) {
        autoLevels[`${entityRange[0]}${entityRange[1]}`] = entityRange;
      }
    }

    for (let tile of canvas.tiles.placeables.filter(t => t.document.overhead)) {
      let { rangeBottom, rangeTop } = CONFIG.Levels.getFlagsForObject(tile);
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
      let { rangeBottom, rangeTop } = CONFIG.Levels.getFlagsForObject(light);
      if (
        (rangeBottom || rangeBottom == 0) &&
        (rangeTop || rangeTop == 0) &&
        rangeTop != Infinity &&
        rangeBottom != -Infinity
      ) {
        autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
      }
    }

    for(let drawing of canvas.drawings.placeables){
      let { rangeBottom, rangeTop } = CONFIG.Levels.getFlagsForObject(drawing);
      if (
        (rangeBottom || rangeBottom == 0) &&
        (rangeTop || rangeTop == 0) &&
        rangeTop != Infinity &&
        rangeBottom != -Infinity
      ) {
        autoLevels[`${rangeBottom}${rangeTop}`] = [rangeBottom, rangeTop];
      }
    };
    let autoRange = Object.entries(autoLevels)
      .map((x) => x[1])
      .sort()
      .reverse();
    if (autoRange.length) {
      await canvas.scene.setFlag(CONFIG.Levels.MODULE_ID, "sceneLevels", autoRange);
      this.loadLevels();
    }
  }

  computeLevelsVisibility(range) {
    CONFIG.Levels.floorContainer.removeChildren();
    CONFIG.Levels.floorContainer.spriteIndex = {};
    if(!range) range = this.range
    if (!range) return;
    range[0] = parseFloat(range[0]);
    range[1] = parseFloat(range[1]);
    for (let wall of canvas.walls.placeables) {
      const {top, bottom} = WallHeight.getWallBounds(wall);
      let entityRange = [bottom, top];
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

    for (let tile of canvas.tiles.placeables.filter(t => t.document.overhead)) {
      tile.visible = this.computeRangeForDocument(
        tile,
        range,
        this.roofEnabled
      );
      if(tile.visible && tile.tile) tile.tile.alpha = 1
      if(tile.visible && tile.tileSortHidden || !canvas.foreground._active){
        tile.visible = false;
      }
      let { rangeBottom, rangeTop, isLevel } = CONFIG.Levels.getFlagsForObject(tile);
      let tileIndex = { tile: tile, range: [rangeBottom, rangeTop] };
      if (tileIndex.range[0] <= range[0] || tile.visible || (this.roofEnabled && tileIndex.range[0] == range[1]+1)) {
        CONFIG.Levels.mirrorTileInBackground(tileIndex);
      } else {
        CONFIG.Levels.removeTempTile(tileIndex);
      }
      tile.levelsUIHideen = !tile.visible;
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

    for(let drawing of canvas.drawings.placeables){
      drawing.visible = this.computeRangeForDocument(drawing, range);
    };
    for (let token of canvas.tokens.placeables) {
      token.levelsVisible =
        token.data.elevation <= range[1] && token.data.elevation >= range[0];
      token.visible = token.levelsVisible;
    }
  }

  computeRangeForDocument(document, range, isTile = false) {
    let { rangeBottom, rangeTop } = CONFIG.Levels.getFlagsForObject(document);
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

    for (let tile of canvas.tiles.placeables.filter(t => t.document.overhead)) {
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

    for(let drawing of canvas.drawings.placeables){
      drawing.visible = true;
      drawing.refresh();
    };

    for (let sound of canvas.sounds.placeables) {
      sound.visible = true;
      sound.refresh();
    }

    for (let note of canvas.notes.placeables) {
      note.visible = true;
      note.refresh();
    }

    for( let token of canvas.tokens.placeables){
      token.visible = true;
      token.levelsVisible = true;
      token.refresh();
    }

    CONFIG.Levels.floorContainer.removeChildren();
    CONFIG.Levels.floorContainer.spriteIndex = {};
    canvas.perception.schedule({ lighting: { initialize: true, refresh: true } });
  }

  getObjUpdateData(range) {
    return {
      flags: {
        [`${CONFIG.Levels.MODULE_ID}`]: { rangeBottom: range[0], rangeTop: range[1] },
      },
    };
  }

  async elevationDialog(tool) {
    let content = `
    <div class="form-group">
    <label for="elevation">${game.i18n.localize(
      "levels.template.elevation.name"
    )}</label>
    <div class="form-fields">
        <input type="number" name="templateElevation" data-dtype="Number" value="${
          canvas.tokens.controlled[0]?.data?.elevation ?? 0
        }" step="1">
    </div>
    </div>
    <p></p>
    <div class="form-group">
    <label for="special">${game.i18n.localize(
      "levels.template.special.name"
    )}</label>
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
            CONFIG.Levels.UI.nextTemplateHeight = html.find(
              `input[name="templateElevation"]`
            )[0].valueAsNumber;
            CONFIG.Levels.UI.nextTemplateSpecial = html.find(
              `input[name="special"]`
            )[0].valueAsNumber;
            CONFIG.Levels.UI.templateElevation = true;
            ignoreClose = true;
            tool.active = true;
            if (toolhtml[0])
              $("body")
                .find(`li[data-tool="setTemplateElevation"]`)
                .addClass("active");
          },
        },
        close: {
          label: game.i18n.localize("levels.yesnodialog.no"),
          callback: () => {
            CONFIG.Levels.UI.nextTemplateHeight = undefined;
            CONFIG.Levels.UI.nextTemplateSpecial = undefined;
            CONFIG.Levels.UI.templateElevation = false;
            tool.active = false;
            if (toolhtml[0])
              $("body")
                .find(`li[data-tool="setTemplateElevation"]`)
                .removeClass("active");
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
        if (toolhtml[0])
          $("body")
            .find(`li[data-tool="setTemplateElevation"]`)
            .removeClass("active");
      },
    });
    await dialog._render(true);
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
              CONFIG.Levels.UI.roofEnabled = toggle;
              CONFIG.Levels.UI.computeLevelsVisibility();
            },
          },
          {
            name: "placeOverhead",
            title: game.i18n.localize("levels.controls.placeOverhead.name"),
            icon: "fas fa-tree",
            toggle: true,
            active: _levels?.UI?.placeOverhead || false,
            onClick: (toggle) => {
              CONFIG.Levels.UI.placeOverhead = toggle;
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
            CONFIG.Levels.UI.stairEnabled = toggle;
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
          if (CONFIG.Levels.UI.rendered) {
            CONFIG.Levels.UI.close();
          } else {
            CONFIG.Levels.UI.render(true);
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
          CONFIG.Levels.UI.roofEnabled = toggle;
        },
      },
      {
        name: "placeOverhead",
        title: game.i18n.localize("levels.controls.placeOverhead.name"),
        icon: "fas fa-tree",
        toggle: true,
        active: _levels?.UI?.placeOverhead || false,
        onClick: (toggle) => {
          CONFIG.Levels.UI.placeOverhead = toggle;
          CONFIG.Levels.UI.computeLevelsVisibility(CONFIG.Levels.UI.range)
        },
      },
      {
        name: "placeStair",
        title: game.i18n.localize("levels.controls.levelshole.name"),
        icon: "fab fa-firstdraft",
        toggle: true,
        active: _levels?.UI?.stairEnabled || false,
        onClick: (toggle) => {
          CONFIG.Levels.UI.stairEnabled = toggle;
        },
      },
      {
        name: "suppressBrmode",
        title: game.i18n.localize("levels.controls.suppressBrmode.name"),
        icon: "fas fa-not-equal",
        toggle: true,
        active: _levels?.UI?.suppressBr || false,
        onClick: (toggle) => {
          CONFIG.Levels.UI.suppressBr = toggle;
        },
      },
      {
        name: "clear",
        title: game.i18n.localize("levels.controls.levelsclear.name"),
        icon: "fas fa-trash",
        button: true,
        onClick: () => {
          CONFIG.Levels.UI.clearLevels();
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
          if (CONFIG.Levels.UI.rendered) {
            CONFIG.Levels.UI.close();
          } else {
            CONFIG.Levels.UI.render(true);
          }
        }
      });
  }
});

Hooks.on("ready", () => {
  if (game.user.isGM) {

    Hooks.on("canvasInit", () => {
      CONFIG.Levels.UI.close(true);
    })

    Hooks.on("updateToken", (token,updates)=>{
      if("elevation" in updates)CONFIG.Levels.UI.updatePlayerList();
    })

    Hooks.on("createToken", (token,updates)=>{
      CONFIG.Levels.UI.updatePlayerList();
    })

    Hooks.on("deleteToken", (token,updates)=>{
      CONFIG.Levels.UI.updatePlayerList();
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
      if (CONFIG.Levels.UI.rangeEnabled == true) {
        tile.data.update({
          overhead: true,
        });
        if(!game.Levels3DPreview?._active){
          tile.data.update({
            flags: {
              [`${CONFIG.Levels.MODULE_ID}`]: {
                rangeBottom: CONFIG.Levels.UI.roofEnabled
                  ? parseFloat(CONFIG.Levels.UI.range[1]) + 1
                  : parseFloat(CONFIG.Levels.UI.range[0]),
                rangeTop: CONFIG.Levels.UI.roofEnabled ? Infinity : CONFIG.Levels.UI.range[1],
              }
            }
          });
        }else{
          tile.data.update({
            flags: {
              [`${CONFIG.Levels.MODULE_ID}`]: {
                rangeTop: CONFIG.Levels.UI.roofEnabled ? Infinity : CONFIG.Levels.UI.range[1],
              }
            }
          });
        }
        if(!_levels?.UI?.suppressBr){
          let brmode = 2
          if(CONFIG.Levels.UI.roofEnabled) brmode = 1
          if(CONFIG.Levels.UI.placeOverhead) brmode = 0
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
      if (CONFIG.Levels.UI.rangeEnabled == true) {
        CONFIG.Levels.UI.computeLevelsVisibility();
      }
    });

    Hooks.on("updateTile", (tile, updates) => {
      if(canvas.tokens.controlled[0]) return
      if (CONFIG.Levels.UI.rangeEnabled == true && !game.Levels3DPreview?._active) {
        CONFIG.Levels.UI.computeLevelsVisibility();
        if (game.settings.get(CONFIG.Levels.MODULE_ID, "enableTooltips")) {
          canvas.hud.levels.bind(tile.object);
        } else {
          canvas.hud.levels.clear();
        }
      }
    });

    Hooks.on("preCreateAmbientLight", (light, updates) => {
      if (CONFIG.Levels.UI.rangeEnabled == true && !game.Levels3DPreview?._active) {
        light.data.update(CONFIG.Levels.UI.getObjUpdateData(CONFIG.Levels.UI.range));
      }
    });

    Hooks.on("preCreateAmbientSound", (sound, updates) => {
      if (CONFIG.Levels.UI.rangeEnabled == true) {
        sound.data.update(CONFIG.Levels.UI.getObjUpdateData(CONFIG.Levels.UI.range));
      }
    });

    Hooks.on("preCreateNote", (note, updates) => {
      if (CONFIG.Levels.UI.rangeEnabled == true) {
        note.data.update(CONFIG.Levels.UI.getObjUpdateData(CONFIG.Levels.UI.range));
      }
    });

    Hooks.on("preCreateDrawing", (drawing, updates) => {
      let sortedLevels = [...CONFIG.Levels.UI.definedLevels].sort((a, b) => {
        return parseFloat(b[0]) - parseFloat(a[0])
      })
      let aboverange = sortedLevels.find(l => CONFIG.Levels.UI.range[0] === l[0] && CONFIG.Levels.UI.range[1] === l[1])
      aboverange = sortedLevels.indexOf(aboverange) === 0 ? undefined : sortedLevels[sortedLevels.indexOf(aboverange) - 1]

      if (aboverange) {
        let newTop = aboverange[1];
        let newBot = aboverange[0];
        if (CONFIG.Levels.UI.rangeEnabled == true) {
          drawing.data.update({
            hidden: true,
            text: CONFIG.Levels.UI.stairEnabled
              ? `Levels Stair ${CONFIG.Levels.UI.range[0]}-${newBot}`
              : `Levels Hole ${CONFIG.Levels.UI.range[0]}-${newTop}`,
            flags: {
              levels: {
                drawingMode: CONFIG.Levels.UI.stairEnabled ? 2 : 1,
                rangeBottom: CONFIG.Levels.UI.range[0],
                rangeTop: CONFIG.Levels.UI.stairEnabled ? newBot - 1 : newTop,
              },
            },
          });
        }
      } else {
        if (CONFIG.Levels.UI.rangeEnabled == true) {
          drawing.data.update({
            hidden: true,
            text: CONFIG.Levels.UI.stairEnabled
              ? `Levels Stair ${CONFIG.Levels.UI.range[0]}-${CONFIG.Levels.UI.range[1] + 1}`
              : `Levels Hole ${CONFIG.Levels.UI.range[0]}-${CONFIG.Levels.UI.range[1]}`,
            flags: {
              levels: {
                drawingMode: CONFIG.Levels.UI.stairEnabled ? 2 : 1,
                rangeBottom: CONFIG.Levels.UI.range[0],
                rangeTop: CONFIG.Levels.UI.range[1],
              },
            },
          });
        }
      }
    });

    Hooks.on("preCreateWall", (wall, updates) => {
      if (CONFIG.Levels.UI.rangeEnabled == true) {
        wall.data.update({
          flags: {
            "wall-height": {
              bottom: CONFIG.Levels.UI.range[0],
              top: CONFIG.Levels.UI.range[1],
            },
          },
        });
      }
    });

    Hooks.on("preCreateToken", (token, updates) => {
      if (CONFIG.Levels.UI.rangeEnabled == true) {
        token.data.update({
          elevation: CONFIG.Levels.UI.range[0],
        });
      }
    });
  }
});

Hooks.on("renderSceneControls", () => {
  if (
    _levels?.UI?.rangeEnabled // && !game.settings.get(CONFIG.Levels.MODULE_ID, "forceUiRefresh")
  )
    CONFIG.Levels.UI.computeLevelsVisibility();
});

Hooks.on("getSceneControlButtons", (controls, b, c) => {
  let templateTool = {
    name: "setTemplateElevation",
    title: game.i18n.localize("levels.controls.setTemplateElevation.name"),
    icon: "fas fa-sort",
    toggle: true,
    active: _levels?.UI.templateElevation || false,
    onClick: (toggle) => {
      CONFIG.Levels.UI.templateElevation = toggle;
      if (toggle) CONFIG.Levels.UI.elevationDialog(templateTool);
      else CONFIG.Levels.UI.nextTemplateHeight = undefined;
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