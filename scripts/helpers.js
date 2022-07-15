export function adjustPolygonPoints(drawing){
  let globalCoords = [];
  if (drawing.document.shape.points.length != 0) {
    for (let i = 0; i < drawing.document.shape.points.length; i += 2) {
      globalCoords.push(
        drawing.document.shape.points[i] + (drawing.x),
        drawing.document.shape.points[i + 1] + (drawing.y)
      );
    }
  } else {
    globalCoords = [
      drawing.x,
      drawing.y,
      drawing.x + drawing.document.shape.width,
      drawing.y,
      drawing.x + drawing.document.shape.width,
      drawing.y + drawing.document.shape.height,
      drawing.x,
      drawing.y + drawing.document.shape.height,
    ];
  }
  return globalCoords;
}

export function inRange(document, elevation){
  const rangeBottom = document.flags?.levels?.rangeBottom ?? -Infinity;
  const rangeTop = document.flags?.levels?.rangeTop ?? Infinity;
  return elevation >= rangeBottom && elevation <= rangeTop;
}

async function _levelsTemplatedraw(wrapped,...args) {
  await wrapped(...args);
  if(this.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation")===0) return this;
  this.tooltip = this.addChild(_templateDrawTooltip(this));

  function _templateDrawTooltip(template) {
    // Create the tooltip Text

    const tipFlag = template.document.getFlag(CONFIG.Levels.MODULE_ID, "elevation");
    let tipN;
    if (tipFlag === undefined) {
      if (_levels?.nextTemplateHeight) {
        tipN = _levels.nextTemplateHeight;
      } else {
        const cToken =
          canvas.tokens.controlled[0] || _levels?.lastTokenForTemplate;
        tipN = cToken?.data?.elevation ?? 0;
      }
    } else {
      tipN = tipFlag;
    }
    let units = canvas.scene.data.gridUnits;
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

function _levelsRefreshRulerText() {
  let special = this.data.flags.levels?.special || _levels?.nextTemplateSpecial
  let text;
  let u = canvas.scene.data.gridUnits;
  if ( this.data.t === "rect" ) {
    let d = canvas.dimensions;
    let dx = Math.round(this.ray.dx) * (d.distance / d.size);
    let dy = Math.round(this.ray.dy) * (d.distance / d.size);
    let w = Math.round(dx * 10) / 10;
    let h = Math.round(dy * 10) / 10;
    text = special ? `${w}${u} x ${h}${u} x ${special}${u}` : `${w}${u} x ${h}${u}`;
  } else {
    let d = Math.round(this.data.distance * 10) / 10;
    text = special ? `${d}${u} x ${special}${u}` : `${d}${u}`;
  }
  this.hud.ruler.text = text;
  this.hud.ruler.position.set(this.ray.dx + 10, this.ray.dy + 5);
}

