export class BackgroundHandler{
    static setupElevation(){
        Hooks.on("canvasInit", () => {
          PrimaryCanvasGroup.BACKGROUND_ELEVATION = (canvas?.scene?.flags?.levels?.backgroundElevation ?? 0)  
        });

        Hooks.on("canvasReady", ()=>{
          canvas.primary.background.elevation = PrimaryCanvasGroup.BACKGROUND_ELEVATION;
            Object.defineProperty(canvas.primary.background, "visible", {
              get: function () {
                if(this.texture == PIXI.Texture.EMPTY) return false;
                if(CONFIG.Levels?.UI?.rangeEnabled && !canvas.tokens.controlled.length){
                    return (parseFloat(CONFIG.Levels.UI.range[0]) ?? Infinity) >= this.elevation
                }
                if(CONFIG.Levels.currentToken || canvas.tokens.controlled.length){
                  return (CONFIG.Levels.currentToken ?? canvas.tokens.controlled[0]).losHeight >= this.elevation;
                }else{
                  return true;
                }
              }
            })
        })

        Hooks.on("updateScene", (scene, updates)=>{
            if(scene.id === canvas.scene?.id && updates.flags?.levels?.backgroundElevation !== undefined){
              canvas.draw();
            }
        })
    }
}