import { _decorator, Component, Node, Graphics, Color, Label, Sprite, UITransform, find, Layers, view, ResolutionPolicy, tween, v3, Vec3, UIOpacity, director } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, DropInfo } from './GameManager';
import { RARITY_PILL } from './Characters';
import { GameData, PropKey, PROP_LABELS, REVIVE_COST } from './GameData';
import { Theme, themeFor, themeIndexFor } from './Themes';
import { loadUI, uiSprite, uiButton, uiFrame } from './UIKit';
const { ccclass } = _decorator;

/**
 * 场景装饰 + 自适应布局 + HUD/道具按钮(贴图化)。挂在 GameRoot 上。
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
    private ratingStars: Sprite[] = [];
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

    /** 本关实时评级:按卡槽占用算 1~5 星(越空越高) */
    setRating(count: number, cap: number) {
        if (this.ratingStars.length === 0) return;
        const ratio = count / cap;
        const stars = ratio <= 0.15 ? 5 : ratio < 0.4 ? 4 : ratio < 0.6 ? 3 : ratio < 0.8 ? 2 : 1;
        this.ratingStars.forEach((sp, i) => {
            sp.spriteFrame = uiFrame(i < stars ? 'icon_star' : 'icon_star_gray');
        });
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

        loadUI(() => {
            this.buildBackground(canvas);
            this.buildSlotBar(canvas);
            this.buildHUD(canvas);
            this.buildProps(canvas);

            if (GameManager.instance) {
                this.setRemaining(GameManager.instance.remaining);
                this.setLevel(GameManager.instance.level);
            }
        });
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

    /** 半透明遮罩 + 奶油面板,返回 card 节点 */
    private makeOverlayCard(cardW: number, cardH: number): Node {
        this.clearPopup();
        const canvas = find('Canvas')!;
        const overlay = this.mkNode(canvas, 'Popup');
        this._popup = overlay;
        overlay.addComponent(UITransform).setContentSize(this.W, this.H);
        const dg = overlay.addComponent(Graphics);
        dg.fillColor = new Color(30, 20, 40, 170);
        dg.rect(-this.W / 2, -this.H / 2, this.W, this.H); dg.fill();
        overlay.on(Node.EventType.TOUCH_END, () => { });
        const card = uiSprite(overlay, 'panel_cream', cardW, cardH, 0, 0, true);
        // 弹出动画
        card.setScale(0.7, 0.7, 1);
        tween(card).to(0.22, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        return card;
    }

    private buildWinPopup(score: number, drop: DropInfo) {
        const card = this.makeOverlayCard(580, 760);
        const ch = 760;

        // 三颗大金星(拱形)+ 橙色横幅
        const starY = ch / 2 - 10;
        const stars = [
            uiSprite(card, 'star_big', 76, 76, -96, starY - 14),
            uiSprite(card, 'star_big', 100, 100, 0, starY + 16),
            uiSprite(card, 'star_big', 76, 76, 96, starY - 14),
        ];
        stars[0].angle = 14; stars[2].angle = -14;
        stars.forEach((s, i) => {
            s.setScale(0, 0, 1);
            tween(s).delay(0.15 + i * 0.14).to(0.25, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        });
        const banner = uiSprite(card, 'banner_orange', 420, 112, 0, ch / 2 - 108);
        const bt = this.cardLabelOn(banner, '通关成功!', 44, 0, 4, Color.WHITE);
        bt.enableOutline = true; bt.outlineColor = new Color(160, 90, 0, 220); bt.outlineWidth = 3;

        this.cardLabel(card, '得分:' + score, 36, 180, new Color(120, 90, 40, 255), 0, true);

        // 金币奖励胶囊
        const pill = uiSprite(card, 'hud_pill', 190, 58, 0, 122, true);
        uiSprite(pill, 'icon_coin', 46, 46, -70, 2);
        this.cardLabelOn(pill, '+' + drop.coinReward, 28, 12, 1, new Color(122, 90, 38, 255), true);

        // 新角色面板
        const panel = this.mkNode(card, 'panel'); panel.setPosition(0, -32, 0);
        const pg = panel.addComponent(Graphics);
        pg.fillColor = new Color(238, 237, 254, 255); pg.roundRect(-190, -118, 380, 236, 28); pg.fill();
        pg.lineWidth = 3; pg.strokeColor = new Color(127, 119, 221, 255); pg.roundRect(-190, -118, 380, 236, 28); pg.stroke();
        this.cardLabel(panel, drop.isNew ? '✨ 获得新角色!' : '获得角色', 24, 88, new Color(60, 52, 137, 255), 0, true);
        const avBg = this.mkNode(panel, 'avbg'); avBg.setPosition(0, 18, 0);
        const ag = avBg.addComponent(Graphics);
        ag.fillColor = new Color(206, 203, 246, 255); ag.circle(0, 0, 48); ag.fill();
        ag.lineWidth = 5; ag.strokeColor = new Color(127, 119, 221, 255); ag.circle(0, 0, 48); ag.stroke();
        const av = this.mkNode(avBg, 'av'); av.addComponent(UITransform).setContentSize(80, 80);
        const sp = av.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM;
        const gm = GameManager.instance;
        if (gm && gm.iconFrames[drop.typeId]) sp.spriteFrame = gm.iconFrames[drop.typeId];
        this.cardLabel(panel, drop.name, 26, -54, new Color(60, 52, 137, 255), 0, true);
        const rp = RARITY_PILL[drop.rarity] || RARITY_PILL['普通'];
        this.pill(panel, drop.rarity, 0, -92, 150, new Color(rp.bg[0], rp.bg[1], rp.bg[2], 255), new Color(rp.tc[0], rp.tc[1], rp.tc[2], 255));

        // 图鉴进度
        const before = drop.isNew ? drop.collected - 1 : drop.collected;
        const prog = drop.isNew ? `${before} → ${drop.collected} / ${drop.total}` : `${drop.collected} / ${drop.total}`;
        this.cardLabel(card, '图鉴收集', 22, -178, new Color(120, 120, 116, 255), -150);
        this.cardLabel(card, prog, 22, -178, new Color(83, 74, 183, 255), 150);
        const bar = this.mkNode(card, 'bar'); bar.setPosition(0, -208, 0);
        const bg = bar.addComponent(Graphics);
        bg.fillColor = new Color(225, 222, 213, 255); bg.roundRect(-230, -8, 460, 16, 8); bg.fill();
        const ratio = Math.max(0.02, drop.collected / drop.total);
        bg.fillColor = new Color(127, 119, 221, 255); bg.roundRect(-230, -8, 460 * ratio, 16, 8); bg.fill();
        bg.fillColor = new Color(255, 255, 255, 90); bg.roundRect(-227, -1, Math.max(4, 460 * ratio - 6), 6, 3); bg.fill();

        uiButton(card, 'btn_green', '下一关', 0, -272, 460, 92, 36,
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.nextLevel(); },
            new Color(62, 138, 30, 200));
        uiButton(card, 'btn_blue', '再玩一次', -120, -348, 220, 74, 26,
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.restart(); },
            new Color(30, 100, 170, 200));
        uiButton(card, 'btn_yellow', '看图鉴', 120, -348, 220, 74, 26,
            () => { this.clearPopup(); director.loadScene('Codex'); },
            new Color(180, 110, 20, 200));
    }

    private buildLosePopup(score: number) {
        const card = this.makeOverlayCard(560, 600);
        const ch = 600;

        // 哭脸角色 + 紫色横幅
        const face = this.mkNode(card, 'face'); face.setPosition(0, ch / 2 + 10, 0);
        face.addComponent(UITransform).setContentSize(130, 130);
        const fsp = face.addComponent(Sprite); fsp.sizeMode = Sprite.SizeMode.CUSTOM;
        const gm = GameManager.instance;
        if (gm && gm.iconFrames.length > 0) fsp.spriteFrame = gm.iconFrames[0];
        face.angle = -8;
        tween(face).repeatForever(
            tween(face).to(0.7, { angle: 8 }, { easing: 'sineInOut' }).to(0.7, { angle: -8 }, { easing: 'sineInOut' })
        ).start();

        const banner = uiSprite(card, 'banner_purple', 420, 112, 0, ch / 2 - 92);
        const bt = this.cardLabelOn(banner, '挑战失败!', 44, 0, 4, Color.WHITE);
        bt.enableOutline = true; bt.outlineColor = new Color(70, 40, 130, 220); bt.outlineWidth = 3;

        this.cardLabel(card, '卡槽满了,差一点点!', 24, 116, new Color(120, 112, 100, 255));
        this.cardLabel(card, '得分:' + score, 38, 62, new Color(120, 90, 40, 255), 0, true);

        // 复活:扣钻石,移出 3 张腾位继续
        const canRevive = GameData.diamonds >= REVIVE_COST;
        const revive = uiButton(card, canRevive ? 'btn_yellow' : 'btn_gray', `钻石复活 × ${REVIVE_COST}`, 0, -22, 420, 88, 30,
            () => {
                if (!GameData.spendDiamonds(REVIVE_COST)) { this.toast('钻石不足'); return; }
                this.clearPopup();
                GameManager.instance && GameManager.instance.revive();
            }, new Color(180, 110, 20, 200));
        uiSprite(revive, 'icon_diamond', 40, 40, -150, 2);

        uiButton(card, 'btn_green', '重玩本关', 0, -116, 420, 84, 30,
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.restart(); },
            new Color(62, 138, 30, 200));
        uiButton(card, 'btn_purple', '返回选关', 0, -204, 420, 80, 28,
            () => { this.clearPopup(); GameManager.instance && GameManager.instance.backToLevels(); },
            new Color(90, 60, 160, 200));
    }

    private cardLabel(parent: Node, text: string, size: number, y: number, color: Color, x = 0, bold = false): Label {
        const n = this.mkNode(parent, 'l'); n.setPosition(x, y, 0);
        const l = n.addComponent(Label); l.string = text; l.fontSize = size; l.lineHeight = size + 6; l.color = color; l.isBold = bold;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        return l;
    }
    private cardLabelOn(parent: Node, text: string, size: number, x: number, y: number, color: Color, bold = true): Label {
        return this.cardLabel(parent, text, size, y, color, x, bold);
    }

    private pill(parent: Node, text: string, x: number, y: number, w: number, bg: Color, tc: Color) {
        const h = 44;
        const n = this.mkNode(parent, 'pill'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics); g.fillColor = bg; g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill();
        const t = this.mkNode(n, 't'); const l = t.addComponent(Label);
        l.string = text; l.fontSize = 24; l.color = tc;
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
        // 描边 + 奶油底(与面板风格统一)
        this.rr(g, -barW / 2 - 4, y - barH / 2 - 8, barW + 8, barH + 8, 32, new Color(201, 169, 106, 200));
        this.rr(g, -barW / 2, y - barH / 2, barW, barH, 28, new Color(255, 251, 238, 255));
        const s = 78;
        for (let i = 0; i < cap; i++) {
            const cx = (i - (cap - 1) / 2) * step;
            this.rr(g, cx - s / 2, y - s / 2, s, s, 18, new Color(240, 232, 212, 255));
        }
        g.lineWidth = 3; g.strokeColor = new Color(226, 211, 180, 255);
        for (let i = 0; i < cap; i++) {
            const cx = (i - (cap - 1) / 2) * step;
            g.roundRect(cx - s / 2, y - s / 2, s, s, 18); g.stroke();
        }
    }

    private buildHUD(canvas: Node) {
        const W = this.W;
        const topY = this.topY;
        // 顶部奶油面板
        uiSprite(canvas, 'panel_cream', W * 0.92, 150, 0, topY, true);
        this.titleLabel = this.label(canvas, 'Lv.1 · ' + themeFor(1).name, 32, topY + 34, new Color(122, 90, 38, 255), 0, true);
        // 返回选关
        const back = uiSprite(canvas, 'orb_back', 64, 64, -W / 2 + 60, topY + 24);
        back.on(Node.EventType.TOUCH_END, () => GameManager.instance && GameManager.instance.backToLevels());
        // 星级(贴图)
        this.ratingStars = [];
        for (let i = 0; i < 5; i++) {
            const s = uiSprite(canvas, 'icon_star', 34, 34, (i - 2) * 40, topY - 12);
            this.ratingStars.push(s.getComponent(Sprite)!);
        }
        this.remainLabel = this.label(canvas, '剩余 36', 26, topY - 52, new Color(24, 95, 165, 255), -W * 0.22);
        this.comboLabel = this.label(canvas, '连击 ×0', 26, topY - 52, new Color(133, 79, 11, 255), W * 0.22);
    }

    private label(parent: Node, text: string, size: number, y: number, color: Color, x = 0, bold = false): Label {
        const n = this.mkNode(parent, 'HUD_' + text);
        n.setPosition(x, y, 0);
        const l = n.addComponent(Label);
        l.string = text; l.fontSize = size; l.lineHeight = size + 4; l.isBold = bold;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.color = color;
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 200); l.outlineWidth = 2;
        return l;
    }

    // ---------- 底部道具按钮 ----------
    private buildProps(canvas: Node) {
        this.makeProp(canvas, 'undo', 'icon_undo', -210, () => !!(GameManager.instance && GameManager.instance.doUndo()));
        this.makeProp(canvas, 'shuffle', 'icon_shuffle', 0, () => !!(GameManager.instance && GameManager.instance.doShuffle()));
        this.makeProp(canvas, 'eject', 'icon_eject', 210, () => !!(GameManager.instance && GameManager.instance.doEject()));
    }

    /** 道具按钮:蓝色方钮 + 白图标 + 数量角标。数量来自 GameData.props,使用成功后扣减并存档。 */
    private makeProp(parent: Node, key: PropKey, icon: 'icon_undo' | 'icon_shuffle' | 'icon_eject', x: number, action: () => boolean) {
        const name = PROP_LABELS[key];
        const y = this.propY;
        const node = uiSprite(parent, 'tile_blue', 112, 112, x, y, true);
        node.name = 'Prop_' + name;
        const iconNode = uiSprite(node, icon, 58, 58, 0, 12);
        const tileSp = node.getComponent(Sprite)!;
        const iconSp = iconNode.getComponent(Sprite)!;
        const l = this.cardLabel(node, name, 20, -34, Color.WHITE, 0, true);
        l.enableOutline = true; l.outlineColor = new Color(30, 90, 150, 200); l.outlineWidth = 2;

        // 数量角标
        const badge = uiSprite(node, 'badge_red', 36, 36, 44, 44);
        const bl = this.cardLabel(badge, '', 20, 2, Color.WHITE, 0, true);

        const refresh = () => {
            const cnt = GameData.props[key];
            bl.string = '' + cnt;
            badge.active = cnt > 0;
            const gray = cnt <= 0;
            tileSp.color = gray ? new Color(150, 150, 150, 255) : Color.WHITE;
            iconSp.color = gray ? new Color(210, 210, 210, 255) : Color.WHITE;
        };
        refresh();

        node.on(Node.EventType.TOUCH_END, () => {
            tween(node).to(0.06, { scale: v3(0.9, 0.9, 1) }).to(0.08, { scale: v3(1, 1, 1) }).start();
            if (GameData.props[key] <= 0) { this.toast('道具不足,去商店补充'); return; }
            if (action()) { GameData.useProp(key); refresh(); }
        });
    }
}
