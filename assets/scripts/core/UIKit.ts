import { Node, Sprite, SpriteFrame, UITransform, Layers, Label, Color, resources, tween, v3 } from 'cc';

/**
 * UIKit:UI 贴图资源加载 + 常用贴图控件。
 * 资源位于 assets/resources/ui/*.png(九宫格边距已在 meta 中配置)。
 */

const UI_NAMES = [
    'btn_green', 'btn_blue', 'btn_yellow', 'btn_purple', 'btn_red', 'btn_gray',
    'tile_purple', 'tile_yellow', 'tile_blue', 'tile_red', 'tile_green',
    'hud_pill', 'panel_cream',
    'orb_plus', 'orb_close', 'orb_gear',
    'icon_coin', 'icon_diamond', 'icon_heart', 'icon_book', 'icon_shop',
    'icon_trophy', 'icon_calendar', 'icon_task',
    'badge_red', 'platform_grass',
    'banner_pink', 'orb_back', 'node_gold', 'node_green', 'node_gray',
    'icon_star', 'icon_star_gray', 'icon_lock',
    'banner_orange', 'banner_purple', 'icon_undo', 'icon_shuffle', 'icon_eject', 'star_big',
] as const;
export type UIName = typeof UI_NAMES[number];

let cache: Map<string, SpriteFrame> | null = null;

/** 一次性加载全部 UI SpriteFrame,完成后回调 */
export function loadUI(cb: (ui: Map<string, SpriteFrame>) => void) {
    if (cache) { cb(cache); return; }
    const out = new Map<string, SpriteFrame>();
    let done = 0;
    for (const n of UI_NAMES) {
        resources.load(`ui/${n}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) out.set(n, sf);
            if (++done === UI_NAMES.length) { cache = out; cb(out); }
        });
    }
}

export function uiFrame(n: UIName): SpriteFrame | null { return cache?.get(n) ?? null; }

function mkNode(p: Node, name: string): Node {
    const n = new Node(name); n.layer = Layers.Enum.UI_2D; p.addChild(n); return n;
}

/** 创建贴图节点。sliced=true 时按九宫格拉伸 */
export function uiSprite(p: Node, frame: UIName, w: number, h: number, x = 0, y = 0, sliced = false): Node {
    const n = mkNode(p, frame);
    n.setPosition(x, y, 0);
    const ut = n.addComponent(UITransform);
    const sp = n.addComponent(Sprite);
    // 先设 CUSTOM 再赋 spriteFrame,避免默认 TRIMMED 模式按贴图原始尺寸重置节点
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.type = sliced ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;
    sp.spriteFrame = uiFrame(frame);
    ut.setContentSize(w, h); // 赋值后再锁定目标尺寸
    return n;
}

/** 九宫格按钮:贴图 + 文字(描边) + 按压动效 */
export function uiButton(p: Node, frame: UIName, text: string, x: number, y: number,
    w: number, h: number, fz: number, onTap: () => void, outline?: Color): Node {
    const n = uiSprite(p, frame, w, h, x, y, true);
    if (text) {
        const ln = mkNode(n, 'l'); ln.setPosition(0, 2, 0);
        const l = ln.addComponent(Label);
        l.string = text; l.fontSize = fz; l.lineHeight = fz + 6;
        l.color = Color.WHITE; l.isBold = true;
        l.enableOutline = true;
        l.outlineColor = outline ?? new Color(0, 0, 0, 70);
        l.outlineWidth = 3;
    }
    n.on(Node.EventType.TOUCH_END, () =>
        tween(n).to(0.06, { scale: v3(0.92, 0.92, 1) }).to(0.08, { scale: v3(1, 1, 1) }).call(onTap).start());
    return n;
}

/** HUD 胶囊:左图标 + 文字 + 可选右侧加号 */
export function uiPill(p: Node, icon: UIName, x: number, y: number, w: number,
    onPlus?: () => void): Label {
    const h = 56;
    const n = uiSprite(p, 'hud_pill', w, h, x, y, true);
    uiSprite(n, icon, 52, 52, -w / 2 + 12, 2);
    const ln = mkNode(n, 'l'); ln.setPosition(10, 1, 0);
    const l = ln.addComponent(Label);
    l.string = ''; l.fontSize = 26; l.lineHeight = 30; l.isBold = true;
    l.color = new Color(122, 90, 38, 255);
    if (onPlus) {
        const plus = uiSprite(n, 'orb_plus', 40, 40, w / 2 - 8, 2);
        plus.on(Node.EventType.TOUCH_END, onPlus);
    }
    return l;
}
