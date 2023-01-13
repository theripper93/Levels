export class SettingsHandler{
    constructor(){
        this.settingsKeys = ["tokenElevScale", "tokenElevScaleMultiSett", "fogHiding", "revealTokenInFog", "lockElevation", "hideElevation", "preciseTokenVisibility", "exactTokenVisibility", "enableTooltips"];
    }

    get(key){
        if(this[`_${key}`] === undefined){
            this[`_${key}`] = game.settings.get(CONFIG.Levels.MODULE_ID, key);
        }
        return this[`_${key}`];
    }

    cacheSettings(){
        this.settingsKeys.forEach(key => {
            this[`_${key}`] = game.settings.get(CONFIG.Levels.MODULE_ID, key);
        }
        );
        CONFIG.Levels.handlers.RefreshHandler.refreshAll()
    }
}