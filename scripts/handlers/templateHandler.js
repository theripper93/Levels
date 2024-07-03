export class TemplateHandler{
    static getTemplateData(wipeStore = true){
    const cToken = canvas.tokens.controlled[0] || _token;
      const handMode =
        typeof LevelsVolumetricTemplates !== "undefined" &&
        LevelsVolumetricTemplates.tools.handMode &&
        cToken
          ? Math.round(
              (cToken.losHeight - cToken?.document?.elevation) * 0.8
            )
          : 0;
      let elevation;
      let special;
      if (CONFIG.Levels.UI.nextTemplateHeight !== undefined) {
        elevation = CONFIG.Levels.UI.nextTemplateHeight;
        special = CONFIG.Levels.UI.nextTemplateSpecial;
        if(wipeStore){
          CONFIG.Levels.UI.nextTemplateHeight = undefined;
          CONFIG.Levels.UI.nextTemplateSpecial = undefined;
          CONFIG.Levels.UI.templateElevation = false;
          CONFIG.Levels.UI._levelsTemplateTool.active = false;
          $("body")
            .find(`li[data-tool="setTemplateElevation"]`)
            .removeClass("active");
        }
      } else {
        elevation = cToken?.document?.elevation + handMode || 0;
      }
      return { elevation, special };
      }
}
