import { _decorator, Component, Node, Graphics, Color, Label, UITransform, Canvas, find, Layers, view, ResolutionPolicy } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass } = _decorator;

/**
 * 场景装饰:运行时在画布上画出背景云朵岛屿、底部卡槽框、顶部 HUD。
 * 挂到 GameRoot(或任意 Canvas 下节点)即可,start 时自动按画布尺寸生成。
 * 纯 Graphics + Label,无需额外贴图。
 */
@ccclass('SceneDecor')
export class SceneDecor extends Component {
    private W = 720;
    private H = 1280;

    onLoad() {
        // 强制竖屏设计分辨率(项目设置里的 1280x720 会被编辑器改回,这里用代码兜底)
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);
    }

    start() {
        const canvas = find('Canvas') ?? this.node.parent!;
        const vs = view.getVisibleSize();
        this.W = vs.width; this.H = vs.height;
        this.buildBackground(canvas);
        this.buildSlotBar(canvas);
        this.buildHUD(canvas);
    }

    private mkNode(parent: Node, name: string, sibling = -1): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        parent.addChild(n);
        n.setPosition(0, 0, 0);
        if (sibling >= 0) n.setSiblingIndex(sibling);
        return n;
    }

    private gfx(parent: Node, name: string, sibling = -1): Graphics {
        const n = this.mkNode(parent, name, sibling);
        const g = n.addComponent(Graphics);
        return g;
    }

    private fillRoundRect(g: Graphics, x: number, y: number, w: number, h: number, r: number, c: Color) {
        g.fillColor = c; g.roundRect(x, y, w, h, r); g.fill();
    }
    private fillCircle(g: Graphics, x: number, y: number, r: number, c: Color) {
        g.fillColor = c; g.circle(x, y, r); g.fill();
    }

    /** 背景:天空 + 云朵岛屿底盘 */
    private buildBackground(canvas: Node) {
        const g = this.gfx(canvas, 'Decor_BG', 0);
        const W = this.W, H = this.H;
        // 天空
        this.fillRoundRect(g, -W / 2, -H / 2, W, H, 0, new Color(205, 235, 247, 255));
        this.fillRoundRect(g, -W / 2, -H / 2, W, H * 0.5, 0, new Color(186, 224, 240, 255));
        // 远处云
        this.fillCircle(g, -W * 0.3, H * 0.32, 70, new Color(255, 255, 255, 130));
        this.fillCircle(g, -W * 0.18, H * 0.30, 54, new Color(255, 255, 255, 130));
        this.fillCircle(g, W * 0.28, H * 0.36, 80, new Color(255, 255, 255, 120));
        // 岛屿(草地圆角盘),覆盖牌堆区域
        const iw = W * 0.92, ih = 560, ix = -iw / 2, iy = -120;
        this.fillRoundRect(g, ix, iy - 12, iw, ih, 70, new Color(151, 196, 89, 255)); // 厚度
        this.fillRoundRect(g, ix, iy, iw, ih, 70, new Color(192, 221, 151, 255));     // 草面
        this.fillRoundRect(g, ix + 14, iy + ih - 60, iw - 28, 46, 24, new Color(208, 232, 168, 200)); // 顶部高光
        // 托着岛屿的云
        const cy = iy - 6;
        this.fillCircle(g, ix + 50, cy, 60, new Color(255, 255, 255, 255));
        this.fillCircle(g, ix + iw * 0.35, cy - 16, 76, new Color(255, 255, 255, 255));
        this.fillCircle(g, ix + iw * 0.65, cy - 14, 72, new Color(255, 255, 255, 255));
        this.fillCircle(g, ix + iw - 50, cy, 58, new Color(255, 255, 255, 255));
    }

    /** 底部卡槽框 */
    private buildSlotBar(canvas: Node) {
        const g = this.gfx(canvas, 'Decor_SlotBar', 1);
        const W = this.W;
        const cap = GameConfig.SLOT_CAPACITY;
        const step = GameConfig.TILE_SIZE;          // 90
        const slotY = -this.H / 2 + 150;            // 卡槽中心 y(与 SlotBar 节点位置一致)
        // 卡槽底板
        const barW = step * cap + 36, barH = 116;
        this.fillRoundRect(g, -barW / 2, slotY - barH / 2, barW, barH, 28, new Color(233, 230, 221, 255));
        this.fillRoundRect(g, -barW / 2, slotY - barH / 2, barW, barH, 28, new Color(0, 0, 0, 0));
        // 7 个槽位
        const s = 78;
        for (let i = 0; i < cap; i++) {
            const cx = (i - (cap - 1) / 2) * step;
            this.fillRoundRect(g, cx - s / 2, slotY - s / 2, s, s, 18, new Color(214, 208, 192, 255));
        }
        // 描边
        g.lineWidth = 3; g.strokeColor = new Color(199, 187, 158, 255);
        g.roundRect(-barW / 2, slotY - barH / 2, barW, barH, 28); g.stroke();
    }

    /** 顶部 HUD:关卡、星级、剩余、连击 */
    private buildHUD(canvas: Node) {
        const W = this.W, H = this.H;
        const g = this.gfx(canvas, 'Decor_HUD');
        const topY = H / 2 - 110;
        // 顶部信息条底板
        this.fillRoundRect(g, -W * 0.46, topY - 70, W * 0.92, 140, 30, new Color(255, 255, 255, 235));
        // 关名 + 星级
        this.label(canvas, 'Lv.3 · 樱花小镇', 34, topY + 24, new Color(74, 74, 70, 255));
        this.label(canvas, '★★★★☆', 30, topY - 14, new Color(239, 159, 39, 255));
        // 左右小信息
        this.label(canvas, '剩余 36', 26, topY - 52, new Color(24, 95, 165, 255), -W * 0.22);
        this.label(canvas, '连击 ×3', 26, topY - 52, new Color(133, 79, 11, 255), W * 0.22);
    }

    private label(parent: Node, text: string, size: number, y: number, color: Color, x = 0) {
        const n = this.mkNode(parent, 'HUD_' + text);
        n.setPosition(x, y, 0);
        const l = n.addComponent(Label);
        l.string = text; l.fontSize = size; l.lineHeight = size + 4;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.color = color;
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 200); l.outlineWidth = 2;
    }
}
