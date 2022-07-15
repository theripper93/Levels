export class RefreshHandler{

    static refreshPlaceables(){
        this.refresh(canvas.tiles);
        this.refresh(canvas.drawings);
    }

    static refresh(layer){
        layer.placeables.forEach(p => p.refresh());
    }

}