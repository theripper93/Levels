export class RefreshHandler{

    static refreshPlaceables(){
        this.refresh(canvas.tiles);
        this.refresh(canvas.drawings);
        CONFIG.Levels.LightMaskingHandler.updateUniforms()
    }

    static refreshAll(){
        for(const layer of Object.values(canvas.layers)){
            if(layer.placeables) this.refresh(layer);
        }
        setTimeout(() => {
            this.refresh(canvas.tokens);
        },30)
        setTimeout(() => {
            this.refresh(canvas.tokens);
        },100)
    }

    static refresh(layer){
        layer.placeables.forEach(p => p.refresh());
    }

}