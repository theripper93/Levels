export class LevelsAPI{

    /**
     * Test if a specified elevation is withing the range of a specified document, bounds are included.
     * @param {Document} document - the document to be tested
     * @param {Float} elevation - the elevation to test against
     * @returns {Boolean} returns wether the elevation is in the range or not
     **/

    static inRange(document, elevation){
        return CONFIG.Levels.helpers.inRange(document, elevation);
    }

    /**
     * Test if a token's losHeight is contained within the range of the placeable or document.
     * @param {Token} token - the token to test
     * @param {PlaceableObject|Document} placeableOrDocument - "sight" or "collision" (defaults to "sight")
     * @param {boolean} useElevation - if true, use the token's elevation, otherwise use the token's losHeight (the 'eye' elevation)
     * @returns {Boolean} returns wether the token is in the range or not
     **/

    static isTokenInRange(token, placeableOrDocument, useElevation = true){
        placeableOrDocument = placeableOrDocument?.document ?? placeableOrDocument;
        const elevation = useElevation ? token.document.elevation : token.losHeight;
        return CONFIG.Levels.helpers.inRange(placeableOrDocument, elevation);
    }

    /**
     * Perform a collision test between 2 TOKENS in 3D space
     * @param {Token} token1 - a token, the source of the check
     * @param {Token} token2 - a token, the target of the check
     * @param {String} type - "sight" or "collision" (defaults to "sight")
     * @returns {Object|Boolean} returns the collision point if a collision is detected, flase if it's not
     **/

    static checkCollision(token1, token2, type = "sight"){
        return CONFIG.Levels.handlers.SightHandler.checkCollision(token1, token2, type);
    }

    /**
     * Perform a collision test between 2 point in 3D space
     * @param {Object} p0 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
     * @param {Object} p1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
     * @param {String} type - "sight" or "collision" (defaults to "sight")
     * @returns {Object|Boolean} returns the collision point if a collision is detected, flase if it's not
     **/

    static testCollision(p0, p1, type = "sight"){
        return CONFIG.Levels.handlers.SightHandler.testCollision(p0, p1, type);
    }
}