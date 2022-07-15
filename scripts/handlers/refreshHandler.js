export class RefreshHandler{

    static refreshPlaceables(){
        canvas.tiles.placeables.forEach(t => t.refresh());
    }

}