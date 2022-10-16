export class TileHandler{
    static isTileVisible(tile){
        const currentToken = CONFIG.Levels.currentToken;

        CONFIG.Levels.FoWHandler.lazyCreateTileFogMask(tile);
        if(!currentToken) return true;

        const tokenElevation = currentToken.document.elevation;
        const tokenLOS = currentToken.losHeight;
        const bgElevation = canvas?.scene?.flags?.levels?.backgroundElevation ?? 0;

        //Handle background tiles
        if(!tile.document.overhead){
            return tokenLOS >= bgElevation
        }

        if(!tile.document.flags.levels) return true;

        const {rangeTop, rangeBottom, showIfAbove, showAboveRange, isBasement, noFogHide} = getFlags(tile.document)
        //Not a levels tile, hide if token is under background
        if(rangeTop === Infinity && rangeBottom === -Infinity || !tile.document.overhead) return tokenLOS >= bgElevation;

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

    static _identifyOccludedTiles(tokens) {
        const occluded = new Set();
        const controlled = tokens.filter(t => t.controlled);
        for ( const token of (controlled.length ? controlled : tokens) ) {
          const tiles = canvas.tiles.quadtree.getObjects(token.bounds);
          for ( const tile of tiles ) {
            if ( occluded.has(tile) ) continue;  // Don't bother re-testing a tile
            if ( tile.testOcclusion(token, {corners: tile.isRoof}) ) occluded.add(tile);
          }
        }
        return occluded;
      }
}

function getFlags(document){

    const flags = {}
    for( const [k,v] of Object.entries(document.flags.levels)){
        flags[k] = v ?? defaultValues[k];
    }

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