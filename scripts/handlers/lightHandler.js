export class LightHandler{
    static isLightVisibleWrapper(wrapped, ...args){
        const result = wrapped(...args);
        if(!CONFIG.Levels.handlers.UIHandler.emitsLightUI(this)) return false;
        if(game.Levels3DPreview?._active) return result;
        const rangeBottom = this instanceof Token ? this.document.elevation : this.document.flags.levels?.rangeBottom ?? -Infinity;
        const rangeTop = this instanceof Token ? this.losHeight : this.document.flags.levels?.rangeTop ?? Infinity;
        const currentElevation = CONFIG.Levels.currentToken?.losHeight
        if(currentElevation === undefined) return result;
        const underBackground = currentElevation >= canvas.primary.background.elevation && rangeTop < canvas.primary.background.elevation;
        if(underBackground) return false;
        let isLightVisible = false;
        if ((canvas.scene.flags.levels?.lightMasking ?? true)) {
            if (this instanceof Token) isLightVisible = this.visible || rangeBottom <= currentElevation;
            else isLightVisible = rangeBottom <= currentElevation;
        }else{
            isLightVisible = rangeBottom <= currentElevation && currentElevation <= rangeTop;
        }
        return result && isLightVisible;
    }
}