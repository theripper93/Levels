class LevelsToolTip extends BasePlaceableHUD {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat(["levels-tooltip"]);
    options.template = "modules/levels/templates/tooltip.html";
    options.id = "levels-tooltip";
    return options;
  }

  getData() {
    const data = super.getData();
    return data;
  }

  setPosition() {
    if (!this.object) return;
    let posleft = this.object.center.x - this.object.width / 2;
    let postop = this.object.center.y - this.object.height / 2;
    if(this.object instanceof Note){
      postop -= this.object.height / 2;
    }
    const position = {
      width: canvas.grid.size * 1.2,
      height: canvas.grid.size * 0.8,
      left: posleft,
      top: postop,
      "font-size": canvas.grid.size / 3.5 + "px",
      display: "grid",
    };
    this.element.css(position);
  }
}

Hooks.once("init", () => {
  Hooks.on("renderHeadsUpDisplay", async (app, html, data) => {
    html.append('<template id="levels-tooltip"></template>');
    canvas.hud.levels = new LevelsToolTip();
  });
});

Hooks.on("renderSceneControls", () => {
  if (canvas.hud?.levels) canvas.hud.levels.clear();
});

Hooks.on("hoverTile", (object, hovered) => {
  if (
    hovered &&
    object.document.overhead &&
    CONFIG.Levels.settings.get("enableTooltips") && !game.Levels3DPreview?._active
  ) {
    canvas.hud.levels.bind(object);
  } else {
    canvas.hud.levels.clear();
  }
});

Hooks.on("hoverDrawing", (object, hovered) => {
  if (hovered && CONFIG.Levels.settings.get("enableTooltips") && !game.Levels3DPreview?._active) {
    canvas.hud.levels.bind(object);
  } else {
    canvas.hud.levels.clear();
  }
});

Hooks.on("hoverAmbientLight", (object, hovered) => {
  if (hovered && CONFIG.Levels.settings.get("enableTooltips") && !game.Levels3DPreview?._active) {
    canvas.hud.levels.bind(object);
  } else {
    canvas.hud.levels.clear();
  }
});

Hooks.on("hoverNote", (object, hovered) => {
  if (game.user.isGM && hovered && CONFIG.Levels.settings.get("enableTooltips") && !game.Levels3DPreview?._active) {
    canvas.hud.levels.bind(object);
  } else {
    canvas.hud.levels.clear();
  }
});

Hooks.on("hoverAmbientSound", (object, hovered) => {
  if (hovered && CONFIG.Levels.settings.get("enableTooltips") && !game.Levels3DPreview?._active) {
    canvas.hud.levels.bind(object);
  } else {
    canvas.hud.levels.clear();
  }
});
