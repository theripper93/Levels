export class UIHandler {

    static isVisibleWrapper(wrapped, ...args) {
        const result = wrapped(...args);
        return result && UIHandler.UIVisible(this);
    }

    static UIVisible(placeable) {
        const isPreview = placeable.document?.id == null;
        if (isPreview) {
            placeable.visible = true;
            if (CONFIG.Levels.UI?.rangeEnabled && !placeable.document?.flags?.levels) {
                const uiRange = CONFIG.Levels.UI.getRange();
                placeable.document.flags.levels = {
                    rangeTop: uiRange.top,
                };
                placeable.document.elevation = uiRange.bottom;
            }
            return true;
        }
        if (!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled) return true;
        const isTokenSelected = canvas?.tokens?.controlled[0] || CONFIG.Levels.currentToken;
        const isVision = canvas.effects.visionSources.size;
        if (isTokenSelected && isVision) return true;
        if (isTokenSelected && !isVision && !(placeable instanceof Token)) return true;
        if ((canvas?.tokens?.controlled[0] || CONFIG.Levels.currentToken) && canvas.effects.visionSources.size) return true;
        let { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(placeable.document);
        rangeBottom = placeable.document.elevation ?? rangeBottom;
        if (rangeBottom == -Infinity && rangeTop == Infinity) return true;
        if (placeable instanceof Token) {
            rangeBottom = placeable.losHeight;
            rangeTop = placeable.losHeight;
        }
        const visible = placeable instanceof Tile ? CONFIG.Levels.handlers.UIHandler.inUIRangeTile(rangeBottom, rangeTop, placeable) : CONFIG.Levels.handlers.UIHandler.inUIRange(rangeBottom, rangeTop);
        placeable.visible = visible;
        return visible;
    }

    static tokenUIWrapperIsVisible(wrapped, ...args) {
        if (!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled) return wrapped(...args);
        const isTokenSelected = canvas?.tokens?.controlled[0] || CONFIG.Levels.currentToken;
        const isVision = canvas.effects.visionSources.size;
        if ((isTokenSelected && !isVision) || !isTokenSelected) {
            const wrappedResult = wrapped(...args);
            return wrappedResult && CONFIG.Levels.handlers.UIHandler.inUIRange(this.losHeight, this.losHeight);
        } else {
            return wrapped(...args);
        }
    }

    static emitsLightUI(light) {
        if (!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled || CONFIG.Levels.currentToken) return true;
        const { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(light.document);
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        const UIBottom = parseFloat(CONFIG.Levels.UI.range[0]);
        return rangeTop <= UITop && rangeBottom >= UIBottom;
    }

    static emitsLightUIToken(token) {
        if (!game.user.isGM || !CONFIG.Levels.UI?.rangeEnabled || CONFIG.Levels.currentToken) return true;
        const { rangeBottom, rangeTop } = CONFIG.Levels.helpers.getRangeForDocument(token.document);
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        const UIBottom = parseFloat(CONFIG.Levels.UI.range[0]);
        return rangeTop < UITop && rangeBottom >= UIBottom;
    }

    static inUIRange(bottom, top) {
        const UIBottom = parseFloat(CONFIG.Levels.UI.range[0]);
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        return bottom >= UIBottom && top <= UITop;
    }

    static inUIRangeTile(bottom, top, tile) {
        const UIBottom = parseFloat(CONFIG.Levels.UI.range[0]);
        const UITop = parseFloat(CONFIG.Levels.UI.range[1]);
        if (CONFIG.Levels.UI.roofEnabled) {
            if (top == Infinity && bottom <= UITop + 1 && bottom >= UIBottom) {
                return true;
            }
        }
        //return top <= UITop; //bottom >= UIBottom && top <= UITop;
        return bottom < UITop;
    }
}