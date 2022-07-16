export class BackgroundHandler{
    static setupElevation(){
        Hooks.on("canvasReady", ()=>{
            canvas.primary.background.elevation = (canvas?.scene?.flags?.levels?.backgroundElevation ?? 0);
            Object.defineProperty(canvas.primary.background, "visible", {
              get: function () {
                if(CONFIG.Levels?.UI?.rangeEnabled){
                    return (parseFloat(CONFIG.Levels.UI.range[0]) ?? Infinity) >= this.elevation
                }
                if(CONFIG.Levels.currentToken){
                  return CONFIG.Levels.currentToken.losHeight >= this.elevation;
                }else{
                  return true;
                }
              }
            })
        })

        Hooks.on("updateScene", (scene)=>{
            if(scene.id === canvas.scene.id){
                canvas.primary.background.elevation = (canvas?.scene?.flags?.levels?.backgroundElevation ?? 0);
            }
        })
    }
}