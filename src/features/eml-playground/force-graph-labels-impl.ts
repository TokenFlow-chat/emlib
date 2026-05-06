import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from "three";
import type { Object3D } from "three";

import type { ForceGraphNode } from "./force-graph-types";

const MAX_LABEL_TEXTURE_CACHE = 256;
const labelTextureCache = new Map<string, CanvasTexture>();

export function createTextSprite(node: ForceGraphNode): Object3D {
  const text = node.label.length > 16 ? `${node.label.slice(0, 15)}...` : node.label;
  const cacheKey = `${text};`;
  let texture = labelTextureCache.get(cacheKey);

  if (!texture) {
    if (labelTextureCache.size >= MAX_LABEL_TEXTURE_CACHE) {
      for (const [key, tex] of labelTextureCache) {
        tex.dispose();
        labelTextureCache.delete(key);
        break;
      }
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return new Sprite();
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = 30;
    const horizontalPadding = 14;
    const verticalPadding = 8;

    context.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const metrics = context.measureText(text);
    const width = Math.ceil(metrics.width + horizontalPadding * 2);
    const height = fontSize + verticalPadding * 2;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);

    context.scale(ratio, ratio);
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText(text, horizontalPadding, height / 2 + 1);

    texture = new CanvasTexture(canvas);
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
    labelTextureCache.set(cacheKey, texture);
  }

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }) as SpriteMaterial & { depthTest: boolean };
  material.depthTest = false;
  const sprite = new Sprite(material) as Sprite & { renderOrder: number; raycast: () => void };
  sprite.renderOrder = 1;
  sprite.raycast = () => {};
  const image = texture.image as HTMLCanvasElement;
  const scale = node.role === "operator" ? 10 : 8.6;
  sprite.scale.set((image.width / image.height) * scale, scale, 1);
  sprite.position.y = 0;
  return sprite;
}
