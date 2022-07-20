export class LightMaskingHandler{
    constructor(){
        this.spriteContainer = {};
        this.elevationTextureContainer = {};
        this.setHooks();
    }

    static injectShaders(wrapped, ...args){
        if(this.fragmentShader.includes("uniform sampler2D levels_elevationTextures")) return wrapped(...args);
        this.fragmentShader = this.fragmentShader.replace(
            "depth = smoothstep(0.0, 1.0, vDepth);",
            "depth = smoothstep(0.0, 1.0, vDepth);" + END_FRAGMENT.get()
        )
        this.fragmentShader = this.fragmentShader.replace(
            "uniform bool useSampler;",
            UNIFORMS.get() + "uniform bool useSampler;"
        )
        const shader = wrapped(...args);
        for(let i = 0; i < TEX_COUNT; i++){
            shader.uniforms[`levels_elevationTextures${i}`] = PIXI.Texture.BLANK;
        }
        shader.uniforms.levels_scale = [0,0];
        shader.uniforms.levels_offset = [0,0];
        return shader;
    }

    setHooks(){
        Hooks.on("canvasReady", ()=>{
            this.init();
        })
        Hooks.on("updateTile", (tile, updates)=>{
            this.updateTile(tile, updates);
        })
        Hooks.on("createTile", (tile)=>{
            this.createTile(tile);
        })
        Hooks.on("deleteTile", (tile)=>{
            this.deleteTile(tile);
        })
        Hooks.on("refreshAmbientLight", (light)=>{
            this.updateLightUniforms(light);
        })
        Hooks.on("updateLight", (light)=>{
            this.updateLightUniforms(light);
        })
        Hooks.on("levelsPerspectiveChanged", () => {
            this.updateUniforms();
        })
    }

    init(){
        this.clear();
        this.initializeClones();
        this.initializeContainers();
        this.updateUniforms();
    }

    initializeClones(){
        for(const tile of canvas.tiles.placeables){
            this.elevationTextureContainer[`${tile.document.elevation}`] = null;
            this.spriteContainer[tile.id] = CONFIG.Levels.helpers.cloneTileMesh(tile);
        }
    }

    initializeContainers(){
        for(const elevation of Object.keys(this.elevationTextureContainer)){
            this.refreshContainer(elevation);
        }
    }

    refreshContainer(elevation){
        if(!this.elevationTextureContainer[`${elevation}`]) this.elevationTextureContainer[`${elevation}`] = new elevationTexture(elevation, this.spriteContainer);
        this.elevationTextureContainer[`${elevation}`].initialize();
    }

    createTile(tile){
        this.spriteContainer[tile.id] = CONFIG.Levels.helpers.cloneTileMesh(tile);
        this.refreshContainer(tile.document.elevation);
    }

    deleteTile(tile){
        this.spriteContainer[tile.id].destroy();
        delete this.spriteContainer[tile.id];
        this.refreshContainer(tile.elevation);
    }

    updateTile(tile, updates){
        let needsUpdate = false;
        const elevation = tile.elevation;
        const oldElevation = this.getElevation(tile.id);
        if(elevation !== oldElevation) needsUpdate = true;
        if("x" in updates || "y" in updates || "width" in updates || "height" in updates || "texture" in updates || "hidden" in updates){
            needsUpdate = true;
        }
        if(needsUpdate) this.processTileUpdate(tile.object, oldElevation, elevation)
    }

    processTileUpdate(tile, oldElevation, elevation){
        this.spriteContainer[tile.id]?.destroy();
        delete this.spriteContainer[tile.id];
        this.spriteContainer[tile.id] = CONFIG.Levels.helpers.cloneTileMesh(tile);
        if(oldElevation !== elevation) return this.refreshContainer(elevation);
        this.refreshContainer(elevation);
        this.refreshContainer(oldElevation);
    }

    getElevation(tileId){
        for(const [k,v] of Object.entries(this.elevationTextureContainer)){
            if(v.tileIds.includes(tileId)) return parseFloat(k);
        }
        return null;
    }

    updateUniforms(){
        this._needsUpdate = true;
        setTimeout(()=>{
            if(!this._needsUpdate) return;
            for(let light of canvas.lighting.placeables){
                this.updateLightUniforms(light);
            }
            this._needsUpdate = false;
        }, 100);
    }

    updateLightUniforms(light){
        const elevation = light.document.flags.levels?.rangeTop ?? light.losHeight ?? 0;
        this.setUniforms(elevation, light.source.coloration.uniforms, light);
        this.setUniforms(elevation, light.source.illumination.uniforms, light)
        this.setUniforms(elevation, light.source.background.uniforms, light)
    }

    setUniforms(elevation, uniforms, light){
        const texArray = Object.values(this.elevationTextureContainer).filter(c => 
            c.elevation >= elevation &&
            c.elevation <= (CONFIG.Levels.currentToken?.losHeight ?? Infinity)
        ).map(tex=>tex.texture);
        for(let i = 0; i < TEX_COUNT; i++){
            uniforms[`levels_elevationTextures${i}`] = texArray[i] ?? PIXI.Texture.BLANK;
        }
        const sceneWidth = canvas.dimensions.width;
        const sceneHeight = canvas.dimensions.height;
        const lightRect = light.source.radius*2;
        uniforms.levels_scale = [lightRect/sceneWidth, lightRect/sceneHeight]//[sceneWidth/lightRect, sceneHeight/lightRect];
        uniforms.levels_offset = [
            (light.center.x - light.source.radius)/canvas.dimensions.width,
            (light.center.y - light.source.radius)/canvas.dimensions.height
        ];
    }

    clear(){
        for(const key in this.spriteContainer){
            this.spriteContainer[key].destroy();
            delete this.spriteContainer[key];
        }
        for(const key in this.elevationTextureContainer){
            this.elevationTextureContainer[key].destroy();
            delete this.elevationTextureContainer[key];
        }
    }
}

class elevationTexture{
    constructor(elevation, clones){
        this.elevation = parseFloat(elevation);
        this.texture = PIXI.RenderTexture.create({width: canvas.dimensions.width, height: canvas.dimensions.height, resolution: 0.1});
        this.clones = clones;
    }

    get tileIds(){
        return Object.values(this.clones).filter(c => c.tile.document.elevation === this.elevation).map(c => c.tile.id);
    }

    initialize(){
        this._needsUpdate = true;
        setTimeout(()=>{
            if(!this._needsUpdate) return;
            const container = new PIXI.Container();
            for(const clone of Object.values(this.clones)){
                const tileElevation = clone.tile.document.elevation;
                if(tileElevation == this.elevation) container.addChild(clone);
            }
            canvas.app.renderer.render(container, {renderTexture: this.texture});
            this._needsUpdate = false;
            this._debugSprite = PIXI.Sprite.from(this.texture);
        }, 100);
    }

    destroy(){
        this.texture.destroy();
    }
}

const TEX_COUNT = 8;

const UNIFORMS = {
    get: () => {
        let shaderChunk = `uniform vec2 levels_scale;
        uniform vec2 levels_offset;
        `
        for(let i = 0; i < TEX_COUNT; i++){
            shaderChunk += `uniform sampler2D levels_elevationTextures${i};\n`
        }
        return shaderChunk;
    }
}

const END_FRAGMENT = {
    get: () => {
        let shaderChunk = `
        vec2 vUvsLevels = vec2(vUvs.x * levels_scale.x + levels_offset.x, vUvs.y * levels_scale.y + levels_offset.y);
        `
        for(let i = 0; i < TEX_COUNT; i++){
            shaderChunk += `
            if(depth > 0.0){
                depth *= (1.0 - texture2D(levels_elevationTextures${i}, vUvsLevels).a);
            }\n
            `
        }
        return shaderChunk;
    }
}

