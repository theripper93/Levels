export class RefreshHandler{

    static refreshPlaceables(){
        this.refresh(canvas.tiles);
        this.refresh(canvas.drawings);
    }

    static refreshAll(){
        for(const layer of Object.values(canvas.layers)){
            if(layer.placeables) this.refresh(layer);
        }
        setTimeout(() => {
            this.refresh(canvas.notes);
        },100)
    }

    static restoreVisAll(){
        for(const layer of Object.values(canvas.layers)){
            if(layer.placeables) layer.placeables.forEach(p => p.visible = true);
        }
    }

    static refresh(layer){
        layer.placeables.forEach(p => p.refresh());
    }

}