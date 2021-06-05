function levelsTokenRefresh() {
  // Token position and visibility
  if (!this._movement) this.position.set(this.data.x, this.data.y);

  // Size the texture aspect ratio within the token frame
  const tex = this.texture;
  if (tex) {
    let aspect = tex.width / tex.height;
    const scale = this.icon.scale;
    if (aspect >= 1) {
      this.icon.width = this.w * this.data.scale;
      scale.y = Number(scale.x);
    } else {
      this.icon.height = this.h * this.data.scale;
      scale.x = Number(scale.y);
    }
  }

  // Mirror horizontally or vertically
  this.icon.scale.x =
    Math.abs(this.icon.scale.x) * (this.data.mirrorX ? -1 : 1);
  this.icon.scale.y =
    Math.abs(this.icon.scale.y) * (this.data.mirrorY ? -1 : 1);

  // Set rotation, position, and opacity
  this.icon.rotation = this.data.lockRotation
    ? 0
    : Math.toRadians(this.data.rotation);
  this.icon.position.set(this.w / 2, this.h / 2);
  if (!this.levelsHidden)
    this.icon.alpha = this.data.hidden
      ? Math.min(this.data.alpha, 0.5)
      : this.data.alpha;

  // Refresh Token border and target
  this._refreshBorder();
  this._refreshTarget();

  // Refresh nameplate and resource bars
  this.nameplate.visible = this._canViewMode(this.data.displayName);
  this.bars.visible = this._canViewMode(this.data.displayBars);
  return this;
}

function _levelsOnMovementFrame(dt, anim, config) {
  // Update the displayed position of the Token
  this.data.x = this.x;
  this.data.y = this.y;
  // Update the token copy
  let tempTokenSprite = _levels.floorContainer.spriteIndex[this.id];
  if (tempTokenSprite) {
    tempTokenSprite.width = this.data.width * canvas.scene.dimensions.size;
    tempTokenSprite.height = this.data.height * canvas.scene.dimensions.size;
    tempTokenSprite.position.x = this.position.x;
    tempTokenSprite.position.y = this.position.y;
    tempTokenSprite.position.x += this.icon.x;
    tempTokenSprite.position.y += this.icon.y;
    tempTokenSprite.anchor = this.icon.anchor;
    tempTokenSprite.angle = this.icon.angle;
    tempTokenSprite.alpha = 1;
    tempTokenSprite.zIndex = this.data.elevation;
  }
  // Animate perception changes
  if (!config.animate || !anim.length) return;
  let updateFog = config.fog;
  if (config.source) {
    const dist = Math.hypot(anim[0].done, anim[1]?.done || 0);
    const n = Math.floor(dist / canvas.dimensions.size);
    if (n > 0 && anim[0].dist !== n) {
      updateFog = true;
      anim[0].dist = n;
    }
  }
  this._animatePerceptionFrame({
    source: config.source,
    sound: config.sound,
    fog: updateFog,
  });
}
