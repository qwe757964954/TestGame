import { _decorator, Component, Node, Graphics, Color, Label, UITransform, find, Layers, view, ResolutionPolicy, tween, v3, UIOpacity, director } from 'cc';
import { GameData, SHOP_ITEMS } from './GameData';
import { themeFor } from './Themes';
import { ensureCanvas } from './UIBoot';
const { ccclass } = _decorator;

/** 关卡选择(程序化 UI)。挂在场景里 Canvas 下的一个空节点上。 */
@ccclass('LevelSelectScene')
export class LevelSelectScene extends Component {
    private W = 720; private H = 1280;
    private lifeLabel: Label | null = null;

    onLoad() { view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH); GameData.load(); }

    start() {
        const canvas = ensureCanvas();
        const vs = view.getVisibleSize(); this.W = vs.width; this.H = vs.height;
        this.build(canvas);
    }

    private mk(p: Node, n = 'n', sib = -1): Node {
        const node = new Node(n); node.layer = Layers.Enum.UI_2D; p.addChild(node);
        node.setPosition(0, 0, 0); if (sib >= 0) node.setSiblingIndex(sib); return node;
    }
    private gfx(p: Node, sib = -1): Graphics { return this.mk(p, 'g', sib).addComponent(Graphics); }
    private rr(g: Graphics, x: number, y: number, w: number, h: number, r: number, c: Color) { g.fillColor = c; g.roundRect(x, y, w, h, r); g.fill(); }
    private circ(g: Graphics, x: number, y: number, r: number, c: Color) { g.fillColor = c; g.circle(x, y, r); g.fill(); }
    private label(p: Node, t: string, size: number, x: number, y: number, c: Color): Label {
        const n = this.mk(p, 'l'); n.setPosition(x, y, 0);
        const l = n.addComponent(Label); l.string = t; l.fontSize = size; l.color = c;
        l.horizontalAlign = Label.HorizontalAlign.CENTER; return l;
    }
    private toast(text: string) {
        const canvas = find('Canvas'); if (!canvas) return;
        const n = this.mk(canvas, 'toast'); n.setPosition(0, 0, 0);
        const op = n.addComponent(UIOpacity);
        const l = n.addComponent(Label); l.string = text; l.fontSize = 36; l.color = new Color(226, 75, 74, 255);
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 220); l.outlineWidth = 3;
        tween(n).to(0.6, { position: v3(0, 80, 0) }).call(() => n.destroy()).start();
        tween(op).delay(0.4).to(0.4, { opacity: 0 }).start();
    }

    private build(canvas: Node) {
        const W = this.W, H = this.H;
        const t = themeFor(GameData.level);
        const C = (a: number[], alpha = 255) => new Color(a[0], a[1], a[2], alpha);
        const g = this.gfx(canvas, 0);
        this.rr(g, -W / 2, -H / 2, W, H, 0, C(t.sky));
        this.rr(g, -W / 2, -H / 2, W, H * 0.5, 0, C(t.skyTop));
        this.circ(g, -W * 0.3, H * 0.32, 70, C(t.cloud, 120));
        this.circ(g, W * 0.3, H * 0.36, 80, C(t.cloud, 110));

        // 标题条
        const hg = this.gfx(canvas);
        this.rr(hg, -W * 0.46, H / 2 - 160, W * 0.92, 110, 28, new Color(255, 255, 255, 235));
        this.label(canvas, t.name + ' · 选择关卡', 36, 0, H / 2 - 105, C(t.accent));

        // 返回按钮
        const back = this.mk(canvas, 'back'); back.setPosition(-W / 2 + 70, H / 2 - 70, 0);
        back.addComponent(UITransform).setContentSize(80, 64);
        const bg = back.addComponent(Graphics); bg.fillColor = new Color(255, 255, 255, 235); bg.roundRect(-40, -32, 80, 64, 16); bg.fill();
        this.label(canvas, '<', 40, -W / 2 + 70, H / 2 - 78, new Color(90, 90, 84, 255));
        back.on(Node.EventType.TOUCH_END, () => director.loadScene('Home'));

        // 体力(右上角,带恢复倒计时)
        const lp = this.mk(canvas, 'lifepill'); lp.setPosition(W / 2 - 110, H / 2 - 70, 0);
        const lg = lp.addComponent(Graphics); lg.fillColor = new Color(245, 170, 175, 255); lg.roundRect(-90, -24, 180, 48, 24); lg.fill();
        this.lifeLabel = this.label(lp, '', 26, 0, -2, new Color(124, 22, 24, 255));
        this.refreshLife();
        this.schedule(this.refreshLife, 1);

        // 蜿蜒关卡路径(窗口显示 6 关,保证当前关在内)
        const unlocked = GameData.level;
        const visible = 6;
        const start = Math.max(1, unlocked + 1 - (visible - 1));
        const bottomY = -H / 2 + 250;
        const topY = H / 2 - 330;
        const centers: { x: number; y: number; lv: number; state: string }[] = [];
        for (let i = 0; i < visible; i++) {
            const lv = start + i;
            const t = i / (visible - 1);
            const y = bottomY + (topY - bottomY) * t;
            const x = 160 * Math.sin(i * 0.95);
            const state = lv < unlocked ? 'passed' : (lv === unlocked ? 'current' : 'locked');
            centers.push({ x, y, lv, state });
        }
        // 路径圆点(节点之下)
        const pg = this.gfx(canvas, 1);
        pg.fillColor = new Color(255, 255, 255, 200);
        for (let i = 0; i < centers.length - 1; i++) {
            const a = centers[i], b = centers[i + 1];
            for (let d = 1; d < 5; d++) {
                const k = d / 5;
                pg.circle(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 6); pg.fill();
            }
        }
        // 云
        const cg2 = this.gfx(canvas, 1);
        this.circ(cg2, -W * 0.32, bottomY + 130, 56, new Color(255, 255, 255, 150));
        this.circ(cg2, W * 0.30, topY - 70, 60, new Color(255, 255, 255, 150));
        // 节点
        for (const c of centers) this.levelNode(canvas, c.lv, c.x, c.y, c.state);
    }

    private levelNode(canvas: Node, lv: number, x: number, y: number, state: string) {
        const open = state !== 'locked';
        const current = state === 'current';
        const n = this.mk(canvas, 'lvl_' + lv); n.setPosition(x, y, 0);
        const s = current ? 120 : 104;
        n.addComponent(UITransform).setContentSize(s + 24, s + 24);
        const g = n.addComponent(Graphics);
        if (current) { g.fillColor = new Color(29, 158, 117, 75); g.circle(0, 0, s / 2 + 12); g.fill(); }
        const bg = open ? new Color(192, 221, 151, 255) : new Color(211, 209, 199, 255);
        const bd = open ? new Color(99, 153, 34, 255) : new Color(150, 148, 140, 255);
        g.fillColor = bg; g.circle(0, 0, s / 2); g.fill();
        g.lineWidth = 5; g.strokeColor = bd; g.circle(0, 0, s / 2); g.stroke();
        if (state === 'locked') {
            g.lineWidth = 5; g.strokeColor = new Color(120, 118, 110, 255);
            g.moveTo(-12, 2); g.bezierCurveTo(-12, -20, 12, -20, 12, 2); g.stroke();
            g.fillColor = new Color(120, 118, 110, 255); g.roundRect(-17, -16, 34, 26, 5); g.fill();
        } else {
            this.label(n, '' + lv, 42, 0, 0, new Color(39, 80, 10, 255));
        }
        if (state === 'passed') this.label(n, '★★★', 22, 0, s / 2 + 18, new Color(239, 159, 39, 255));
        if (current) {
            this.label(n, '▾ 你在这', 24, 0, s / 2 + 32, new Color(29, 158, 117, 255));
            this.miniCat(n, -s / 2 - 26, 8);
        }
        if (open) {
            n.on(Node.EventType.TOUCH_END, () => {
                tween(n).to(0.06, { scale: v3(0.9, 0.9, 1) }).to(0.08, { scale: v3(1, 1, 1) })
                    .call(() => {
                        if (!GameData.useLife()) { this.showNoLife(); this.refreshLife(); return; }
                        GameData.playLevel = lv; GameData.save(); director.loadScene('scene');
                    }).start();
            });
        } else {
            n.on(Node.EventType.TOUCH_END, () => this.toast('未解锁'));
        }
    }

    private miniCat(p: Node, x: number, y: number) {
        const n = this.mk(p, 'cat'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(244, 166, 192, 255);
        g.moveTo(-16, 14); g.lineTo(-24, 32); g.lineTo(-4, 22); g.close(); g.fill();
        g.moveTo(16, 14); g.lineTo(24, 32); g.lineTo(4, 22); g.close(); g.fill();
        g.fillColor = new Color(248, 200, 216, 255); g.circle(0, 6, 22); g.fill();
        g.lineWidth = 3; g.strokeColor = new Color(212, 83, 126, 255); g.circle(0, 6, 22); g.stroke();
        g.fillColor = new Color(58, 32, 48, 255); g.circle(-8, 8, 3.5); g.fill(); g.circle(8, 8, 3.5); g.fill();
    }

    // ---------- 体力耗尽弹层 ----------
    private showNoLife() {
        const canvas = find('Canvas'); if (!canvas) return;
        const W = this.W, H = this.H;
        const layer = this.mk(canvas, 'nolife'); layer.setPosition(0, 0, 0);
        layer.addComponent(UITransform).setContentSize(W, H);
        const dg = layer.addComponent(Graphics); dg.fillColor = new Color(0, 0, 0, 150); dg.rect(-W / 2, -H / 2, W, H); dg.fill();
        layer.on(Node.EventType.TOUCH_END, () => { });

        const cw = W * 0.78, ch = 420;
        const card = this.mk(layer, 'card');
        const cg = card.addComponent(Graphics); cg.fillColor = new Color(255, 252, 245, 255); cg.roundRect(-cw / 2, -ch / 2, cw, ch, 28); cg.fill();
        this.label(card, '体力耗尽', 44, 0, ch / 2 - 70, new Color(120, 40, 40, 255));
        this.label(card, '体力为 0,等待恢复或用钻石补满', 24, 0, ch / 2 - 128, new Color(120, 112, 100, 255));
        this.label(card, `当前体力 ${GameData.lives}/${GameData.livesMax}`, 26, 0, 6, new Color(74, 74, 70, 255));

        const lifeItem = SHOP_ITEMS.find(s => s.id === 'life_full');
        const cost = lifeItem && lifeItem.cost.diamond ? lifeItem.cost.diamond : 10;
        this.popBtn(card, `钻石补满  钻${cost}`, 0, -72, cw * 0.74, new Color(91, 160, 214, 255), () => {
            if (GameData.buyShopItem('life_full')) { layer.destroy(); this.refreshLife(); this.toast('体力已补满'); }
            else this.toast('钻石不足');
        });
        this.popBtn(card, '关闭', 0, -156, cw * 0.74, new Color(160, 158, 150, 255), () => layer.destroy());
    }
    private popBtn(parent: Node, text: string, x: number, y: number, w: number, color: Color, onTap: () => void) {
        const n = this.mk(parent, 'btn'); n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(w, 64);
        const g = n.addComponent(Graphics); g.fillColor = color; g.roundRect(-w / 2, -32, w, 64, 18); g.fill();
        this.label(n, text, 28, 0, -2, Color.WHITE);
        n.on(Node.EventType.TOUCH_END, () => tween(n).to(0.06, { scale: v3(0.93, 0.93, 1) }).to(0.08, { scale: v3(1, 1, 1) }).call(onTap).start());
    }

    private refreshLife = () => {
        if (!this.lifeLabel) return;
        GameData.tickLives();
        if (GameData.lives >= GameData.livesMax) { this.lifeLabel.string = '♥ ' + GameData.lives + ' / ' + GameData.livesMax; return; }
        const s = Math.max(0, Math.ceil(GameData.msToNextLife() / 1000));
        const m = Math.floor(s / 60), ss = s % 60;
        this.lifeLabel.string = `♥ ${GameData.lives}/${GameData.livesMax}  ${m}:${ss < 10 ? '0' : ''}${ss}`;
    };
}
