class LevelsUI {
  constructor() {
    this.range = [];
    this.rangeEnabled = false;
    this.definedLevels = [];
    this.currentLevel = 0;
  }

  renderHud(toggle) {
    $("body").find('div[id="levels-levels"]').remove();
    if (!toggle) {
      this.clearVisibility();
      return;
    }
    this.computeLevelsVisibility(this.range);
    let UIHtml = `<div id="levels-levels" class="app " style="z-index:1000; position: fixed; right: 315px; border: 1px solid #000">
    <h3 style="border-bottom: 2px groove #23221d; margin: 3px; padding: 4px">
      <i class="fas fa-layer-group"></i>
      ${game.i18n.localize("levels.widget.title")}
      <i id="levelDown" class="players-mode fas fa-angle-down"></i>
      <i id="levelUp" class="players-mode fas fa-angle-up"></i>
      <i id="levelClose" class="players-mode fas fa-times"></i>
    </h3>
    <ol id="player-list" style="display: inline-grid;grid-template-columns: repeat(auto-fit, 150px);margin-right: 10px;padding: 0;">
    
  `;
    let sortedLevels = this.definedLevels.map((x) => x);
    sortedLevels.reverse();
    for (let level of sortedLevels) {
      if (this.definedLevels.indexOf(level) == this.currentLevel) {
        UIHtml += `<li class="player gm flexrow" data-user-id="Cspu3pxFr7tu7SU7">
        <span class="player-active active" style="background: #cc288f; border: 1px solid #ff50ff;border-radius:50%; flex: 0 0 8px; height: 8px; margin: 5px 8px 0 0;"></span>
        <span class="player-name self" style="color:navajowhite">
        ${game.i18n.localize(
          "levels.widget.element"
        )} ${this.definedLevels.indexOf(level)}: [${level[0]} - ${level[1]}]
                </span>
      </li>`;
      } else {
        UIHtml += `<li class="player  flexrow" data-user-id="xJOkk908LjZkr6uM">
        <span class="player-active inactive" style="background: #333333; border: 1px solid #000000;border-radius:50%; flex: 0 0 8px; height: 8px; margin: 5px 8px 0 0;"></span>
        <span class="player-name ">
        ${game.i18n.localize(
          "levels.widget.element"
        )} ${this.definedLevels.indexOf(level)}: [${level[0]} - ${level[1]}]
                </span>
      </li>`;
      }
    }

    UIHtml += "	</ol></div>";
    function onHoverBtnIn() {
      this.style.border = "1px solid red";
      this.style["border-bottom"] = "1px solid #ff6400";
      this.style["box-shadow"] = "0 0 10px #ff6400";
    }
    function onHoverBtnOut() {
      this.style.border = "";
      this.style["border-bottom"] = "";
      this.style["box-shadow"] = "";
    }
    $("body").append(UIHtml);

    $("#levelDown").click(function () {
      if (_levels.UI.currentLevel > 0) _levels.UI.currentLevel -= 1;
      _levels.UI.refreshLevels();
    });
    
    $("#levelUp").click(function () {
      if (_levels.UI.currentLevel < _levels.UI.definedLevels.length - 1)
        _levels.UI.currentLevel += 1;
      _levels.UI.refreshLevels();
    });
    $("#levelDown").hover(onHoverBtnIn,onHoverBtnOut);
    $("#levelUp").hover(onHoverBtnIn,onHoverBtnOut);
  }

  async defineLevels() {
    let oldLevels =
      canvas.scene.getFlag(_levelsModuleName, "sceneLevels") || "";
    let content = `
    <p class="notification info">${game.i18n.localize(
      "levels.dialog.define.warn"
    )}</p>
  
    <div class="form-group">
    <label for="definedlevels">${game.i18n.localize(
      "levels.dialog.define.text"
    )}</label>
    <input type="text" name="definedlevels" value="${oldLevels}">
</div>

      `;

    let dialog = new Dialog({
      title: game.i18n.localize("levels.dialog.define.title"),
      content: content,
      buttons: {
        close: { label: game.i18n.localize("levels.yesnodialog.no") },
        confirm: {
          label: game.i18n.localize("levels.yesnodialog.yes"),
          callback: (dialog) => {
            let definedLevels = dialog[0].querySelectorAll(
              'input[name="definedlevels"]'
            )[0].value;
            canvas.scene.setFlag(
              _levelsModuleName,
              "sceneLevels",
              definedLevels
            );
            this.readLevels();
            this.renderHud(this.rangeEnabled);
          },
        },
      },
      default: "close",
      close: () => {},
    });
    await dialog._render(true);
  }

  readLevels() {
    let levelsFlag =
      canvas.scene.getFlag(_levelsModuleName, "sceneLevels") || "";
    let levels = levelsFlag.split("|");
    this.definedLevels = [];
    levels.forEach((level) => {
      this.definedLevels.push(level.split(","));
    });
    this.currentLevel = 0;
    this.range = this.definedLevels[0];
  }

  refreshLevels() {
    this.range = this.definedLevels[this.currentLevel];
    this.renderHud(this.rangeEnabled);
    this.computeLevelsVisibility(this.range);
  }

  computeLevelsVisibility(range) {
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
    let levelsRangeFlag = document.document
      .getFlag(_levelsModuleName, "heightRange")
      ?.split(",");
    if (!levelsRangeFlag || levelsRangeFlag.length != 2) return false;
    let range0 = parseInt(levelsRangeFlag[0]);
    let range1 =
      levelsRangeFlag[1].toLowerCase() == "infinity"
        ? 10000
        : parseInt(levelsRangeFlag[1]);
    let entityRange = [range0, range1];
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
      canvas.scene.setFlag(_levelsModuleName, "sceneLevels", "");
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
}

Hooks.on("getSceneControlButtons", (controls, b, c) => {
  let levelsTools = [
    {
      name: "levels-enablerange",
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
      name: "levels-define",
      title: game.i18n.localize("levels.controls.definelevels.name"),
      icon: "fas fa-plus-square",
      button: true,
      onClick: () => {
        _levels.UI.defineLevels();
      },
    },
    {
      name: "levels-up",
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
      name: "levels-down",
      title: game.i18n.localize("levels.controls.leveldown.name"),
      icon: "fas fa-level-down-alt",
      button: true,
      onClick: () => {
        if (_levels.UI.currentLevel > 0) _levels.UI.currentLevel -= 1;
        _levels.UI.refreshLevels();
      },
    },
    {
      name: "levels-clear",
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
    layer: "voidLayer",
    title: game.i18n.localize("levels.controls.main.name"),
    icon: "fas fa-layer-group",
    tools: levelsTools,
  };
  controls.push(levelsLayerTool);
});

Hooks.on("createTile", (tile, updates) => {
  if (_levels.UI.rangeEnabled == true) {
    let rangeFlag =
      String(_levels.UI.range[0]) + "," + String(_levels.UI.range[1]);
    tile.update({
      flags: { [`${_levelsModuleName}`]: { heightRange: rangeFlag } },
    });
  }
});

Hooks.on("createLight", (light, updates) => {
  if (_levels.UI.rangeEnabled == true) {
    let rangeFlag =
      String(_levels.UI.range[0]) + "," + String(_levels.UI.range[1]);
    light.update({
      flags: { [`${_levelsModuleName}`]: { heightRange: rangeFlag } },
    });
  }
});

Hooks.on("createDrawing", (drawing, updates) => {
  if (_levels.UI.rangeEnabled == true) {
    let rangeFlag =
      String(_levels.UI.range[0]) + "," + String(_levels.UI.range[1]);
    drawing.update({
      flags: { [`${_levelsModuleName}`]: { heightRange: rangeFlag } },
    });
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
