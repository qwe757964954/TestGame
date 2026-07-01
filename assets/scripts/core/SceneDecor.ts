import { _decorator, Component, Node, Graphics, Color, Label, Sprite, UITransform, find, Layers, view, ResolutionPolicy, tween, v3, Vec3, UIOpacity, director } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, DropInfo } from './GameManager';
import { RARITY_PILL } from './Characters';
import { GameData, PropKey, PROP_LABELS, REVIVE_COST } from './GameData';
import { Theme, themeFor, themeIndexFor } from './Themes';
const { ccclass } = _decorator;

/**
 * 场景装饰 + 自适应布局 + HUD/道具按钮。挂在 GameRoot 上。
 */
@ccclass('SceneDecor')
export class SceneDecor extends Component {
    public static instance: SceneDecor | null = null;

    private W = 720;
    private H = 1280;
    private slotY = -490;
    private topY = 530;
    private propY = -560;

    private remainLabel: Label | null = null;
    private comboLabel: Label | null = null;
    private titleLabel: Label | null = null;
    private ratingLabel: Label | null = null;
    private bgGfx: Graphics | null = null;
    private themeIdx = -1;
    private _combo = 0;
    private _score = 0;
    private _popup: Node | null = null;

    get score(): number { return this._score; }
    setLevel(level: number) {
        const t = themeFor(level);
        if (this.titleLabel) this.titleLabel.string = 'Lv.' + level + ' · ' + t.name;
        const idx = themeIndexFor(level);
        if (idx !== this.themeIdx && this.bgGfx) { this.themeIdx = idx; this.drawBackground(t); } // 跨主题时重绘背景
    }

    /** 本关实时评级:按卡槽占用算 1~5 星(越空越高),并随安全度变色 */
    setRating(count: number, cap: number) {
        if (!this.ratingLabel) return;
        const ratio = count / cap;
        const stars = ratio <= 0.15 ? 5 : ratio < 0.4 ? 4 : ratio < 0.6 ? 3 : ratio < 0.8 ? 2 : 1;
        this.ratingLabel.string = '★★★★★☆☆☆☆☆'.substr(5 - stars, 5);
        this.ratingLabel.color = stars >= 4 ? new Color(120, 190, 60, 255)
            : stars >= 2 ? new Color(239, 159, 39, 255) : new Color(226, 75, 74, 255);
    }

    /** 居中提示文字,上浮淡出 */
    toast(text: string) {
        const canvas = find('Canvas'); if (!canvas) return;
        const n = this.mkNode(canvas, 'toast'); n.setPosition(0, 170, 0);
        const op = n.addComponent(UIOpacity);
        const l = n.addComponent(Label);
        l.string = text; l.fontSize = 38; l.color = new Color(226, 75, 74, 255);
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 220); l.outlineWidth = 3;
        tween(n).to(0.6, { position: v3(0, 240, 0) }).call(() => n.destroy()).start();
        tween(op).delay(0.4).to(0.4, { opacity: 0 }).start();
    }

    onLoad() {
        SceneDecor.instance = this;
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);
    }

    start() {
        const canvas = find('Canvas') ?? this.node.parent!;
        const vs = view.getVisibleSize();
        this.W = vs.width;
        this.H = vs.height;
        this.slotY = -this.H / 2 + 300;
        this.propY = -this.H / 2 + 120;
        this.topY = this.H / 2 - 110;

        const slotBar = this.node.getChildByName('SlotBar');
        if (slotBar) {
            slotBar.setPosition(0, this.slotY, 0);
            const slotRoot = slotBar.getChildByName('SlotRoot');
            if (slotRoot) slotRoot.setPosition(0, 0, 0);
        }
        const board = this.node.getChildByName('BoardRoot');
        if (board) board.setPosition(0, 40, 0);

        this.buildBackground(canvas);
        this.buildSlotBar(canvas);
        this.buildHUD(canvas);
        this.buildProps(canvas);

        if (GameManager.instance) {
            this.setRemaining(GameManager.instance.remaining);
            this.setLevel(GameManager.instance.level);
        }
    }

    // ---------- HUD 动态接口 ----------
    setRemaining(n: number) { if (this.remainLabel) this.remainLabel.string = '剩余 ' + n; }

    /** 一次三连消除:加连击、计分、在消除处飘出 +分数 */
    onMatch(worldPos?: Vec3) {
        this._combo++;
        GameData.addDailyMatch(1); // 每日任务:消除组数
        if (this.comboLabel) this.comboLabel.string = '连击 ×' + this._combo;
        const points = 100 * this._combo;
        this._score += points;
        if (worldPos) {
            const txt = this._combo > 1 ? `+${points}  连击×${this._combo}` : `+${points}`;
            this.floatText(txt, worldPos, new Color(255, 176, 32, 255));
        }
        this.unschedule(this._resetCombo);
        this.scheduleOnce(this._resetCombo, 3);
    }
    private _resetCombo = () => { this._combo = 0; if (this.comboLabel) this.comboLabel.string = '连击 ×0'; };

    /** 新一局:清零分数/连击、移除弹窗 */
    onNewGame() {
        this._score = 0; this._combo = 0;
        if (this.comboLabel) this.comboLabel.string = '连击 ×0';
        this.clearPopup();
    }

    /** 飘字:在世界坐标处冒出文字,上浮淡出 */
    private floatText(text: string, worldPos: Vec3, color: Color) {
        const canvas = find('Canvas'); if (!canvas) return;
        const local = canvas.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
        const n = this.mkNode(canvas, 'float');
        n.setPosition(local.x, local.y, 0);
        const op = n.addComponent(UIOpacity);
        const l = n.addComponent(Label);
        l.string = text; l.fontSize = 40; l.color = color;
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 220); l.outlineWidth = 3;
        tween(n).to(0.7, { position: v3(local.x, local.y + 130, 0) }, { easing: 'quadOut' })
            .call(() => n.destroy()).start();
        tween(op).delay(0.3).to(0.4, { opacity: 0 }).start();
    }

    // ---------- 胜利 / 失败弹窗 ----------
    showWin(score: number, drop: DropInfo) { this.buildWinPopup(score, drop); }
    showLose(score: number) { this.buildLosePopup(score); }
    clearPopup() { if (this._popup) { this._popup.destroy(); this._popup = null; } }

    /** 半透明遮罩 + 居中白卡,返回 card 节点 */
    private makeOverlayCard(cardW: number, cardH: number): Node {
        this.clearPopup();
        const canvas = find('Canvas')!;
        const overlay = this.mkNode(canvas, 'Popup');
        this._popup = overlay;
        overlay.addComponent(UITransform).setContentSize(this.W, this.H);
        const dg = overlay.addComponent(Graphics);
        dg.fillColor = new Color(20, 30, 15, 150);
        dg.rect(-this.W / 2, -this.H / 2, this.W, this.H); dg.fill();
        overlay.on(Node.EventType.TOUCH_END, () => { });
        const card = this.mkNode(overlay, 'card');
        const cg = card.addComponent(Graphics);
        cg.fillColor = new Color(255, 255, 255, 255);
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 40); cg.fill();
        // 弹出动画
        card.setScale(0.7, 0.7, 1);
        tween(card).to(0.22, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        return card;
    }

    private buildWinPopup(score: number, drop: DropInfo) {
        const card = this.makeOverlayCard(580, 720);

        this.cardLabel(card, '通关!', 60, 300, new Color(39, 80, 10, 255));
        this.cardLabel(card, '评价 · 完美 Perfect', 24, 248, new Color(120, 120, 116, 255));
        this.pill(card, '金 +' + drop.coinReward, 0, 200, 160, new Color(250, 199, 117, 255), new Color(99, 56, 6, 255));

        // 新角色面板
        const panel = this.mkNode(card, 'panel'); panel.setPosition(0, 50, 0);
        const pg = panel.addComponent(Graphics);
        pg.fillColor = new Color(238, 237, 254, 255); pg.roundRect(-190, -125, 380, 250, 28); pg.fill();
        pg.lineWidth = 3; pg.strokeColor = new Color(127, 119, 221, 255); pg.roundRect(-190, -125, 380, 250, 28); pg.stroke();
        this.cardLabel(panel, drop.isNew ? '获得新角色!' : '获得角色', 24, 96, new Color(60, 52, 137, 255));
        const avBg = this.mkNode(panel, 'avbg'); avBg.setPosition(0, 22, 0);
        const ag = avBg.addComponent(Graphics);
        ag.fillColor = new Color(206, 203, 246, 255); ag.circle(0, 0, 50); ag.fill();
        ag.lineWidth = 5; ag.strokeColor = new Color(127, 119, 221, 255); ag.circle(0, 0, 50); ag.stroke();
        const av = this.mkNode(avBg, 'av'); av.addComponent(UITransform).setContentSize(84, 84);
        const sp = av.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM;
        const gm = GameManager.instance;
        if (gm && gm.iconFrames[drop.typeId]) sp.spriteFrame = gm.iconFrames[drop.typeId];
        this.cardLabel(panel, drop.name, 26, -56, new Color(60, 52, 137, 255));
        const rp = RARITY_PILL[drop.rarity] || RARITY_PILL['普通'];
        this.pill(panel, drop.rarity, 0, -98, 150, new Color(rp.bg[0], rp.bg[1], rp.bg[2], 255), new Color(rp.tc[0], rp.tc[1], rp.tc[2], 255));

        // 图鉴进度
        const before = drop.isNew ? drop.collected - 1 : drop.collected;
        const prog = drop.isNew ? `${before} → ${drop.collected} / ${drop.total}` : `${drop.collected} / ${drop.total}`;
        this.cardLabel(card, '图鉴收集', 22, -112, new Color(120, 120, 116, 255), -150);
        this.cardLabel(card, prog, 22, -112, new Color(83, 74, 183, 255), 150);
        const bar = this.mkNode(card, 'bar'); bar.setPosition(0, -144, 0);
        const bg = bar.addComponent(Graphics);
        bg.fillColor = new Color(225, 222, 213, 255); bg.roundRect(-230, -7, 460, 14, 7); bg.fill();
        const ratio = Math.max(0.02, drop.collected / drop.total);
        bg.fillColor = new Color(127, 119, 221, 255); bg.roundRect(-230, -7, 460 * ratio, 14, 7); bg.fill();
        const left = Math.max(0, drop.total - drop.collected);
        this.cardLabel(card, left > 0 ? `再集齐 ${left} 个集满图鉴` : '图鉴已集齐!', 20, -176, new Color(133, 79, 11, 255));

        this.popupButton(card, '下一关', 0, -238, 460, new Color(29, 158, 117, 255),
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.nextLevel(); });
        this.popupButton(card, '再玩一次', -120, -316, 220, new Color(160, 158, 150, 255),
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.restart(); });
        this.popupButton(card, '看图鉴', 120, -316, 220, new Color(160, 158, 150, 255),
            () => { this.clearPopup(); director.loadScene('Codex'); });
    }

    private buildLosePopup(score: number) {
        const card = this.makeOverlayCard(560, 560);
        this.cardLabel(card, '失败', 60, 210, new Color(120, 40, 40, 255));
        this.cardLabel(card, '卡槽满了', 24, 150, new Color(120, 120, 116, 255));
        this.cardLabel(card, '得分 ' + score, 40, 92, new Color(74, 74, 70, 255));

        // 复活:扣钻石,移出 3 张腾位继续
        const canRevive = GameData.diamonds >= REVIVE_COST;
        this.popupButton(card, `钻石复活  钻${REVIVE_COST}`, 0, 14, 420,
            canRevive ? new Color(91, 160, 214, 255) : new Color(180, 188, 196, 255),
            () => {
                if (!GameData.spendDiamonds(REVIVE_COST)) { this.toast('钻石不足'); return; }
                this.clearPopup();
                GameManager.instance && GameManager.instance.revive();
            });
        this.popupButton(card, '重玩', 0, -74, 420, new Color(29, 158, 117, 255),
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.restart(); });
        this.popupButton(card, '返回选关', 0, -162, 420, new Color(160, 158, 150, 255),
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.backToLevels(); });
    }

    private cardLabel(parent: Node, text: string, size: number, y: number, color: Color, x = 0) {
        const n = this.mkNode(parent, 'l'); n.setPosition(x, y, 0);
        const l = n.addComponent(Label); l.string = text; l.fontSize = size; l.color = color;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
    }

    private pill(parent: Node, text: string, x: number, y: number, w: number, bg: Color, tc: Color) {
        const h = 44;
        const n = this.mkNode(parent, 'pill'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics); g.fillColor = bg; g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill();
        const t = this.mkNode(n, 't'); const l = t.addComponent(Label);
        l.string = text; l.fontSize = 24; l.color = tc;
    }

    private popupButton(parent: Node, text: string, x: number, y: number, w: number, color: Color, onTap: () => void) {
        const h = 72;
        const n = this.mkNode(parent, 'btn_' + text); n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.fillColor = color; g.roundRect(-w / 2, -h / 2, w, h, 22); g.fill();
        const t = this.mkNode(n, 't'); const l = t.addComponent(Label);
        l.string = text; l.fontSize = 32; l.color = Color.WHITE;
        n.on(Node.EventType.TOUCH_END, () => {
            tween(n).to(0.06, { scale: v3(0.92, 0.92, 1) }).to(0.08, { scale: v3(1, 1, 1) })
                .call(() => onTap()).start();
        });
    }

    // ---------- 构建 ----------
    private mkNode(parent: Node, name: string, sibling = -1): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        parent.addChild(n);
        n.setPosition(0, 0, 0);
        if (sibling >= 0) n.setSiblingIndex(sibling);
        return n;
    }
    private gfx(parent: Node, name: string, sibling = -1): Graphics {
        return this.mkNode(parent, name, sibling).addComponent(Graphics);
    }
    private rr(g: Graphics, x: number, y: number, w: number, h: number, r: number, c: Color) {
        g.fillColor = c; g.roundRect(x, y, w, h, r); g.fill();
    }
    private circ(g: Graphics, x: number, y: number, r: number, c: Color) {
        g.fillColor = c; g.circle(x, y, r); g.fill();
    }

    private buildBackground(canvas: Node) {
        this.bgGfx = this.gfx(canvas, 'Decor_BG', 0);
        const lvl = GameManager.instance ? GameManager.instance.level : (GameData.playLevel || 1);
        this.themeIdx = themeIndexFor(lvl);
        this.drawBackground(themeFor(lvl));
    }

    /** 按主题配色绘制背景(可重绘) */
    private drawBackground(t: Theme) {
        const g = this.bgGfx; if (!g) return;
        g.clear();
        const W = this.W, H = this.H;
        const C = (a: number[], alpha = 255) => new Color(a[0], a[1], a[2], alpha);
        const lighter = (a: number[]) => new Color(Math.min(255, a[0] + 18), Math.min(255, a[1] + 14), Math.min(255, a[2] + 14), 220);
        this.rr(g, -W / 2, -H / 2, W, H, 0, C(t.sky));
        this.rr(g, -W / 2, -H / 2, W, H * 0.45, 0, C(t.skyTop));
        this.circ(g, -W * 0.30, H * 0.30, 70, C(t.cloud, 120));
        this.circ(g, -W * 0.16, H * 0.28, 52, C(t.cloud, 120));
        this.circ(g, W * 0.30, H * 0.33, 80, C(t.cloud, 110));
        const iw = W * 0.94, ix = -iw / 2;
        const iy = this.slotY + 60;
        const ih = (this.topY - 70) - iy;
        this.rr(g, ix, iy - 14, iw, ih, 72, C(t.groundDark));
        this.rr(g, ix, iy, iw, ih, 72, C(t.ground));
        this.rr(g, ix + 16, iy + ih - 70, iw - 32, 50, 26, lighter(t.ground));
        this.circ(g, ix + 54, iy, 62, C(t.cloud));
        this.circ(g, ix + iw * 0.34, iy - 18, 80, C(t.cloud));
        this.circ(g, ix + iw * 0.66, iy - 16, 76, C(t.cloud));
        this.circ(g, ix + iw - 54, iy, 60, C(t.cloud));
    }

    private buildSlotBar(canvas: Node) {
        const g = this.gfx(canvas, 'Decor_SlotBar', 1);
        const cap = GameConfig.SLOT_CAPACITY;
        const step = GameConfig.TILE_SIZE;
        const y = this.slotY;
        const barW = step * cap + 36, barH = 116;
        this.rr(g, -barW / 2, y - barH / 2, barW, barH, 28, new Color(233, 230, 221, 255));
        const s = 78;
        for (let i = 0; i < cap; i++) {
            const cx = (i - (cap - 1) / 2) * step;
            this.rr(g, cx - s / 2, y - s / 2, s, s, 18, new Color(214, 208, 192, 255));
        }
        g.lineWidth = 3; g.strokeColor = new Color(199, 187, 158, 255);
        g.roundRect(-barW / 2, y - barH / 2, barW, barH, 28); g.stroke();
    }

    private buildHUD(canvas: Node) {
        const W = this.W;
        const g = this.gfx(canvas, 'Decor_HUD');
        const topY = this.topY;
        this.rr(g, -W * 0.46, topY - 70, W * 0.92, 140, 30, new Color(255, 255, 255, 235));
        this.titleLabel = this.label(canvas, 'Lv.1 · ' + themeFor(1).name, 34, topY + 24, new Color(74, 74, 70, 255));
        // 返回关卡选择
        const back = this.mkNode(canvas, 'homebtn'); back.setPosition(-W / 2 + 56, topY + 14, 0);
        back.addComponent(UITransform).setContentSize(72, 60);
        const bgk = back.addComponent(Graphics);
        bgk.fillColor = new Color(240, 238, 230, 255); bgk.roundRect(-36, -30, 72, 60, 14); bgk.fill();
        bgk.lineWidth = 2; bgk.strokeColor = new Color(0, 0, 0, 40); bgk.roundRect(-36, -30, 72, 60, 14); bgk.stroke();
        const bl = this.mkNode(back, 'l').addComponent(Label); bl.string = '‹'; bl.fontSize = 44; bl.color = new Color(90, 90, 84, 255);
        back.on(Node.EventType.TOUCH_END, () => GameManager.instance && GameManager.instance.backToLevels());
        this.ratingLabel = this.label(canvas, '★★★★★', 30, topY - 14, new Color(120, 190, 60, 255));
        this.remainLabel = this.label(canvas, '剩余 36', 26, topY - 52, new Color(24, 95, 165, 255), -W * 0.22);
        this.comboLabel = this.label(canvas, '连击 ×0', 26, topY - 52, new Color(133, 79, 11, 255), W * 0.22);
    }

    private label(parent: Node, text: string, size: number, y: number, color: Color, x = 0): Label {
        const n = this.mkNode(parent, 'HUD_' + text);
        n.setPosition(x, y, 0);
        const l = n.addComponent(Label);
        l.string = text; l.fontSize = size; l.lineHeight = size + 4;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.color = color;
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 200); l.outlineWidth = 2;
        return l;
    }

    // ---------- 底部道具按钮 ----------
    private buildProps(canvas: Node) {
        this.makeProp(canvas, 'undo', -210, () => !!(GameManager.instance && GameManager.instance.doUndo()));
        this.makeProp(canvas, 'shuffle', 0, () => !!(GameManager.instance && GameManager.instance.doShuffle()));
        this.makeProp(canvas, 'eject', 210, () => !!(GameManager.instance && GameManager.instance.doEject()));
    }

    /** 道具按钮:数量直接来自 GameData.props(真实存档),使用成功后扣减并存档。 */
    private makeProp(parent: Node, key: PropKey, x: number, action: () => boolean) {
        const name = PROP_LABELS[key];
        const w = 190, h = 92, y = this.propY;
        const node = this.mkNode(parent, 'Prop_' + name);
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(w, h);

        const g = node.addComponent(Graphics);
        const drawBg = (enabled: boolean) => {
            g.clear();
            g.fillColor = enabled ? new Color(243, 239, 230, 255) : new Color(206, 204, 196, 255);
            g.roundRect(-w / 2, -h / 2, w, h, 20); g.fill();
            g.lineWidth = 3; g.strokeColor = new Color(207, 195, 166, 255);
            g.roundRect(-w / 2, -h / 2, w, h, 20); g.stroke();
        };

        const lbl = this.mkNode(node, 't'); lbl.setPosition(0, 0, 0);
        const l = lbl.addComponent(Label); l.string = name; l.fontSize = 30;
        l.color = new Color(90, 85, 76, 255);

        const badge = this.mkNode(node, 'b'); badge.setPosition(w / 2 - 14, h / 2 - 12, 0);
        const bg2 = badge.addComponent(Graphics); bg2.fillColor = new Color(226, 75, 74, 255);
        bg2.circle(0, 0, 16); bg2.fill();
        const blN = this.mkNode(badge, 'bt'); const bl = blN.addComponent(Label);
        bl.fontSize = 20; bl.color = Color.WHITE;

        const refresh = () => {
            const cnt = GameData.props[key];
            bl.string = '' + cnt;
            badge.active = cnt > 0;
            drawBg(cnt > 0);
        };
        refresh();

        node.on(Node.EventType.TOUCH_END, () => {
            tween(node).to(0.06, { scale: v3(0.9, 0.9, 1) }).to(0.08, { scale: v3(1, 1, 1) }).start();
            if (GameData.props[key] <= 0) { this.toast('道具不足,去商店补充'); return; }
            if (action()) { GameData.useProp(key); refresh(); }
        });
    }
}
