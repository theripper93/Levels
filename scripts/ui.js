class LevelsUI {
  constructor() {
    this.range = [];
    this.rangeEnabled = false;
    this.definedLevels = [];
    this.currentLevel = 0;
  }

  renderHud(toggle) {
    this.readLevels()
    $("body").find('div[id="levels-levels"]').remove();
    if (!toggle) {
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
            console.log(flagToSet);
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
    for (let delBtn of $(renderedFrom).find("a")) {
      if (delBtn.id == "addLevel") {
        $(delBtn).on("click", addToDialog);
      } else {
        $(delBtn).on("click", refreshDialog);
      }
    }
    async function refreshDialog() {
      let index = this.id.split("-")[1];
      _levels.UI.definedLevels = _levels.UI.getDialogCurrentLevels();
      _levels.UI.definedLevels.splice(index, 1);
      let currentLevels = "";
      if (!_levels.UI.definedLevels.length) {
        currentLevels = "<p>No levels defined. Add one below.</p>";
      }
      currentLevels += _levels.UI.getLevelsHtml(_levels.UI.definedLevels);
      let newcontent = _levels.UI.getLevelsHtmlContent(currentLevels);
      let oldForm = $("body").find(`div[id="levels-define-window"]`);
      await oldForm.replaceWith(newcontent);
      let newRenderedFrom = $("body").find(`div[id="levels-define-window"]`);
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
      console.log(bottom, top, name);
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
      for (let delBtn of $(newRenderedFrom).find("a")) {
        if (delBtn.id == "addLevel") {
          $(delBtn).on("click", addToDialog);
        } else {
          $(delBtn).on("click", refreshDialog);
        }
      }
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
      <div class="current-levels" style="height:200px">
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
    </form>
</div>

      `;
  }

  readLevels() {
    let levelsFlag =
      canvas.scene.getFlag(_levelsModuleName, "sceneLevels") || [];
    this.currentLevel = 0;
    this.definedLevels = levelsFlag;
    this.range = levelsFlag[0];
  }

  refreshLevels() {
    this.range = this.definedLevels[this.currentLevel];
    this.renderHud(this.rangeEnabled);
    this.computeLevelsVisibility(this.range);
  }

  computeLevelsVisibility(range) {
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
      tile.visible = this.computeRangeForDocument(tile, range);
    }

    for (let light of canvas.lighting.placeables) {
      light.visible = this.computeRangeForDocument(light, range);
    }

    for (let drawing of canvas.drawings.placeables) {
      drawing.visible = this.computeRangeForDocument(drawing, range);
    }
  }

  computeRangeForDocument(document, range) {
    let { rangeBottom, rangeTop } = _levels.getFlagsForObject(document);
    let entityRange = [rangeBottom, rangeTop];
    if (entityRange[0] >= range[0] && entityRange[1] <= range[1]) {
      return true;
    } else {
      return false;
    }
  }

  clearVisibility() {
    for (let wall of canvas.walls.placeables) {
      wall.visible = true;
    }

    for (let tile of canvas.foreground.placeables) {
      tile.visible = true;
    }

    for (let light of canvas.lighting.placeables) {
      light.visible = true;
    }

    for (let drawing of canvas.drawings.placeables) {
      drawing.visible = true;
    }
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
    let levelsTools = [
      {
        name: "enablerange",
        title: game.i18n.localize("levels.controls.levelsview.name"),
        icon: "fas fa-layer-group",
        toggle: true,
        active: _levels?.UI?.rangeEnabled || false,
        onClick: (toggle) => {
          _levels.UI.rangeEnabled = toggle;
          _levels.UI.renderHud(toggle);
        },
      },
      {
        name: "define",
        title: game.i18n.localize("levels.controls.definelevels.name"),
        icon: "fas fa-plus-square",
        button: true,
        onClick: () => {
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

    Hooks.on("createTile", (tile, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        tile.update(_levels.UI.getObjUpdateData(_levels.UI.range));
        tile.update({ flags: { betterroofs: { brMode: 2 } } });
      }
    });

    Hooks.on("createAmbientLight", (light, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        light.update(_levels.UI.getObjUpdateData(_levels.UI.range));
      }
    });

    Hooks.on("createDrawing", (drawing, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        drawing.update(_levels.UI.getObjUpdateData(_levels.UI.range));
      }
    });

    Hooks.on("createWall", (wall, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        wall.update({
          flags: {
            wallHeight: {
              wallHeightBottom: _levels.UI.range[0],
              wallHeightTop: _levels.UI.range[1],
            },
          },
        });
      }
    });

    Hooks.on("createToken", (token, updates) => {
      if (_levels.UI.rangeEnabled == true) {
        token.update({
          elevation: _levels.UI.range[0],
        });
      }
    });
  }
});
