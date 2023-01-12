export class FoWHandler {
  constructor() {
    this.setHooks();
  }

  setHooks(){
    Hooks.on("drawCanvasVisibility", ()=>{
      this.init();
      canvas.effects.visibility.explored.addChild(this.advancedFogContainer);
      canvas.effects.visibility.explored.addChild(this.revealTokenContainer);
      Hooks.callAll("levelsAdvancedFogInit", this.advancedFogContainer);
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
    this.advancedFogContainer = new PIXI.Container();
    this.advancedFogContainer.name = "advancedFogContainer";
    this.revealTokenContainer = new PIXI.Container();
    this.revealTokenContainer.name = "revealTokenContainer";
    this.tiles = {};
    this.bubbles = {};
  }

  createTokenBubble(token) {
    if(!token) return;
    if(!CONFIG.Levels.settings.get("revealTokenInFog")) return;
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
    if(!tile?.document?.overhead) return false;
    if(this.tiles[tile.id]){
        this.advancedFogContainer.removeChild(this.tiles[tile.id]);
        try{
          this.tiles[tile.id].destroy();
        }
        catch(e){}
        delete this.tiles[tile.id];
    }
    if(!tile?.mesh?.texture) return;
    const sprite = CONFIG.Levels.helpers.cloneTileMesh(tile);
    Object.defineProperty(sprite, "visible", {
      get: () => {
        if(!CONFIG.Levels.currentToken) return false;
        if(!tile.document.overhead) return false;
        if(tile.document.flags?.levels?.noFogHide) return false;
        if(!CONFIG.Levels.settings.get("fogHiding")) return false;
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
