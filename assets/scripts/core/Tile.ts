import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Rect, Color, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

/**
 * 单张牌组件,挂在 Tile 预制体根节点上。
 * 预制体结构建议:
 *   Tile (Sprite=底框 + UITransform 90x90 + Button 可选)
 *    └─ Icon (Sprite) 显示图案
 */
@ccclass('Tile')
export class Tile extends Component {
    @property({ type: Sprite, tooltip: '显示图案的子 Sprite' })
    icon: Sprite = null!;

    /** 图案种类 */
    public typeId = -1;
    /** 所在层级,越大越靠上 */
    public layer = 0;
    /** 是否被上层牌遮挡(遮挡时不可点) */
    public isCovered = false;
    /** 是否已被收进卡槽 */
    public isCollected = false;

    private _onClick: ((t: Tile) => void) | null = null;

    init(typeId: number, layer: number, frame: SpriteFrame, onClick: (t: Tile) => void) {
        this.typeId = typeId;
        this.layer = layer;
        this.isCovered = false;
        this.isCollected = false;
        if (this.icon) this.icon.spriteFrame = frame;
        this._onClick = onClick;

        this.node.off(Node.EventType.TOUCH_END, this.onTouch, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouch, this);
        this.applyCoverVisual();
    }

    /** 设置遮挡状态并刷新视觉(变灰) */
    setCovered(covered: boolean) {
        if (this.isCovered === covered) return;
        this.isCovered = covered;
        this.applyCoverVisual();
    }

    private applyCoverVisual() {
        if (!this.icon) return;
        // 被遮挡时压一层冷色阴影(保持可辨认,不发闷),可点击时恢复亮色
        this.icon.color = this.isCovered ? new Color(150, 158, 172, 255) : Color.WHITE;
    }

    private onTouch() {
        if (this.isCovered || this.isCollected) return;
        this._onClick && this._onClick(this);
    }

    /** 世界坐标包围盒,用于遮挡判定 */
    getWorldRect(): Rect {
        const ut = this.getComponent(UITransform)!;
        return ut.getBoundingBoxToWorld();
    }

    /** 飞向目标世界坐标(进卡槽动画) */
    moveToWorld(worldPos: Vec3, onDone?: () => void) {
        const parent = this.node.parent!;
        const local = parent.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
        tween(this.node)
            .to(GameConfig.MOVE_DURATION, { position: local }, { easing: 'quadOut' })
            .call(() => onDone && onDone())
            .start();
    }
}

/** 两个世界矩形的重叠面积占 a 的比例 */
export function overlapRatio(a: Rect, b: Rect): number {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const top = Math.min(a.y + a.height, b.y + b.height);
    const w = right - x;
    const h = top - y;
    if (w <= 0 || h <= 0) return 0;
    const inter = w * h;
    const area = a.width * a.height;
    return area > 0 ? inter / area : 0;
}
