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
      let cssClass = this.definedLevels.indexOf(level) == this.currentLevel ? 'active' : 'inactive';
      UIHtml += `<li class="level flexrow" data-level="${this.definedLevels.indexOf(level)}">
        <span class="${cssClass}"></span>
        <a class="link change-level">
          <span>
        ${level[2] || game.i18n.localize(
        'levels.widget.element',
      ) + " " + this.definedLevels.indexOf(level)}: [${level[0]} - ${level[1]}]
          </span>
        </a>
      </li>`;
    }

    UIHtml += "	</ol></div>";
    let $UIHtml = $(UIHtml);
    $("body").append($UIHtml);

    $UIHtml.find("a.change-level").click(function () {
      _levels.UI.currentLevel = $(this).closest('li.level').data('level');
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
    });
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
          callback: async (dialog) => {
            let definedLevels = dialog[0].querySelectorAll(
              'input[name="definedlevels"]'
            )[0].value;
            await canvas.scene.setFlag(
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
    let { rangeBottom, rangeTop } = _levels.getFlagsForObject(document)
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

  getObjUpdateData(range){
    return {
      flags: { [`${_levelsModuleName}`]: { rangeTop: range[0],rangeBottom: range[1] } },
    }
  }
}

Hooks.on("getSceneControlButtons", (controls, b, c) => {
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
    layer: "voidLayer",
    title: game.i18n.localize("levels.controls.main.name"),
    icon: "fas fa-layer-group",
    tools: levelsTools,
  };
  controls.push(levelsLayerTool);
});

Hooks.on("createTile", (tile, updates) => {
  if (_levels.UI.rangeEnabled == true) {
    tile.update(_levels.UI.getObjUpdateData(_levels.UI.range));
  }
});

Hooks.on("createLight", (light, updates) => {
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
