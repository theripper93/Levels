export class BasicHandler{
    static isPlaceableVisible(placeable){

        if(!placeable.document.flags.levels) return true;
        const currentToken = CONFIG.Levels.currentToken;
        if(!currentToken) return true;
        const tokenElevation = currentToken.document.elevation;
        const tokenLOS = currentToken.losHeight;

        const {rangeBottom, rangeTop} = getFlags(placeable.document);

        if(tokenElevation > rangeTop || tokenElevation < rangeBottom) return false;

        return true;
    }
}

function getFlags(document){
    return {
        rangeTop: document.flags?.levels?.rangeTop ?? Infinity,
        rangeBottom: document.flags?.levels?.rangeBottom ?? -Infinity,
    }
}