

export function setupWarnings() {
    Hooks.on("controlToken", (token, controlled) => {
        if (!controlled || !CONFIG.Levels?.UI?.rendered) return;
        
        const {bottom, top} = CONFIG.Levels.UI.currentRange;
        const tokenElevation = token.document.elevation;
        const losHeight = token.losHeight;

        if (tokenElevation < bottom || losHeight >= top) {
            ui.notifications.error(game.i18n.localize("levels.err.tokenOOB").replace("%n", token.document.name), {permanent: true});
        }
    });

    //MODULE INCOMPATIBILITY

    if(!game.user.isGM) return;

    if (game.modules.get("elevatedvision")?.active && game.settings.get("elevatedvision", "auto-change-elevation")) {
        ui.notifications.warn("levels.err.elevatedvision", {permanent: true, localize: true});
        game.settings.set("elevatedvision", "auto-change-elevation", false);
    }


}