export class LevelsFogManager extends FogManager {

    // MODIFICATIONS

    constructor(...args) {
        super(...args);
        Hooks.on("controlToken", (token, controlled) => {
            this.load();
        });
        Hooks.on("updateToken", (token, updates) => {
            if ("elevation" in updates) this.load();
        });
    }

    get scene() {
        const currentScene = game.scenes.viewed;
        const levels = currentScene.getFlag("levels", "sceneLevels") ?? [];
        if (levels.length < 2) return currentScene;
        const ranges = levels.map((l) => ({ bottom: parseFloat(l[0]), top: parseFloat(l[1]) }));
        const currentElevation = WallHeight.currentTokenElevation;
        const level = ranges.find((r) => r.bottom <= currentElevation && currentElevation <= r.top);
        if (!level) return currentScene;
        const levelScene = game.scenes.find((s) => s.name === currentScene.name + "[" + level.bottom + "-" + level.top + "]");
        return levelScene ?? currentScene;
    }

    static async setupMultilevelFogExploration(scene) {
        const levels = scene.getFlag("levels", "sceneLevels") ?? [];
        if (levels.length < 2) return ui.notifications.warn("This scene does not have multiple levels.");
        const ranges = levels.map((l) => ({bottom: parseFloat(l[0]), top: parseFloat(l[1])}));
        const sceneData = scene.toObject();
        for (const [key, value] of Object.entries(sceneData)) {
            if(Array.isArray(value)) sceneData[key] = [];
        }
        sceneData.fog.exploration = true;
        sceneData.active = false;
        sceneData.navigation = false;
        const created = [];
        for (const range of ranges) {
            const levelSceneData = foundry.utils.deepClone(sceneData);
            levelSceneData.name = sceneData.name + "[" + range.bottom + "-" + range.top + "]";
            const existing = game.scenes.getName(levelSceneData.name);
            if (existing) {
                ui.notifications.warn(`Scene ${levelSceneData.name} already exists.`);
                continue;
            }
            created.push(levelSceneData.name);
            await Scene.create(levelSceneData);
        }
        ui.notifications.info(`Created ${created.join(", ")} scenes.`);
    }
    
    async setupMultilevelFogExploration() {
        return this.constructor.setupMultilevelFogExploration(game.scenes.viewed);
    }

    commit() {
        const vision = canvas.visibility.vision;
        if (!vision?.children.length || !this.fogExploration || !this.tokenVision) return;
        if (!this.#explorationSprite?.texture.valid) return;

        // Get a staging texture or clear and render into the sprite if its texture is a RT
        // and render the entire fog container to it
        const dims = canvas.dimensions;
        const isRenderTex = this.#explorationSprite.texture instanceof PIXI.RenderTexture;
        const tex = isRenderTex
            ? this.#explorationSprite.texture
            : Canvas.getRenderTexture({
                  clearColor: [0, 0, 0, 1],
                  textureConfiguration: this.textureConfiguration,
              });
        this.#renderTransform.tx = -dims.sceneX;
        this.#renderTransform.ty = -dims.sceneY;

        // Render the currently revealed vision (preview excluded) to the texture
        vision.containmentFilter.enabled = canvas.visibility.needsContainment;
        vision.light.preview.visible = false;
        vision.light.mask.preview.visible = false;
        vision.sight.preview.visible = false;
        canvas.app.renderer.render(isRenderTex ? vision : this.#explorationSprite, {
            renderTexture: tex,
            clear: false,
            transform: this.#renderTransform,
        });
        vision.light.preview.visible = true;
        vision.light.mask.preview.visible = true;
        vision.sight.preview.visible = true;
        vision.containmentFilter.enabled = false;

        if (!isRenderTex) this.#explorationSprite.texture.destroy(true);
        this.#explorationSprite.texture = tex;
        this._updated = true;

        if (!this.exploration) {
            const fogExplorationCls = getDocumentClass("FogExploration");
            this.exploration = new fogExplorationCls({ scene: this.scene });
        }

        // Schedule saving the texture to the database
        if (this.#refreshCount > FogManager.COMMIT_THRESHOLD) {
            this.#debouncedSave();
            this.#refreshCount = 0;
        } else this.#refreshCount++;
    }

        /* -------------------------------------------- */

    /**
     * Load existing fog of war data from local storage and populate the initial exploration sprite
     * @returns {Promise<(PIXI.Texture|void)>}
     */
    async #load() {
        if (CONFIG.debug.fog.manager) console.debug("FogManager | Loading saved FogExploration for Scene.");

        this.#deactivate();

        // Take no further action if token vision is not enabled
        if (!this.tokenVision) return;

        // Load existing FOW exploration data or create a new placeholder
        const fogExplorationCls = /** @type {typeof FogExploration} */ getDocumentClass("FogExploration");
        this.exploration = await fogExplorationCls.load({ scene: this.scene });

        // Extract and assign the fog data image
        const assign = (tex, resolve) => {
            if (this.#explorationSprite?.texture === tex) return resolve(tex);
            this.#explorationSprite?.destroy(true);
            this.#explorationSprite = this._createExplorationObject(tex);
            canvas.visibility.resetExploration();
            canvas.perception.initialize();
            resolve(tex);
        };

        // Initialize the exploration sprite if no exploration data exists
        if (!this.exploration) {
            return await new Promise((resolve) => {
                assign(
                    Canvas.getRenderTexture({
                        clearColor: [0, 0, 0, 1],
                        textureConfiguration: this.textureConfiguration,
                    }),
                    resolve,
                );
            });
        }
        // Otherwise load the texture from the exploration data
        return await new Promise((resolve) => {
            let tex = this.exploration.getTexture();
            if (tex === null)
                assign(
                    Canvas.getRenderTexture({
                        clearColor: [0, 0, 0, 1],
                        textureConfiguration: this.textureConfiguration,
                    }),
                    resolve,
                );
            else if (tex.baseTexture.valid) assign(tex, resolve);
            else tex.on("update", (tex) => assign(tex, resolve));
        });
    }

    
    /* -------------------------------------------- */

    /**
     * Update the fog exploration document with provided data.
     * @param {object} updateData
     * @returns {Promise<void>}
     */
    async #updateFogExploration(updateData) {
        if (!game.scenes.has(this.scene?.id)) return;
        if (!this.exploration) return;
        if (CONFIG.debug.fog.manager) console.debug("FogManager | Saving fog of war progress into exploration document.");
        if (!this.exploration.id) {
            this.exploration.updateSource(updateData);
            this.exploration = await this.exploration.constructor.create(this.exploration.toJSON(), { loadFog: false });
        } else await this.exploration.update(updateData, { loadFog: false });
    }

    // MODIFICATIONS END - Below code is the original, kept due to protected methods

    /**
     * The FogExploration document which applies to this canvas view
     * @type {FogExploration|null}
     */
    exploration = null;

    /**
     * A status flag for whether the layer initialization workflow has succeeded
     * @type {boolean}
     * @private
     */
    #initialized = false;

    /**
     * Track whether we have pending fog updates which have not yet been saved to the database
     * @type {boolean}
     * @internal
     */
    _updated = false;

    /**
     * Texture extractor
     * @type {TextureExtractor}
     */
    get extractor() {
        return this.#extractor;
    }

    #extractor;

    /**
     * The fog refresh count.
     * If > to the refresh threshold, the fog texture is saved to database. It is then reinitialized to 0.
     * @type {number}
     */
    #refreshCount = 0;

    /**
     * Matrix used for fog rendering transformation.
     * @type {PIXI.Matrix}
     */
    #renderTransform = new PIXI.Matrix();

    /**
     * Define the number of fog refresh needed before the fog texture is extracted and pushed to the server.
     * @type {number}
     */
    static COMMIT_THRESHOLD = 70;

    /**
     * A debounced function to save fog of war exploration once a continuous stream of updates has concluded.
     * @type {Function}
     */
    #debouncedSave;

    /**
     * Handling of the concurrency for fog loading, saving and reset.
     * @type {Semaphore}
     */
    #queue = new foundry.utils.Semaphore();

    /* -------------------------------------------- */
    /*  Fog Manager Properties                      */
    /* -------------------------------------------- */

    /**
     * The exploration SpriteMesh which holds the fog exploration texture.
     * @type {SpriteMesh}
     */
    get sprite() {
        return this.#explorationSprite || (this.#explorationSprite = this._createExplorationObject());
    }

    #explorationSprite;

    /* -------------------------------------------- */

    /**
     * The configured options used for the saved fog-of-war texture.
     * @type {FogTextureConfiguration}
     */
    get textureConfiguration() {
        return canvas.visibility.textureConfiguration;
    }

    /* -------------------------------------------- */

    /**
     * Does the currently viewed Scene support Token field of vision?
     * @type {boolean}
     */
    get tokenVision() {
        return canvas.scene.tokenVision;
    }

    /* -------------------------------------------- */

    /**
     * Does the currently viewed Scene support fog of war exploration?
     * @type {boolean}
     */
    get fogExploration() {
        return canvas.scene.fog.exploration;
    }

    /* -------------------------------------------- */
    /*  Fog of War Management                       */
    /* -------------------------------------------- */

    /**
     * Create the exploration display object with or without a provided texture.
     * @param {PIXI.Texture|PIXI.RenderTexture} [tex] Optional exploration texture.
     * @returns {DisplayObject}
     * @internal
     */
    _createExplorationObject(tex) {
        return new SpriteMesh(
            tex ??
                Canvas.getRenderTexture({
                    clearColor: [0, 0, 0, 1],
                    textureConfiguration: this.textureConfiguration,
                }),
            FogSamplerShader,
        );
    }

    /* -------------------------------------------- */

    /**
     * Initialize fog of war - resetting it when switching scenes or re-drawing the canvas
     * @returns {Promise<void>}
     */
    async initialize() {
        this.#initialized = false;

        // Create a TextureExtractor instance
        if (this.#extractor === undefined) {
            try {
                this.#extractor = new TextureExtractor(canvas.app.renderer, {
                    callerName: "FogExtractor",
                    controlHash: true,
                    format: PIXI.FORMATS.RED,
                });
            } catch (e) {
                this.#extractor = null;
                console.error(e);
            }
        }
        this.#extractor?.reset();

        // Bind a debounced save handler
        this.#debouncedSave = foundry.utils.debounce(this.save.bind(this), 2000);

        // Load the initial fog texture
        await this.load();
        this.#initialized = true;
    }

    /* -------------------------------------------- */

    /**
     * Clear the fog and reinitialize properties (commit and save in non reset mode)
     * @returns {Promise<void>}
     */
    async clear() {
        // Save any pending exploration
        try {
            await this.save();
        } catch (e) {
            ui.notifications.error("Failed to save fog exploration");
            console.error(e);
        }

        // Deactivate current fog exploration
        this.#initialized = false;
        this.#deactivate();
    }

    /* -------------------------------------------- */

    /**
     * Once a new Fog of War location is explored, composite the explored container with the current staging sprite.
     * Once the number of refresh is > to the commit threshold, save the fog texture to the database.
     */


    /* -------------------------------------------- */

    /**
     * Load existing fog of war data from local storage and populate the initial exploration sprite
     * @returns {Promise<(PIXI.Texture|void)>}
     */
    async load() {
        return await this.#queue.add(this.#load.bind(this));
    }



    /* -------------------------------------------- */

    /**
     * Dispatch a request to reset the fog of war exploration status for all users within this Scene.
     * Once the server has deleted existing FogExploration documents, the _onReset handler will re-draw the canvas.
     */
    async reset() {
        if (CONFIG.debug.fog.manager) console.debug("FogManager | Resetting fog of war exploration for Scene.");
        game.socket.emit("resetFog", canvas.scene.id);
    }

    /* -------------------------------------------- */

    /**
     * Request a fog of war save operation.
     * Note: if a save operation is pending, we're waiting for its conclusion.
     */
    async save() {
        return await this.#queue.add(this.#save.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * Request a fog of war save operation.
     * Note: if a save operation is pending, we're waiting for its conclusion.
     */
    async #save() {
        if (!this._updated) return;
        this._updated = false;
        const exploration = this.exploration;
        if (CONFIG.debug.fog.manager) {
            console.debug("FogManager | Initiate non-blocking extraction of the fog of war progress.");
        }
        if (!this.#extractor) {
            console.error("FogManager | Browser does not support texture extraction.");
            return;
        }

        // Get compressed base64 image from the fog texture
        const base64Image = await this._extractBase64();

        // If the exploration changed, the fog was reloaded while the pixels were extracted
        if (this.exploration !== exploration) return;

        // Need to skip?
        if (!base64Image) {
            if (CONFIG.debug.fog.manager) console.debug("FogManager | Fog of war has not changed. Skipping db operation.");
            return;
        }

        // Update the fog exploration document
        const updateData = this._prepareFogUpdateData(base64Image);
        await this.#updateFogExploration(updateData);
    }

    /* -------------------------------------------- */

    /**
     * Extract fog data as a base64 string
     * @returns {Promise<string>}
     * @protected
     */
    async _extractBase64() {
        try {
            return this.#extractor.extract({
                texture: this.#explorationSprite.texture,
                compression: TextureExtractor.COMPRESSION_MODES.BASE64,
                type: "image/webp",
                quality: 0.8,
                debug: CONFIG.debug.fog.extractor,
            });
        } catch (err) {
            // FIXME this is needed because for some reason .extract() may throw a boolean false instead of an Error
            throw new Error("Fog of War base64 extraction failed");
        }
    }

    /* -------------------------------------------- */

    /**
     * Prepare the data that will be used to update the FogExploration document.
     * @param {string} base64Image              The extracted base64 image data
     * @returns {Partial<FogExplorationData>}   Exploration data to update
     * @protected
     */
    _prepareFogUpdateData(base64Image) {
        return { explored: base64Image, timestamp: Date.now() };
    }

    /* -------------------------------------------- */

    /**
     * Deactivate fog of war.
     * Clear all shared containers by unlinking them from their parent.
     * Destroy all stored textures and graphics.
     */
    #deactivate() {
        // Remove the current exploration document
        this.exploration = null;
        this.#extractor?.reset();

        // Destroy current exploration texture and provide a new one with transparency
        if (this.#explorationSprite && !this.#explorationSprite.destroyed) this.#explorationSprite.destroy(true);
        this.#explorationSprite = undefined;

        this._updated = false;
        this.#refreshCount = 0;
    }

    /* -------------------------------------------- */

    /**
     * If fog of war data is reset from the server, deactivate the current fog and initialize the exploration.
     * @returns {Promise}
     * @internal
     */
    async _handleReset() {
        return await this.#queue.add(this.#handleReset.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * If fog of war data is reset from the server, deactivate the current fog and initialize the exploration.
     * @returns {Promise}
     */
    async #handleReset() {
        ui.notifications.info("Fog of War exploration progress was reset for this Scene");

        // Remove the current exploration document
        this.#deactivate();

        // Reset exploration in the visibility layer
        canvas.visibility.resetExploration();

        // Refresh perception
        canvas.perception.initialize();
    }

    /* -------------------------------------------- */
    /*  Deprecations and Compatibility              */
    /* -------------------------------------------- */

    /**
     * @deprecated since v11
     * @ignore
     */
    get pending() {
        const msg = "pending is deprecated and redirected to the exploration container";
        foundry.utils.logCompatibilityWarning(msg, { since: 11, until: 13 });
        return canvas.visibility.explored;
    }

    /* -------------------------------------------- */

    /**
     * @deprecated since v11
     * @ignore
     */
    get revealed() {
        const msg = "revealed is deprecated and redirected to the exploration container";
        foundry.utils.logCompatibilityWarning(msg, { since: 11, until: 13 });
        return canvas.visibility.explored;
    }

    /* -------------------------------------------- */

    /**
     * @deprecated since v11
     * @ignore
     */
    update(source, force = false) {
        const msg = "update is obsolete and always returns true. The fog exploration does not record position anymore.";
        foundry.utils.logCompatibilityWarning(msg, { since: 11, until: 13 });
        return true;
    }

    /* -------------------------------------------- */

    /**
     * @deprecated since v11
     * @ignore
     */
    get resolution() {
        const msg = "resolution is deprecated and redirected to CanvasVisibility#textureConfiguration";
        foundry.utils.logCompatibilityWarning(msg, { since: 11, until: 13 });
        return canvas.visibility.textureConfiguration;
    }
}
