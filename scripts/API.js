export class LevelsAPI {
    /**
     * Test if a specified elevation is withing the range of a specified document, bounds are included.
     * @param {Document} document - the document to be tested
     * @param {Float} elevation - the elevation to test against
     * @returns {Boolean} returns wether the elevation is in the range or not
     **/

    static inRange(document, elevation) {
        return CONFIG.Levels.helpers.inRange(document, elevation);
    }

    /**
     * Test if a token's losHeight is contained within the range of the placeable or document.
     * @param {Token} token - the token to test
     * @param {PlaceableObject|Document} placeableOrDocument - "sight" or "collision" (defaults to "sight")
     * @param {boolean} useElevation - if true, use the token's elevation, otherwise use the token's losHeight (the 'eye' elevation)
     * @returns {Boolean} returns wether the token is in the range or not
     **/

    static isTokenInRange(token, placeableOrDocument, useElevation = true) {
        if (placeableOrDocument.inTriggeringRange) return placeableOrDocument.inTriggeringRange(token);
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

    static checkCollision(token1, token2, type = "sight") {
        return CONFIG.Levels.handlers.SightHandler.checkCollision(token1, token2, type);
    }

    /**
     * Perform a collision test between 2 point in 3D space
     * @param {Object} p0 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
     * @param {Object} p1 - a point in 3d space {x:x,y:y,z:z} where z is the elevation
     * @param {String} type - "sight" or "collision" (defaults to "sight")
     * @returns {Object|Boolean} returns the collision point if a collision is detected, flase if it's not
     **/

    static testCollision(p0, p1, type = "sight") {
        return CONFIG.Levels.handlers.SightHandler.testCollision(p0, p1, type);
    }

    /**
     * Rescales grid-related distances of various types of documents in the canvas scene.
     * @async
     * @param {number} previousDistance - The previous grid distance value.
     * @param {number} [currentDistance=canvas.scene?.dimensions?.distance] - The current grid distance value.
     * @param {Scene} [scene=canvas.scene] - A Scene Document.
     * @returns {Promise<Array<{ documentClass: Function, changed: Array<Object> }>>} - A Promise that resolves to an array of objects, each containing information about the document class and any changes made to its embedded documents.
     */

    static async rescaleGridDistance(previousDistance, currentDistance = canvas.scene?.dimensions?.distance, scene = canvas.scene) {
        const documentClasses = [TileDocument, TokenDocument, AmbientLightDocument, AmbientSoundDocument, NoteDocument, WallDocument, MeasuredTemplateDocument];
        const rescaleFactor = currentDistance / previousDistance;
        const result = [];
        for (const dClass of documentClasses) {
            const documentCollection = Array.from(scene[dClass.collectionName]);
            const updates = [];
            for (const document of documentCollection) {
                const updateData = {
                    _id: document._id,
                    flags: {
                        levels: {},
                        "wall-height": {},
                    },
                };
                if (dClass === WallDocument) {
                    const rangeBottom = document.flags?.["wall-height"]?.bottom;
                    const rangeTop = document.flags?.["wall-height"]?.top;
                    if (!isNaN(rangeBottom)) updateData.flags["wall-height"].bottom = rangeBottom * rescaleFactor;
                    if (!isNaN(rangeTop)) updateData.flags["wall-height"].top = rangeTop * rescaleFactor;
                    delete updateData.flags.levels;
                } else if (dClass === MeasuredTemplateDocument) {
                } else if (dClass === TokenDocument) { 
                    const elevation = document.elevation;
                    if (!isNaN(elevation)) updateData.elevation = elevation * rescaleFactor;
                    delete updateData.flags;
                } else {
                    const rangeBottom = document.elevation;
                    const rangeTop = document.flags?.levels?.rangeTop;
                    if (!isNaN(rangeBottom)) updateData.elevation = rangeBottom * rescaleFactor;
                    if (!isNaN(rangeTop)) updateData.flags.levels.rangeTop = rangeTop * rescaleFactor;
                }
                updates.push(updateData);
            }
            const changed = await scene.updateEmbeddedDocuments(dClass.documentName, updates);
            result.push({ documentClass: dClass, changed: changed });
        }


        //update scene levels

        const sceneLevels = scene.getFlag("levels", "sceneLevels");
        const newSceneLevels = sceneLevels.map((level) => {
            return [
                parseFloat(level[0]) * rescaleFactor,
                parseFloat(level[1]) * rescaleFactor,
                level[2],
            ];
        });
        await scene.setFlag("levels", "sceneLevels", newSceneLevels);

        return result;
    }
}
