export class TileHandler{
    static isTileVisible(tile) {
        const currentToken = CONFIG.Levels.currentToken;
        const bgElevation = canvas?.scene?.flags?.levels?.backgroundElevation ?? 0;

        CONFIG.Levels.FoWHandler.lazyCreateTileFogMask(tile);
        if (!currentToken) {
            canvas.primary.hoverFadeElevation = bgElevation;
            if (game.user.isGM && CONFIG.Levels?.UI?.rangeEnabled) {
                canvas.primary.hoverFadeElevation = CONFIG.Levels.UI.getRange().bottom
            }
            return true;
        }
        
        
        const tokenElevation = currentToken.document.elevation;
        const tokenLOS = currentToken.losHeight;

        canvas.primary.hoverFadeElevation = tokenElevation;

        if(tile.document.elevation === bgElevation){
            return tokenLOS >= bgElevation
        }

        
        if(!tile.document.flags.levels) return true;

        const {rangeTop, rangeBottom, showIfAbove, showAboveRange, isBasement, noFogHide} = getFlags(tile.document)
        //Not a levels tile, hide if token is under background
        if(rangeTop === Infinity && rangeBottom === -Infinity) return tokenLOS >= bgElevation;

        const inRange = tokenLOS < rangeTop && tokenLOS >= rangeBottom;

        //If tile is basement and token is out of it's range, it's not visible
        if(!inRange && isBasement) return false;

        //Non roof tiles under the token that don't have the show if above will be hidden
        if( tokenLOS < rangeBottom && !showIfAbove && rangeTop !== Infinity) return false;

        //Tiles set as show above will be hidden if the token exceeds the range
        if( tokenLOS < rangeBottom && showIfAbove && Math.abs(tokenElevation - rangeBottom) > showAboveRange) return false;

        //If it's a roof or show if above is enabled and the bottom of the tile is higher than the bg, and the token is under the bg, hide the tile
        if((showIfAbove || rangeTop === Infinity) && rangeBottom > bgElevation && tokenLOS < bgElevation) return false;

        return true;

    }
}

function getFlags(document){

    const flags = {}
    for( const [k,v] of Object.entries(document.flags.levels)){
        flags[k] = v ?? defaultValues[k];
    }

    flags.rangeBottom = document.elevation;

    return flags;

}

const defaultValues = {
    rangeTop: Infinity,
    rangeBottom: -Infinity,
    showIfAbove: false,
    showAboveRange: Infinity,
    isBasement: false,
    noFogHide: false,
    excludeFromChecker: false
}