import { resources, ImageAsset, Texture2D, SpriteFrame } from 'cc';

let cache: SpriteFrame[] | null = null;

/** 从 resources/char/0..7 加载 8 个角色 SpriteFrame(任意场景可用),完成后回调 */
export function loadCharFrames(cb: (frames: SpriteFrame[]) => void) {
    if (cache) { cb(cache); return; }
    const out: SpriteFrame[] = new Array(8);
    let done = 0;
    for (let i = 0; i < 8; i++) {
        resources.load(`char/${i}`, ImageAsset, (err, img) => {
            if (!err && img) {
                const tex = new Texture2D();
                tex.image = img;
                const sf = new SpriteFrame();
                sf.texture = tex;
                out[i] = sf;
            }
            if (++done === 8) { cache = out; cb(out); }
        });
    }
}
