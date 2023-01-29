export class TokenHandler{
    static _drawTooltip(wrapped,...args) {
        const hideElevation = CONFIG.Levels.settings.get("hideElevation");
        if(hideElevation == 0) return wrapped(...args);
        if(hideElevation == 1 && game.user.isGM) return wrapped(...args);
        return new PIXI.Sprite()
    }

    static setScale(token){
      if(!CONFIG.Levels.settings.get("tokenElevScale") || !CONFIG.Levels.currentToken || token == CONFIG.Levels.currentToken) return;
      
      const scaleMultiplier = CONFIG.Levels.settings.get("tokenElevScaleMultiSett");
      const elevationDiff = Math.abs(token.document.elevation - CONFIG.Levels.currentToken.document.elevation) / 8;
      
      if(elevationDiff === 0) return;
      
      const scaleFactor = Math.min(scaleMultiplier / elevationDiff, 1);
      token.mesh.scale.x*=scaleFactor;
      token.mesh.scale.y*=scaleFactor;

  }

}