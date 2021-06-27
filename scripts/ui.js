let _levelsTemplateTool

class LevelsUI {
  constructor() {
    this.range = [];
    this.rangeEnabled = false;
    this.definedLevels = [];
    this.currentLevel = 0;
    this.roofEnabled = false;
    this.placeOverhead = false;
    this.stairEnabled = true;
  }

  renderHud(toggle) {
    this.readLevels(this.currentLevel);
    $("body").find('div[id="levels-levels"]').remove();
    if (!toggle) {
      this.computeLevelsVisibility();
      this.clearVisibility();
      return;
    }
    this.computeLevelsVisibility(this.range);
    let UIHtml = `<div id="levels-levels" class="app">
    <h3>
      <i class="fas fa-layer-group"></i>
      ${game.i18n.localize("levels.widget.title")}
      <a class="link"><i id="levelDown" class="fas fa-angle-down"></i></a>
      <a class="link"><i id="levelUp" class="fas fa-angle-up"></i></a>
      <a class="link"><i id="levelClose" class="fas fa-times"></i></a>
    </h3>
    <ol>
    
  `;
    let sortedLevels = this.definedLevels.map((x) => x);
    sortedLevels.reverse();
    for (let level of sortedLevels) {
      let cssClass =
        this.definedLevels.indexOf(level) == this.currentLevel
          ? "active"
          : "inactive";
      UIHtml += `<li class="level" data-level="${this.definedLevels.indexOf(
        level
      )}">
        <span class="${cssClass}"></span>
        <a class="link change-level">
        <span>
          ${
            level[2] ||
            game.i18n.localize("levels.widget.element") +
              " " +
              this.definedLevels.indexOf(level)
          }:
        </span>
        <span>
          [${level[0]} - ${level[1]}]
        </span>
      </a>
      </li>`;
    }

    UIHtml += "	</ol></div>";
    let $UIHtml = $(UIHtml);
    $("body").append($UIHtml);

    $UIHtml.find("a.change-level").click(function () {
      _levels.UI.currentLevel = $(this).closest("li.level").data("level");
      _levels.UI.refreshLevels();
    });

    $UIHtml.find("#levelDown").click(function () {
      if (_levels.UI.currentLevel > 0) _levels.UI.currentLevel -= 1;
      _levels.UI.refreshLevels();
    });

    $UIHtml.find("#levelUp").click(function () {
      if (_levels.UI.currentLevel < _levels.UI.definedLevels.length - 1)
        _levels.UI.currentLevel += 1;
      _levels.UI.refreshLevels();
    });

    $UIHtml.find("#levelClose").click(function () {
      _levels.UI.rangeEnabled = false;
      _levels.UI.renderHud(false);
      let levelsLayerBTN = $("body").find(
        `li[data-canvas-layer="levelsLayer"]`
      );
      let togglebutton = $("body").find(`li[data-tool="enablerange"]`);
      if (levelsLayerBTN[0].className == "scene-control active")
        togglebutton.trigger("click");
    });
  }

  async defineLevels() {
    let currentLevels = "";
    if (!this.definedLevels.length) {
      currentLevels = "<p>No levels defined. Add one below.</p>";
    }
    currentLevels += this.getLevelsHtml(this.definedLevels);
    let content = this.getLevelsHtmlContent(currentLevels);

    let dialog = new Dialog({
      title: game.i18n.localize("levels.dialog.define.title"),
      content: content,
      buttons: {
        close: {
          label: game.i18n.localize("levels.yesnodialog.no"),
          callback: () => {
            this.readLevels();
            this.renderHud(this.rangeEnabled);
          },
        },
        confirm: {
          label: game.i18n.localize("levels.yesnodialog.yes"),
          callback: async (dialog) => {
            let renderedFrom = $("body").find(`div[id="levels-define-window"]`);
            let flagToSet = [];
            for (let delBtn of $(renderedFrom).find("a")) {
              if (delBtn.id == "addLevel") continue;
              let node =
                $(delBtn).closest().prevObject[0].parentElement.children;
              let bottom = $(node).find('input[class="level-bottom"]')[0]
                .valueAsNumber;
              let top = $(node).find('input[class="level-top"]')[0]
                .valueAsNumber;
              let name = $(node).find('input[class="level-name"]')[0].value;
              flagToSet.push([bottom, top, name]);
            }
            await canvas.scene.setFlag(
              _levelsModuleName,
              "sceneLevels",
              flagToSet
            );
            this.readLevels();
            this.renderHud(this.rangeEnabled);
          },
        },
      },
      default: "close",
      close: () => {
        this.readLevels();
        this.renderHud(this.rangeEnabled);
      },
    });
    await dialog._render(true);
    let renderedFrom = $("body").find(`div[id="levels-define-window"]`);
    $($(renderedFrom).find(`div[class="button"]`)[0]).on(
      "click",
      autoReadLevels
    );
    $($(renderedFrom).find(`div[class="button"]`)[1]).on(
      "click",
      suggestedLevels
    );
    for (let delBtn of $(renderedFrom).find("a")) {
      if (delBtn.id == "addLevel") {
        $(delBtn).on("click", addToDialog);
      } else {
        $(delBtn).on("click", refreshDialog);
      }
    }
    async function refreshDialog(add = true) {
      if (add) _levels.UI.definedLevels = _levels.UI.getDialogCurrentLevels();
      let index = add ? this.id.split("-")[1] : undefined;
      if (index) _levels.UI.definedLevels.splice(index, 1);
      let currentLevels = "";
      if (!_levels.UI.definedLevels.length) {
        currentLevels = "<p>No levels defined. Add one below.</p>";
      }
      currentLevels += _levels.UI.getLevelsHtml(_levels.UI.definedLevels);
      let newcontent = _levels.UI.getLevelsHtmlContent(currentLevels);
      let oldForm = $("body").find(`div[id="levels-define-window"]`);
      await oldForm.replaceWith(newcontent);
      let newRenderedFrom = $("body").find(`div[id="levels-define-window"]`);
      $($(newRenderedFrom).find(`div[class="button"]`)[0]).on(
        "click",
        autoReadLevels
      );
      $($(newRenderedFrom).find(`div[class="button"]`)[1]).on(
        "click",
        suggestedLevels
      );
      for (let delBtn of $(newRenderedFrom).find("a")) {
        if (delBtn.id == "addLevel") {
          $(delBtn).on("click", addToDialog);
        } else {
          $(delBtn).on("click", refreshDialog);
        }
      }
    }

    async function addToDialog() {
      let node = $(this).closest().prevObject[0].parentElement.children;
      let bottom = $(node).find('input[class="level-bottom"]')[0].valueAsNumber;
      let top = $(node).find('input[class="level-top"]')[0].valueAsNumber;
      let name = $(node).find('input[class="level-name"]')[0].value;
      _levels.UI.definedLevels = _levels.UI.getDialogCurrentLevels();
      _levels.UI.definedLevels.push([bottom, top, name]);
      let currentLevels = "";
      if (!_levels.UI.definedLevels.length) {
        currentLevels = "<p>No levels defined. Add one below.</p>";
      }
      currentLevels += _levels.UI.getLevelsHtml(_levels.UI.definedLevels);
      let newcontent = _levels.UI.getLevelsHtmlContent(currentLevels);
      let oldForm = $("body").find(`div[id="levels-define-window"]`);
      await oldForm.replaceWith(newcontent);
      let newRenderedFrom = $("body").find(`div[id="levels-define-window"]`);
      $($(newRenderedFrom).find(`div[class="button"]`)[0]).on(
        "click",
        autoReadLevels
      );
      $($(newRenderedFrom).find(`div[class="button"]`)[1]).on(
        "click",
        suggestedLevels
      );
      for (let delBtn of $(newRenderedFrom).find("a")) {
        if (delBtn.id == "addLevel") {
          $(delBtn).on("click", addToDialog);
        } else {
          $(delBtn).on("click", refreshDialog);
        }
      }
    }

    function autoReadLevels(event) {
      event.preventDefault();
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
        .sort();
      if (autoRange.length) _levels.UI.definedLevels = autoRange;
      refreshDialog(false);
    }

    function suggestedLevels(event) {
      event.preventDefault();
      let suggestedRange = [
        [0, 9, "Ground Floor"],
        [10, 19, "First Floor"],
        [20, 29, "Second Floor"],
        [30, 39, "Third Floor"],
      ];
      _levels.UI.definedLevels = suggestedRange;
      refreshDialog(false);
    }
  }

  getDialogCurrentLevels() {
    let renderedFrom = $("body").find(`div[id="levels-define-window"]`);
    let newLevels = [];
    for (let delBtn of $(renderedFrom).find("a")) {
      if (delBtn.id == "addLevel") continue;
      let node = $(delBtn).closest().prevObject[0].parentElement.children;
      let bottom = $(node).find('input[class="level-bottom"]')[0].valueAsNumber;
      let top = $(node).find('input[class="level-top"]')[0].valueAsNumber;
      let name = $(node).find('input[class="level-name"]')[0].value;
      newLevels.push([bottom, top, name]);
    }
    return newLevels;
  }

  getLevelsHtml(levels) {
    let currLevelsHtml = "";
    for (let level of levels) {
      currLevelsHtml += `
      <div class="form-group" id="currentLevels" index="${levels.indexOf(
        level
      )}">
      <label for="level-bottom">${game.i18n.localize(
        "levels.form.bottom"
      )}</label>
        <div class="form-fields">
          <input type="number" class="level-bottom" value="${
            level[0]
          }" data-dtype="Number">
        </div>
        <label for="level-top">${game.i18n.localize("levels.form.top")}</label>
        <div class="form-fields">
          <input type="number" class="level-top" value="${
            level[1]
          }" data-dtype="Number">
        </div>
        <label for="level-name">${game.i18n.localize(
          "levels.form.name"
        )}</label>
        <div class="form-fields">
          <input type="text" class="level-name" value="${
            level[2] || ""
          }" data-dtype="String">
        </div>
        <a class="trash" id="deleteLevel-${levels.indexOf(
          level
        )}"><i class="fas fa-trash"></i></a>
      </div>`;
    }
    return currLevelsHtml;
  }

  getLevelsHtmlContent(currentLevels) {
    return `
    <div id="levels-define-window">
  <h2>${game.i18n.localize("levels.form.currentLevel")}</h2>
  <p class="notes">${game.i18n.localize("levels.form.tip")}</p>
  <hr>
    <form id="levels-define" autocomplete="off">
      <div class="current-levels" style="min-height:200px">
        ${currentLevels}
      </div>
      <hr>
      <p class="notes">${game.i18n.localize("levels.form.addNew")}</p>
      <div class="form-group">
        <label for="level-bottom">${game.i18n.localize(
          "levels.form.bottom"
        )}</label>
        <div class="form-fields">
          <input type="number" class="level-bottom" data-dtype="Number">
        </div>
        <label for="level-top">${game.i18n.localize("levels.form.top")}</label>
        <div class="form-fields">
          <input type="number" class="level-top" data-dtype="Number">
        </div>
        <label for="level-name">${game.i18n.localize(
          "levels.form.name"
        )}</label>
        <div class="form-fields">
          <input type="text" class="level-name" data-dtype="String">
        </div>
        <a class="trash" id="addLevel"><i class="fas fa-plus"></i></a>
      </div>
      <div class="button">
        <button class="add-level">${game.i18n.localize(
          "levels.form.autoLevels"
        )}</button>
      </div>
      <div class="button">
      <button class="add-level">${game.i18n.localize(
        "levels.form.suggestedLevels"
      )}</button>
    </div>
    </form>
</div>

      `;
  }

  readLevels(currentLevel = 0) {
    let levelsFlag =
      canvas.scene.getFlag(_levelsModuleName, "sceneLevels") || [];
    this.currentLevel = currentLevel;
    this.definedLevels = levelsFlag;
    this.range = this.definedLevels[currentLevel];
  }

  refreshLevels() {
    this.range = this.definedLevels[this.currentLevel];
    this.renderHud(this.rangeEnabled);
    this.computeLevelsVisibility(this.range);
  }

  computeLevelsVisibility(range) {
    _levels.floorContainer.removeChildren();
    _levels.floorContainer.spriteIndex = {};
    if (!range) return;
    for (let wall of canvas.walls.placeables) {
      let entityRange = [
        wall.data.flags.wallHeight?.wallHeightBottom,
        wall.data.flags.wallHeight?.wallHeightTop,
      ];
      if (entityRange[0] >= range[0] && entityRange[1] <= range[1]) {
        wall.visible = true;
      } else {
        wall.visible = false;
      }
    }

    for (let tile of canvas.foreground.placeables) {
      tile.visible = this.computeRangeForDocument(
        tile,
        range,
        this.roofEnabled
      );
      let { rangeBottom, rangeTop, isLevel } = _levels.getFlagsForObject(tile);
      let tileIndex = { tile: tile, range: [rangeBottom, rangeTop] };
      if (tile.visible || tileIndex.range[1] <= range[1]) {
        _levels.mirrorTileInBackground(tileIndex);
      } else {
        _levels.removeTempTile(tileIndex);
      }
    }

    for (let light of canvas.lighting.placeables) {
      light.visible = this.computeRangeForDocument(light, range);
      light.source.skipRender = !light.visible;
    }

    for (let note of canvas.notes.placeables) {
      note.visible = this.computeRangeForDocument(note, range);
    }

    for (let sound of canvas.sounds.placeables) {
      sound.visible = this.computeRangeForDocument(sound, range);
    }

    for (let drawing of canvas.drawings.placeables) {
      drawing.visible = this.computeRangeForDocument(drawing, range);
    }

    canvas.lighting.refresh();
    canvas.lighting.placeables.forEach((l) => l.updateSource());
  }

  computeRangeForDocument(document, range, isTile = false) {
    let { rangeBottom, rangeTop } = _levels.getFlagsForObject(document);
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
      tile.refresh();
    }

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
    canvas.lighting.refresh();
    canvas.lighting.placeables.forEach((l) => l.updateSource());
  }

  async clearLevels() {
    if (
      await this.yesNoPrompt(
        game.i18n.localize("levels.dialog.levelsclear.title"),
        game.i18n.localize("levels.dialog.levelsclear.content")
      )
    ) {
      await canvas.scene.setFlag(_levelsModuleName, "sceneLevels", []);
      this.readLevels();
    }
  }

  async yesNoPrompt(dTitle, dContent) {
    let dialog = new Promise((resolve, reject) => {
      new Dialog({
        title: `${dTitle}`,
        content: `<p>${dContent}</p>`,
        buttons: {
          one: {
            icon: '<i class="fas fa-trash"></i>',
            label: game.i18n.localize("levels.yesnodialog.yes"),
            callback: () => {
              resolve(true);
            },
          },
          two: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("levels.yesnodialog.no"),
            callback: () => {
              resolve(false);
            },
          },
        },
        default: "two",
      }).render(true);
    });
    let result = await dialog;
    return result;
  }

  getObjUpdateData(range) {
    return {
      flags: {
        [`${_levelsModuleName}`]: { rangeBottom: range[0], rangeTop: range[1] },
      },
    };
  }
}

Hooks.on("canvasInit", () => {
  $("body").find('div[id="levels-levels"]').remove();
});

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
        toggle: true,
        active: _levels?.UI?.rangeEnabled || false,
        onClick: (toggle) => {
          if (toggle)
            controls.find((c) => c.name == "tiles").layer = "foreground";
          else controls.find((c) => c.name == "tiles").layer = "background";
          _levels.UI.rangeEnabled = toggle;
          _levels.UI.renderHud(toggle);
        },
      },
      {
        name: "define",
        title: game.i18n.localize("levels.controls.definelevels.name"),
        icon: "fas fa-edit",
        button: true,
        onClick: () => {
          _levels.UI.readLevels();
          _levels.UI.defineLevels();
        },
      },
      {
        name: "up",
        title: game.i18n.localize("levels.controls.levelup.name"),
        icon: "fas fa-level-up-alt",
        button: true,
        onClick: () => {
          if (_levels.UI.currentLevel < _levels.UI.definedLevels.length - 1)
            _levels.UI.currentLevel += 1;
          _levels.UI.refreshLevels();
        },
      },
      {
        name: "down",
        title: game.i18n.localize("levels.controls.leveldown.name"),
        icon: "fas fa-level-down-alt",
        button: true,
        onClick: () => {
          if (_levels.UI.currentLevel > 0) _levels.UI.currentLevel -= 1;
          _levels.UI.refreshLevels();
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
  }
});

Hooks.on("ready", () => {
  if (game.user.isGM) {
    Hooks.on("renderSceneControls", () => {
      if (canvas["levelsLayer"]) canvas["levelsLayer"].deactivate();
    });

    Hooks.on("preCreateTile", (tile, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        tile.data.update({
          flags: {
            [`${_levelsModuleName}`]: {
              rangeBottom: _levels.UI.roofEnabled
                ? _levels.UI.range[1] + 1
                : _levels.UI.range[0],
              rangeTop: _levels.UI.roofEnabled ? Infinity : _levels.UI.range[1],
            },
            betterroofs: { brMode: _levels.UI.placeOverhead ? 0 : 2 },
          },
        });
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
      let aboverange = _levels.UI.definedLevels[_levels.UI.definedLevels.indexOf(_levels.UI.range)+1]
      if(aboverange){
        let newTop = aboverange[1]
        let newBot = aboverange[0]
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
                rangeTop: _levels.UI.stairEnabled ? newBot-1 : newTop,
              },
            },
          });
        }
      }else{
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

    Hooks.on("renderSceneControls", () => {
      if (_levels.UI.rangeEnabled) _levels.UI.refreshLevels();
    });
  }
});

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
  _levelsTemplateTool = templateTool
  controls.find((c) => c.name == "token").tools.push(templateTool);
});

Hooks.once("canvasReady",()=>{
  console.log(`%cLEVELS\n%cWelcome to the 3rd Dimension`,"font-weight: bold;text-shadow: 10px 10px 0px rgba(0,0,0,0.8), 20px 20px 0px rgba(0,0,0,0.6), 30px 30px 0px rgba(0,0,0,0.4);font-size:100px;background: #444; color: #d43f3f; padding: 2px 28px 0 2px; display: inline-block;", "font-weight: bold;text-shadow: 2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6), 6px 6px 0px rgba(0,0,0,0.4);font-size:20px;background: #444; color: #d43f3f; padding: 10px 27px; display: inline-block; margin-left: -30px");
})