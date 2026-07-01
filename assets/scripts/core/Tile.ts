import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Rect, Color, tween, Tween, Vec3, v3, Graphics, UIOpacity } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

/** 各角色主色,用于消除碎片 */
const SHARD_COLORS = [
    new Color(240, 162, 188), // 0 猫 粉
    new Color(143, 190, 235), // 1 机械喵 蓝
    new Color(234, 178, 78),  // 2 皇冠王 金
    new Color(134, 194, 90),  // 3 招财蛙 绿
    new Color(236, 160, 120), // 4 柯基 橙
    new Color(180, 172, 238), // 5 幽灵 紫
    new Color(118, 203, 166), // 6 外星崽 青
    new Color(232, 128, 128), // 7 墨镜哥 红
];

/**
 * 单张牌组件,挂在 Tile 预制体根节点上。
 */
@ccclass('Tile')
export class Tile extends Component {
    @property({ type: Sprite, tooltip: '显示图案的子 Sprite' })
    icon: Sprite = null!;

    public typeId = -1;
    public layer = 0;
    public isCovered = false;
    public isCollected = false;

    private _onClick: ((t: Tile) => void) | null = null;

    init(typeId: number, layer: number, frame: SpriteFrame, onClick: (t: Tile) => void) {
        this.typeId = typeId;
        this.layer = layer;
        this.isCovered = false;
        this.isCollected = false;
        if (this.icon) this.icon.spriteFrame = frame;
        this._onClick = onClick;
        this.node.setScale(1, 1, 1);

        this.node.off(Node.EventType.TOUCH_END, this.onTouch, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouch, this);
        this.applyCoverVisual();
    }

    /** 洗牌用:只换图案不动位置 */
    setIcon(typeId: number, frame: SpriteFrame) {
        this.typeId = typeId;
        if (this.icon) this.icon.spriteFrame = frame;
    }

    setCovered(covered: boolean) {
        if (this.isCovered === covered) return;
        this.isCovered = covered;
        this.applyCoverVisual();
    }

    private applyCoverVisual() {
        if (!this.icon) return;
        this.icon.color = this.isCovered ? new Color(150, 158, 172, 255) : Color.WHITE;
    }

    private onTouch() {
        if (this.isCovered || this.isCollected) return;
        this.playPop();
        this._onClick && this._onClick(this);
    }

    private _hintTween: Tween<Node> | null = null;

    /** 空闲提示:循环脉冲放大 */
    startHint() {
        this.stopHint();
        this._hintTween = tween(this.node)
            .repeatForever(tween().to(0.4, { scale: v3(1.12, 1.12, 1) }).to(0.4, { scale: v3(1, 1, 1) }))
            .start();
    }
    stopHint() {
        if (this._hintTween) { this._hintTween.stop(); this._hintTween = null; this.node.setScale(1, 1, 1); }
    }

    /** 点击反馈:快速弹一下 */
    playPop() {
        tween(this.node)
            .to(0.06, { scale: v3(1.14, 1.14, 1) }, { easing: 'quadOut' })
            .to(0.08, { scale: v3(1, 1, 1) }, { easing: 'quadIn' })
            .start();
    }

    /** 消除特效:炸成碎片四散 + 本体快速缩没 */
    popOut(onDone?: () => void) {
        this.spawnShards();
        tween(this.node)
            .to(0.07, { scale: v3(1.18, 1.18, 1) }, { easing: 'quadOut' })
            .to(0.05, { scale: v3(0, 0, 1) }, { easing: 'quadIn' })
            .call(() => { this.node.destroy(); onDone && onDone(); })
            .start();
    }

    /** 生成一圈三角碎片,向外飞散、旋转、下坠、淡出 */
    private spawnShards() {
        const parent = this.node.parent;
        if (!parent) return;
        const base = this.node.position;
        const n = SHARD_COLORS.length;
        const col = SHARD_COLORS[((this.typeId % n) + n) % n];
        const COUNT = 10;
        for (let i = 0; i < COUNT; i++) {
            const s = new Node('shard');
            s.layer = this.node.layer;
            parent.addChild(s);
            s.setPosition(base.x, base.y, 0);
            const op = s.addComponent(UIOpacity);
            const g = s.addComponent(Graphics);
            const sz = 7 + Math.random() * 9;
            g.fillColor = col;
            g.moveTo(0, sz); g.lineTo(sz, -sz); g.lineTo(-sz, -sz); g.close(); g.fill();
            const ang = Math.random() * Math.PI * 2;
            const dist = 36 + Math.random() * 60;
            const tx = base.x + Math.cos(ang) * dist;
            const ty = base.y + Math.sin(ang) * dist * 0.6 - 26 - Math.random() * 34;
            tween(s)
                .to(0.42, { position: v3(tx, ty, 0), angle: (Math.random() * 2 - 1) * 360, scale: v3(0.3, 0.3, 1) }, { easing: 'quadOut' })
                .call(() => s.destroy())
                .start();
            tween(op).to(0.42, { opacity: 0 }, { easing: 'quadIn' }).start();
        }
    }

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
