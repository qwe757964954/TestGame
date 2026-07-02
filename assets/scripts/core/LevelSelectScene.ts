import { _decorator, Component, Node, Graphics, Color, Label, UITransform, find, Layers, view, ResolutionPolicy, tween, v3, UIOpacity, director, Sprite, SpriteFrame, resources, ImageAsset, Texture2D } from 'cc';
import { GameData, SHOP_ITEMS } from './GameData';
import { themeFor, themeIndexFor, THEMES } from './Themes';
import { ensureCanvas } from './UIBoot';
import { loadUI, uiSprite, uiButton, uiPill } from './UIKit';
const { ccclass } = _decorator;

/** 关卡选择(程序化 UI + 贴图资源)。挂在场景里 Canvas 下的一个空节点上。 */
@ccclass('LevelSelectScene')
export class LevelSelectScene extends Component {
    private W = 720; private H = 1280;
    private lifeLabel: Label | null = null;

    onLoad() { view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH); GameData.load(); }

    start() {
        const canvas = ensureCanvas();
        const vs = view.getVisibleSize(); this.W = vs.width; this.H = vs.height;
        loadUI(() => this.build(canvas));
    }

    private mk(p: Node, n = 'n', sib = -1): Node {
        const node = new Node(n); node.layer = Layers.Enum.UI_2D; p.addChild(node);
        node.setPosition(0, 0, 0); if (sib >= 0) node.setSiblingIndex(sib); return node;
    }
    private gfx(p: Node, sib = -1): Graphics { return this.mk(p, 'g', sib).addComponent(Graphics); }
    private rr(g: Graphics, x: number, y: number, w: number, h: number, r: number, c: Color) { g.fillColor = c; g.roundRect(x, y, w, h, r); g.fill(); }
    private circ(g: Graphics, x: number, y: number, r: number, c: Color) { g.fillColor = c; g.circle(x, y, r); g.fill(); }
    private label(p: Node, t: string, size: number, x: number, y: number, c: Color, bold = false): Label {
        const n = this.mk(p, 'l'); n.setPosition(x, y, 0);
        const l = n.addComponent(Label); l.string = t; l.fontSize = size; l.lineHeight = size + 4; l.color = c; l.isBold = bold;
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
        this.rr(g, -W / 2, 0, W, H / 2, 0, C(t.skyTop));
        // 云
        this.cloud(g, -W * 0.30, H * 0.30, 1.0, C(t.cloud, 150));
        this.cloud(g, W * 0.30, H * 0.38, 1.15, C(t.cloud, 130));
        this.cloud(g, -W * 0.34, -H * 0.10, 0.8, C(t.cloud, 110));
        this.cloud(g, W * 0.34, -H * 0.30, 0.9, C(t.cloud, 120));
        // 地面草带(底部标签栏背景)
        g.fillColor = C(t.ground);
        g.moveTo(-W / 2, -H / 2 + 210); g.bezierCurveTo(-W * 0.2, -H / 2 + 250, W * 0.2, -H / 2 + 250, W / 2, -H / 2 + 210);
        g.lineTo(W / 2, -H / 2); g.lineTo(-W / 2, -H / 2); g.close(); g.fill();

        // ---- 主题横幅 ----
        const chapter = themeIndexFor(GameData.level) + 1;
        const banner = uiSprite(canvas, 'banner_pink', 440, 118, 0, H / 2 - 128);
        const bt = this.label(banner, t.name, 40, 0, 8, Color.WHITE, true);
        bt.enableOutline = true; bt.outlineColor = new Color(150, 40, 80, 200); bt.outlineWidth = 3;
        this.label(banner, `第 ${chapter} 章`, 20, 0, -30, new Color(255, 230, 240, 255));

        // ---- 返回 / 体力 ----
        const back = uiSprite(canvas, 'orb_back', 68, 68, -W / 2 + 62, H / 2 - 66);
        back.on(Node.EventType.TOUCH_END, () => director.loadScene('Home'));
        this.lifeLabel = uiPill(canvas, 'icon_heart', W / 2 - 120, H / 2 - 66, 190);
        this.refreshLife();
        this.schedule(this.refreshLife, 1);

        // ---- 蜿蜒关卡路径(窗口显示 6 关,保证当前关在内) ----
        const unlocked = GameData.level;
        const visible = 6;
        const start = Math.max(1, unlocked + 1 - (visible - 1));
        const bottomY = -H / 2 + 340;
        const topY = H / 2 - 320;
        const centers: { x: number; y: number; lv: number; state: string }[] = [];
        for (let i = 0; i < visible; i++) {
            const lv = start + i;
            const k = i / (visible - 1);
            const y = bottomY + (topY - bottomY) * k;
            const x = 160 * Math.sin(i * 0.95);
            const state = lv < unlocked ? 'passed' : (lv === unlocked ? 'current' : 'locked');
            centers.push({ x, y, lv, state });
        }
        // 路径圆点(节点之下)
        const pg = this.gfx(canvas, 1);
        pg.fillColor = new Color(255, 255, 255, 210);
        for (let i = 0; i < centers.length - 1; i++) {
            const a = centers[i], b = centers[i + 1];
            for (let d = 1; d < 5; d++) {
                const k = d / 5;
                pg.circle(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 7); pg.fill();
            }
        }
        // 节点
        for (const c of centers) this.levelNode(canvas, c.lv, c.x, c.y, c.state);

        // ---- 底部章节标签栏 ----
        this.chapterTabs(canvas, chapter);
    }

    private cloud(g: Graphics, x: number, y: number, s: number, c: Color) {
        this.circ(g, x, y, 44 * s, c);
        this.circ(g, x - 46 * s, y - 10 * s, 30 * s, c);
        this.circ(g, x + 46 * s, y - 8 * s, 34 * s, c);
    }

    private levelNode(canvas: Node, lv: number, x: number, y: number, state: string) {
        const open = state !== 'locked';
        const current = state === 'current';
        const s = current ? 122 : 104;
        const frame = state === 'passed' ? 'node_gold' : current ? 'node_green' : 'node_gray';
        const n = uiSprite(canvas, frame as 'node_gold', s, s, x, y);
        // 当前关外圈光晕
        if (current) {
            const halo = this.gfx(n, 0);
            halo.fillColor = new Color(255, 255, 255, 60); halo.circle(0, 4, s / 2 + 14); halo.fill();
            // 呼吸动画
            tween(n).repeatForever(
                tween(n).to(0.8, { scale: v3(1.06, 1.06, 1) }, { easing: 'sineInOut' })
                    .to(0.8, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
            ).start();
        }
        if (state === 'locked') {
            uiSprite(n, 'icon_lock', 44, 44, 0, 4);
        } else {
            const num = this.label(n, '' + lv, 46, 0, 6, Color.WHITE, true);
            num.enableOutline = true;
            num.outlineColor = state === 'passed' ? new Color(180, 110, 10, 220) : new Color(60, 130, 30, 220);
            num.outlineWidth = 3;
        }
        // 已通关:金星×3
        if (state === 'passed') {
            for (let i = -1; i <= 1; i++) uiSprite(n, 'icon_star', 26, 26, i * 26, -s / 2 - 2 + (i === 0 ? -4 : 0));
        }
        if (current) {
            const tag = this.label(canvas, '你在这里', 24, x, y + s / 2 + 40, Color.WHITE, true);
            tag.enableOutline = true; tag.outlineColor = new Color(50, 120, 40, 220); tag.outlineWidth = 3;
            this.miniCat(n, -s / 2 - 40, 10);
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

    /** 底部章节标签栏 */
    private chapterTabs(canvas: Node, chapter: number) {
        const W = this.W, H = this.H;
        const y = -H / 2 + 96;
        const total = Math.min(THEMES.length, chapter + 3);
        const startCh = Math.max(1, Math.min(chapter - 1, total - 3));
        for (let i = 0; i < 4; i++) {
            const ch = startCh + i;
            if (ch > THEMES.length) break;
            const x = (i - 1.5) * 168;
            const isCur = ch === chapter;
            const n = uiSprite(canvas, isCur ? 'tile_green' : 'btn_gray', 150, 108, x, y, true);
            if (isCur) {
                uiSprite(n, 'icon_star', 40, 40, 0, 16);
                const l = this.label(n, THEMES[ch - 1].name, 20, 0, -26, Color.WHITE, true);
                l.enableOutline = true; l.outlineColor = new Color(60, 130, 30, 200); l.outlineWidth = 2;
            } else {
                const passed = ch < chapter;
                uiSprite(n, passed ? 'icon_star' : 'icon_lock', 36, 36, 0, 16);
                this.label(n, `第${ch}章`, 20, 0, -26, passed ? new Color(122, 90, 38, 255) : new Color(120, 118, 110, 255), true);
            }
            if (ch <= chapter) {
                n.on(Node.EventType.TOUCH_END, () =>
                    this.toast(ch === chapter ? THEMES[ch - 1].name + ' 进行中' : '已通关:' + THEMES[ch - 1].name));
            } else {
                n.on(Node.EventType.TOUCH_END, () => this.toast('通关前面章节后解锁'));
            }
        }
    }

    /** 迷你猫(当前关卡旁,优先贴图) */
    private miniCat(p: Node, x: number, y: number) {
        const n = this.mk(p, 'cat'); n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(64, 64);
        resources.load('char/0', ImageAsset, (err, img) => {
            if (!err && img && n.isValid) {
                const tex = new Texture2D(); tex.image = img;
                const sf = new SpriteFrame(); sf.texture = tex;
                const sp = n.addComponent(Sprite);
                sp.spriteFrame = sf; sp.sizeMode = Sprite.SizeMode.CUSTOM;
                n.getComponent(UITransform)!.setContentSize(64, 64);
                tween(n).repeatForever(
                    tween(n).to(0.5, { position: v3(x, y + 8, 0) }, { easing: 'sineInOut' })
                        .to(0.5, { position: v3(x, y, 0) }, { easing: 'sineInOut' })
                ).start();
            } else if (n.isValid) {
                const g = n.addComponent(Graphics);
                g.fillColor = new Color(248, 200, 216, 255); g.circle(0, 6, 22); g.fill();
                g.lineWidth = 3; g.strokeColor = new Color(212, 83, 126, 255); g.circle(0, 6, 22); g.stroke();
                g.fillColor = new Color(58, 32, 48, 255); g.circle(-8, 8, 3.5); g.fill(); g.circle(8, 8, 3.5); g.fill();
            }
        });
    }

    // ---------- 体力耗尽弹层 ----------
    private showNoLife() {
        const canvas = find('Canvas'); if (!canvas) return;
        const W = this.W, H = this.H;
        const layer = this.mk(canvas, 'nolife'); layer.setPosition(0, 0, 0);
        layer.addComponent(UITransform).setContentSize(W, H);
        const dg = layer.addComponent(Graphics); dg.fillColor = new Color(30, 20, 40, 160); dg.rect(-W / 2, -H / 2, W, H); dg.fill();
        layer.on(Node.EventType.TOUCH_END, () => { });

        const cw = W * 0.78, ch = 440;
        const card = uiSprite(layer, 'panel_cream', cw, ch, 0, 0, true);
        this.label(card, '体力耗尽', 44, 0, ch / 2 - 64, new Color(190, 60, 60, 255), true);
        this.label(card, '体力为 0,等待恢复或用钻石补满', 24, 0, ch / 2 - 122, new Color(120, 112, 100, 255));
        uiSprite(card, 'icon_heart', 52, 52, -60, 8);
        this.label(card, `${GameData.lives}/${GameData.livesMax}`, 34, 12, 8, new Color(74, 74, 70, 255), true);

        const close = uiSprite(card, 'orb_close', 60, 60, cw / 2 - 30, ch / 2 - 30);
        close.on(Node.EventType.TOUCH_END, () => layer.destroy());

        const lifeItem = SHOP_ITEMS.find(s => s.id === 'life_full');
        const cost = lifeItem && lifeItem.cost.diamond ? lifeItem.cost.diamond : 10;
        const buy = uiButton(card, 'btn_blue', `钻石补满 × ${cost}`, 0, -66, cw * 0.72, 82, 30, () => {
            if (GameData.buyShopItem('life_full')) { layer.destroy(); this.refreshLife(); this.toast('体力已补满'); }
            else this.toast('钻石不足');
        });
        uiSprite(buy, 'icon_diamond', 36, 36, -cw * 0.36 + 40, 2);
        uiButton(card, 'btn_gray', '关闭', 0, -160, cw * 0.72, 76, 28, () => layer.destroy());

        card.setScale(0.85, 0.85, 1);
        tween(card).to(0.16, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    private refreshLife = () => {
        if (!this.lifeLabel) return;
        GameData.tickLives();
        if (GameData.lives >= GameData.livesMax) { this.lifeLabel.string = GameData.lives + '/' + GameData.livesMax; return; }
        const s = Math.max(0, Math.ceil(GameData.msToNextLife() / 1000));
        const m = Math.floor(s / 60), ss = s % 60;
        this.lifeLabel.string = `${GameData.lives} ${m}:${ss < 10 ? '0' : ''}${ss}`;
    };
}
