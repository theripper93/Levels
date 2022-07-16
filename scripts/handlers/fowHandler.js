export class FoWHandler {
  constructor() {
    this.advancedFogContainer = new PIXI.Container();
    this.advancedFogContainer.name = "advancedFogContainer";
    this.revealTokenContainer = new PIXI.Container();
    this.revealTokenContainer.name = "revealTokenContainer";
    this.tiles = {};
    this.bubbles = {};
    this.setHooks();
  }

  setHooks(){
    Hooks.on("canvasReady", ()=>{
      canvas.effects.visibility.explored.addChild(this.advancedFogContainer);
      canvas.effects.visibility.explored.addChild(this.revealTokenContainer);
      this.init();
    })
    Hooks.on("deleteTile", (tile)=>{
      this.removeTileFogMask(tile.id);
    })
    Hooks.on("createTile", (tile)=>{
      this.createTileFogMask(tile.object);
    })
    Hooks.on("updateTile", (tile)=>{
      this.createTileFogMask(tile.object);
    })
    Hooks.on("deleteToken", (token)=>{
      this.removeBubble(token.id);
    })
    Hooks.on("createToken", (token)=>{
      this.createTokenBubble(token.object);
    })
    Hooks.on("updateToken", (token, updates)=>{
      this.createTokenBubble(token.object);
    })

  }

  init() {
    this.advancedFogContainer.removeChildren();
    this.revealTokenContainer.removeChildren();
    this.tiles = {};
    this.bubbles = {};
  }

  createTokenBubble(token) {
    if(!game.settings.get(CONFIG.Levels.MODULE_ID, "revealTokenInFog")) return;
    if(this.bubbles[token.id]){
        this.revealTokenContainer.removeChild(this.bubbles[token.id]);
        this.bubbles[token.id].destroy();
        delete this.bubbles[token.id];
    }
    const bubble = new PIXI.Graphics();
    bubble.beginFill(0xffffff);
    bubble.drawCircle(0, 0, (Math.max(token.w, token.h)/2)*Math.SQRT2);
    bubble.endFill();
    bubble.token = token;
    Object.defineProperty(bubble, "visible", {
      get: () => {
        return token.visible;
      }
    });
    this.updateBubblePosition(bubble);
    this.revealTokenContainer.addChild(bubble);
    this.bubbles[token.id] = bubble;
    return bubble;
  }

  lazyCreateBubble(token) {
    if(!this.bubbles[token.id]){
      this.createTokenBubble(token);
    }
    if(this.bubbles[token.id]){
      this.updateBubblePosition(this.bubbles[token.id]);
    }
  }

  updateBubblePosition(bubble, position) {
    position ??= bubble.token.center;
    bubble.position.set(position.x, position.y);
  }

  removeBubble(tokenId) {
    if(!this.bubbles[tokenId]) return;
    this.revealTokenContainer.removeChild(this.bubbles[tokenId]);
    this.bubbles[tokenId].destroy();
    delete this.bubbles[tokenId];
  }

  createTileFogMask(tile) {
    if(this.tiles[tile.id]){
        this.advancedFogContainer.removeChild(this.tiles[tile.id]);
        this.tiles[tile.id].destroy();
        delete this.tiles[tile.id];
    }
    if(!tile?.mesh?.texture) return;
    const sprite = PIXI.Sprite.from(tile.mesh.texture);
    sprite.alpha = 1;
    sprite.tint = 0x000000;
    sprite.width = tile.document.width;
    sprite.height = tile.document.height;
    sprite.position = tile.position;
    sprite.angle = tile.mesh.angle;
    sprite.tile = tile;
    Object.defineProperty(sprite, "visible", {
      get: () => {
        if(!CONFIG.Levels.currentToken) return false;
        if(tile.document.flags?.levels?.noFogHide) return false;
        if(!game.settings.get(CONFIG.Levels.MODULE_ID, "fogHiding")) return false;
        const bottom = tile.document.flags?.levels?.rangeBottom ?? -Infinity;
        const top = tile.document.flags?.levels?.rangeTop ?? Infinity;
        if(bottom == -Infinity && top == Infinity) return false;
        const losH = CONFIG.Levels.currentToken.losHeight;
        if(losH < bottom || losH > top) return false;
        return tile.visible;
      }
    })
    this.tiles[tile.id] = sprite;
    this.advancedFogContainer.addChild(sprite);
    return sprite;
  }

  lazyCreateTileFogMask(tile) {
    if(!this.tiles[tile.id]){
      this.createTileFogMask(tile);
    }
  }

  removeTileFogMask(tileId) {
    if(!this.tiles[tileId]) return;
    this.advancedFogContainer.removeChild(this.tiles[tileId]);
    this.tiles[tileId].destroy();
    delete this.tiles[tileId];
  }
}