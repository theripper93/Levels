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

export function getRangeForDocument(document){
  if(document instanceof WallDocument){
    return {
      rangeBottom: document.flags?.["wall-height"]?.bottom ?? -Infinity,
      rangeTop: document.flags?.["wall-height"]?.top ?? Infinity
    }
  }else if(document instanceof TokenDocument){
    return {
      rangeBottom: document.elevation,
      rangeTop: document.elevation
    }
  }
  const rangeBottom = document.flags?.levels?.rangeBottom ?? -Infinity;
  const rangeTop = document.flags?.levels?.rangeTop ?? Infinity;
  return { rangeBottom, rangeTop };
}

export function cloneTileMesh(tile){
  if(!tile.mesh) {
    const sprite = new PIXI.Sprite();
    sprite.tile = tile;
    return sprite;
  };
  const sprite = PIXI.Sprite.from(tile.mesh.texture);
    sprite.alpha = 1;
    sprite.tint = 0x000000;
    sprite.width = tile.document.width;
    sprite.height = tile.document.height;
    sprite.position.set(tile.document.x, tile.document.y);
    sprite.angle = tile.mesh.angle;
    sprite.tile = tile;
    return sprite;
}