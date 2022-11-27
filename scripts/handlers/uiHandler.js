export class UIHandler{

    static UIVisible(placeable){
        const isPreview = placeable.document?.id == null;
        if(isPreview) return true;
        if(!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled || canvas?.tokens?.controlled[0] || CONFIG.Levels.currentToken) return;
        let { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(placeable.document)
        rangeBottom = placeable.document.elevation ?? rangeBottom;
        if(rangeBottom == -Infinity && rangeTop == Infinity) return;
        if(placeable instanceof Token){
            rangeBottom = placeable.losHeight;
            rangeTop = placeable.losHeight;
        }
        placeable.visible = placeable instanceof Tile ? CONFIG.Levels.handlers.UIHandler.inUIRangeTile(rangeBottom, rangeTop, placeable) : CONFIG.Levels.handlers.UIHandler.inUIRange(rangeBottom, rangeTop)
    }

    static emitsLightUI(light){
        if(!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled || CONFIG.Levels.currentToken) return true;
        const { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(light.document)
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        return rangeTop <= UITop;
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
        return top <= UITop;//bottom >= UIBottom && top <= UITop;
    }

}