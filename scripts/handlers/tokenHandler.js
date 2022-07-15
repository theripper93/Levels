export class TokenHandler{
    static _drawTooltip(wrapped,...args) {
        const hideElevation = game.settings.get(CONFIG.Levels.MODULE_ID, "hideElevation");
        if(hideElevation == 0) return wrapped(...args);
        if(hideElevation == 1 && game.user.isGM) return wrapped(...args);
        return new PIXI.Sprite()
      }
}