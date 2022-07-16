export class UIHandler{

    static UIVisible(placeable){
        if(!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled || CONFIG.Levels.currentToken) return;
        const { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(placeable.document)
        if(rangeBottom == -Infinity && rangeTop == Infinity) return;
        placeable.visible = placeable instanceof Tile ? CONFIG.Levels.handlers.UIHandler.inUIRangeTile(rangeBottom, rangeTop, placeable) : CONFIG.Levels.handlers.UIHandler.inUIRange(rangeBottom, rangeTop)
    }

    static inUIRange(bottom, top){
        const UIBottom = parseFloat(CONFIG.Levels.UI.range[0]);
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        return bottom >= UIBottom && top <= UITop;
    }

    static inUIRangeTile(bottom, top, tile){
        const overhead = tile.document.overhead;
        const UIBottom = parseFloat(CONFIG.Levels.UI.range[0]);
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        if(!overhead) {
            return UIBottom >= (canvas?.scene?.flags?.levels?.backgroundElevation ?? 0)
        }
        if(CONFIG.Levels.UI.roofEnabled){
            if(top == Infinity && bottom <= UITop+1 && bottom >= UIBottom){
                return true;
            }
        }
        return bottom >= UIBottom && top <= UITop;
    }

}