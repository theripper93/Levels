export class TokenHandler{
  
  static refreshTooltip(token) {
    const hideElevation = CONFIG.Levels.settings.get("hideElevation");
    if (hideElevation == 0) return;
    if(hideElevation == 1 && game.user.isGM) return;
    token.tooltip.text = "";
  }

    static setScale(token, renderFlags){
      if(!CONFIG.Levels.settings.get("tokenElevScale") || !CONFIG.Levels.currentToken || token == CONFIG.Levels.currentToken) return;
      
      const scaleMultiplier = CONFIG.Levels.settings.get("tokenElevScaleMultiSett");
      const elevationDiff = Math.abs(token.document.elevation - CONFIG.Levels.currentToken.document.elevation) / 8;
      
      //if(elevationDiff === 0) return;
      
      const scaleFactor = elevationDiff == 0 ? 1 : Math.min(scaleMultiplier / elevationDiff, 1);
      if(renderFlags.refreshMesh) token.mesh.originalScale = null; 
      if (!token.mesh.originalScale) {
        token.mesh.originalScale = {x: token.mesh.scale.x, y: token.mesh.scale.y};
      }

      token.mesh.scale.x=token.mesh.originalScale.x*scaleFactor;
      token.mesh.scale.y=token.mesh.originalScale.y*scaleFactor;

  }

}