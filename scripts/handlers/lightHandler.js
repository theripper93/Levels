export class LightHandler{
    static isLightVisibleWrapper(wrapped, ...args){
        const result = wrapped(...args);
        const isActive = () => {
            const object = this.document ? this : this.object;
            const ui = CONFIG.Levels.handlers.UIHandler.emitsLightUI(object);
            if(ui !== undefined) return ui;
            const rangeBottom = object instanceof Token ? object.document.elevation : object.document.flags.levels?.rangeBottom ?? -Infinity;
            const rangeTop = object instanceof Token ? object.losHeight : object.document.flags.levels?.rangeTop ?? Infinity;
            const currentElevation = CONFIG.Levels.currentToken?.losHeight
            if(currentElevation === undefined) return true;
            const underBackground = currentElevation >= canvas.primary.background.elevation && rangeTop < canvas.primary.background.elevation;
            if(underBackground) return false;
            let isLightVisible = false;
            if((canvas.scene.flags.levels?.lightMasking ?? true)){
                isLightVisible = rangeBottom <= currentElevation;
            }else{
                isLightVisible = rangeBottom <= currentElevation && currentElevation <= rangeTop;
            }
            return isLightVisible;
        }
        
        return result || !isActive();
    }
}