export class TemplateHandler{
    static isVisible(wrapped, ...args){
        const result = wrapped(...args);
        return result;
        const currentElevation = CONFIG.Levels.currentToken?.losHeight
        const templateElevation = this.document.flags.levels?.elevation;
        if(currentElevation === undefined || templateElevation === undefined || !CONFIG.Levels.currentToken) return result;
        const origin = {
            x: CONFIG.Levels.currentToken.x,
            y: CONFIG.Levels.currentToken.y,
            z: currentElevation
        }
        const target = {
            x: this.center.x,
            y: this.center.y,
            z: templateElevation
        }
        const isVisible = !CONFIG.Levels.handlers.SightHandler.testCollision(origin,target);
        return result && isVisible;
    }

    static async drawTooltip(wrapped, ...args){
        await wrapped(...args);
        if(this.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation")===0) return this;
        this.tooltip = this.addChild(_templateDrawTooltip(this));
      
        function _templateDrawTooltip(template) {
          // Create the tooltip Text
      
          const tipFlag = template.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation");
          let tipN;
          if (tipFlag === undefined) {
            if (CONFIG.Levels.UI.nextTemplateHeight !== undefined) {
              tipN = CONFIG.Levels.UI.nextTemplateHeight;
            } else {
              const cToken =
                canvas.tokens.controlled[0] || _token;
              tipN = cToken?.document?.elevation ?? 0;
            }
          } else {
            tipN = tipFlag;
          }
          let units = canvas.scene.grid.units;
          const tip = tipN > 0 ? `+${tipN} ${units}` : `${tipN} ${units}`;
          const style = CONFIG.canvasTextStyle.clone();
          style.fontSize = Math.max(
            Math.round(canvas.dimensions.size * 0.36 * 12) / 12,
            36
          );
          const text = new PreciseText(tip, style);
          text.anchor.set(0.5, 2);
          return text;
        }
        return this;
    }

    static _refreshRulerText() {
        let special = this.document.flags.levels?.special// || _levels?.nextTemplateSpecial
        let text;
        let u = canvas.scene.grid.units;
        if ( this.document.t === "rect" ) {
          let d = canvas.dimensions;
          let dx = Math.round(this.ray.dx) * (d.distance / d.size);
          let dy = Math.round(this.ray.dy) * (d.distance / d.size);
          let w = Math.round(dx * 10) / 10;
          let h = Math.round(dy * 10) / 10;
          text = special ? `${w}${u} x ${h}${u} x ${special}${u}` : `${w}${u} x ${h}${u}`;
        } else {
          let d = Math.round(this.document.distance * 10) / 10;
          text = special ? `${d}${u} x ${special}${u}` : `${d}${u}`;
        }
        this.ruler.text = text;
        this.ruler.position.set(this.ray.dx + 10, this.ray.dy + 5);
      }

    static getTemplateData(){
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
        CONFIG.Levels.UI.nextTemplateHeight = undefined;
        CONFIG.Levels.UI.nextTemplateSpecial = undefined;
        CONFIG.Levels.UI.templateElevation = false;
        CONFIG.Levels.UI._levelsTemplateTool.active = false;
        $("body")
          .find(`li[data-tool="setTemplateElevation"]`)
          .removeClass("active");
      } else {
        elevation = cToken?.document?.elevation + handMode || 0;
      }
      return { elevation, special };
      }
}