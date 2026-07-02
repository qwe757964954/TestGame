import { _decorator, Component, Node, Graphics, Color, Label, UITransform, find, Layers, view, ResolutionPolicy, tween, v3, UIOpacity, director, Sprite, SpriteFrame, resources, ImageAsset, Texture2D } from 'cc';
import { GameData, fmt, SHOP_ITEMS, SIGNIN_REWARDS, ShopItem, PROP_LABELS, DAILY_TASKS, DailyTask } from './GameData';
import { isWeChat, postRankRender } from './Platform';
import { ensureCanvas } from './UIBoot';
import { loadUI, uiSprite, uiButton, uiPill } from './UIKit';
const { ccclass } = _decorator;

/** 开始页(程序化 UI + 贴图资源)。挂在场景里 Canvas 下的一个空节点上。 */
@ccclass('HomeScene')
export class HomeScene extends Component {
    private W = 720; private H = 1280;
    private coinLabel: Label | null = null;
    private diaLabel: Label | null = null;
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
        const n = this.mk(canvas, 'toast'); n.setPosition(0, 80, 0);
        const op = n.addComponent(UIOpacity);
        const l = n.addComponent(Label); l.string = text; l.fontSize = 36; l.color = new Color(226, 75, 74, 255);
        l.enableOutline = true; l.outlineColor = new Color(255, 255, 255, 220); l.outlineWidth = 3;
        tween(n).to(0.6, { position: v3(0, 150, 0) }).call(() => n.destroy()).start();
        tween(op).delay(0.4).to(0.4, { opacity: 0 }).start();
    }

    private build(canvas: Node) {
        const W = this.W, H = this.H;
        const g = this.gfx(canvas, 0);
        // 天空渐变(分层模拟)
        this.rr(g, -W / 2, -H / 2, W, H, 0, new Color(205, 235, 247, 255));
        this.rr(g, -W / 2, 0, W, H / 2, 0, new Color(186, 224, 240, 255));
        this.rr(g, -W / 2, H * 0.30, W, H * 0.20, 0, new Color(172, 216, 238, 255));
        // 云
        this.cloud(g, -W * 0.30, H * 0.31, 1.0);
        this.cloud(g, W * 0.30, H * 0.36, 1.2);
        this.cloud(g, W * 0.05, H * 0.44, 0.7);
        // 远景草丘
        g.fillColor = new Color(192, 221, 151, 255);
        g.moveTo(-W / 2, -H * 0.30); g.bezierCurveTo(-W * 0.2, -H * 0.22, W * 0.2, -H * 0.22, W / 2, -H * 0.30);
        g.lineTo(W / 2, -H / 2); g.lineTo(-W / 2, -H / 2); g.close(); g.fill();

        // ---- 顶部 HUD:金币 / 钻石 / 体力 + 设置 ----
        const hudY = H / 2 - 64;
        this.coinLabel = uiPill(canvas, 'icon_coin', -W / 2 + 122, hudY, 196, () => this.openShop());
        this.diaLabel = uiPill(canvas, 'icon_diamond', -W / 2 + 348, hudY, 150, () => this.openShop());
        this.lifeLabel = uiPill(canvas, 'icon_heart', W / 2 - 120, hudY, 190);
        this.refreshHUD();
        this.schedule(this.refreshHUD, 1);
        const gear = uiSprite(canvas, 'orb_gear', 64, 64, W / 2 - 52, hudY - 84);
        gear.on(Node.EventType.TOUCH_END, () => this.toast('设置 开发中'));

        // ---- 标题 ----
        const title = this.label(canvas, '萌物CC乐', 84, 0, H * 0.335, new Color(255, 118, 165, 255), true);
        title.enableOutline = true; title.outlineColor = new Color(255, 255, 255, 255); title.outlineWidth = 5;
        title.enableShadow = true; title.shadowColor = new Color(180, 60, 100, 120); title.shadowOffset.set(0, -5);
        const sub = this.label(canvas, 'Role Match · 集卡消除', 26, 0, H * 0.335 - 74, new Color(255, 255, 255, 255));
        sub.enableOutline = true; sub.outlineColor = new Color(150, 95, 115, 230); sub.outlineWidth = 3;

        // ---- 吉祥物(角色贴图,置于草台上) ----
        uiSprite(canvas, 'platform_grass', 380, 126, 0, H * 0.045 - 60);
        this.mascot(canvas, 0, H * 0.105);

        // ---- 开始游戏 ----
        uiButton(canvas, 'btn_green', '▶  开始游戏', 0, -H * 0.06, 460, 108, 42,
            () => director.loadScene('LevelSelect'), new Color(62, 138, 30, 200));

        // ---- 功能入口 ----
        const navY = -H * 0.24;
        const items: [string, 'tile_purple' | 'tile_yellow' | 'tile_blue' | 'tile_red', 'icon_book' | 'icon_shop' | 'icon_trophy' | 'icon_calendar'][] = [
            ['图鉴', 'tile_purple', 'icon_book'],
            ['商店', 'tile_yellow', 'icon_shop'],
            ['排行', 'tile_blue', 'icon_trophy'],
            ['签到', 'tile_red', 'icon_calendar'],
        ];
        items.forEach((it, i) => {
            const x = (i - 1.5) * 150;
            const n = uiSprite(canvas, it[1], 116, 116, x, navY, true);
            uiSprite(n, it[2], 66, 66, 0, 4);
            const t = this.label(canvas, it[0], 26, x, navY - 84, new Color(255, 255, 255, 255), true);
            t.enableOutline = true; t.outlineColor = new Color(120, 110, 100, 160); t.outlineWidth = 2;
            if (it[0] === '签到' && GameData.canSignToday()) uiSprite(n, 'badge_red', 30, 30, 48, 48);
            n.on(Node.EventType.TOUCH_END, () => {
                tween(n).to(0.06, { scale: v3(0.9, 0.9, 1) }).to(0.08, { scale: v3(1, 1, 1) }).start();
                if (it[0] === '图鉴') director.loadScene('Codex');
                else if (it[0] === '商店') this.openShop();
                else if (it[0] === '签到') this.openSignin();
                else if (it[0] === '排行') this.openLeaderboard();
            });
        });

        // ---- 每日任务条 ----
        const taskBar = uiSprite(canvas, 'hud_pill', W * 0.88, 88, 0, -H / 2 + 112, true);
        uiSprite(taskBar, 'icon_task', 56, 56, -W * 0.44 + 14, 2);
        const doneN = DAILY_TASKS.filter(t => GameData.dailyDone(t)).length;
        this.label(taskBar, `每日任务  ${doneN}/${DAILY_TASKS.length}  ›`, 28, 10, 0, new Color(122, 90, 38, 255), true);
        if (GameData.hasDailyClaimable()) uiSprite(taskBar, 'badge_red', 26, 26, W * 0.40, 26);
        taskBar.on(Node.EventType.TOUCH_END, () => this.openDaily());
    }

    /** 卡通云朵 */
    private cloud(g: Graphics, x: number, y: number, s: number) {
        const c = new Color(255, 255, 255, 170);
        this.circ(g, x, y, 44 * s, c);
        this.circ(g, x - 46 * s, y - 10 * s, 30 * s, c);
        this.circ(g, x + 46 * s, y - 8 * s, 34 * s, c);
    }

    /** 吉祥物:优先用角色贴图(粉猫),加载失败回退到简笔画 */
    private mascot(p: Node, x: number, y: number) {
        const n = this.mk(p, 'mascot'); n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(300, 300);
        resources.load('char/0', ImageAsset, (err, img) => {
            if (!err && img && n.isValid) {
                const tex = new Texture2D(); tex.image = img;
                const sf = new SpriteFrame(); sf.texture = tex;
                const sp = n.addComponent(Sprite);
                sp.spriteFrame = sf; sp.sizeMode = Sprite.SizeMode.CUSTOM;
                n.getComponent(UITransform)!.setContentSize(290, 290);
                // 待机呼吸动画
                tween(n).repeatForever(
                    tween(n).to(1.2, { scale: v3(1.03, 0.97, 1) }, { easing: 'sineInOut' })
                        .to(1.2, { scale: v3(0.98, 1.02, 1) }, { easing: 'sineInOut' })
                ).start();
            } else if (n.isValid) {
                this.mascotFallback(n);
            }
        });
    }
    private mascotFallback(n: Node) {
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(244, 166, 192, 255);
        g.moveTo(-70, 70); g.lineTo(-110, 150); g.lineTo(-20, 110); g.close(); g.fill();
        g.moveTo(70, 70); g.lineTo(110, 150); g.lineTo(20, 110); g.close(); g.fill();
        g.fillColor = new Color(248, 200, 216, 255); g.circle(0, 40, 96); g.fill();
        g.lineWidth = 8; g.strokeColor = new Color(212, 83, 126, 255); g.circle(0, 40, 96); g.stroke();
        g.fillColor = new Color(58, 32, 48, 255); g.circle(-34, 50, 14); g.fill(); g.circle(34, 50, 14); g.fill();
        g.fillColor = new Color(255, 255, 255, 255); g.circle(-39, 55, 5); g.fill(); g.circle(29, 55, 5); g.fill();
        g.fillColor = new Color(245, 143, 174, 220); g.circle(-52, 22, 14); g.fill(); g.circle(52, 22, 14); g.fill();
        g.lineWidth = 5; g.strokeColor = new Color(178, 58, 99, 255);
        g.moveTo(-16, 16); g.bezierCurveTo(-8, 6, 8, 6, 16, 16); g.stroke();
    }

    // ---------- HUD 刷新(金币/钻石/体力倒计时) ----------
    private refreshHUD = () => {
        GameData.tickLives();
        if (this.coinLabel) this.coinLabel.string = fmt(GameData.coins);
        if (this.diaLabel) this.diaLabel.string = '' + GameData.diamonds;
        if (this.lifeLabel) {
            this.lifeLabel.string = GameData.lives >= GameData.livesMax
                ? GameData.lives + '/' + GameData.livesMax
                : GameData.lives + ' ' + this.mmss(GameData.msToNextLife());
        }
    };
    private mmss(ms: number): string {
        const s = Math.max(0, Math.ceil(ms / 1000));
        const m = Math.floor(s / 60), ss = s % 60;
        return `${m}:${ss < 10 ? '0' : ''}${ss}`;
    }

    // ---------- 通用弹层 ----------
    private overlay(title: string): { layer: Node; card: Node; cw: number; ch: number } {
        const canvas = find('Canvas')!;
        const W = this.W, H = this.H;
        const layer = this.mk(canvas, 'overlay');
        layer.addComponent(UITransform).setContentSize(W, H);
        const dg = layer.addComponent(Graphics);
        dg.fillColor = new Color(30, 20, 40, 160); dg.rect(-W / 2, -H / 2, W, H); dg.fill();
        layer.on(Node.EventType.TOUCH_END, () => { }); // 吞掉背景点击

        const cw = W * 0.88, ch = H * 0.66;
        const card = uiSprite(layer, 'panel_cream', cw, ch, 0, 0, true);
        const tl = this.label(card, title, 40, 0, ch / 2 - 52, new Color(150, 100, 40, 255), true);
        tl.enableOutline = true; tl.outlineColor = new Color(255, 255, 255, 200); tl.outlineWidth = 2;

        const close = uiSprite(card, 'orb_close', 60, 60, cw / 2 - 30, ch / 2 - 30);
        close.on(Node.EventType.TOUCH_END, () => { layer.destroy(); this.refreshHUD(); });

        card.setScale(0.85, 0.85, 1);
        tween(card).to(0.16, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        return { layer, card, cw, ch };
    }

    // ---------- 商店 ----------
    private openShop() {
        const { card, cw, ch } = this.overlay('商  店');
        const cols = 2, gapX = cw * 0.46, gapY = 176;
        const startX = -gapX / 2, startY = ch / 2 - 168;
        const cellW = cw * 0.42, cellH = 152;
        SHOP_ITEMS.forEach((it, i) => {
            const x = startX + (i % cols) * gapX;
            const y = startY - Math.floor(i / cols) * gapY;
            this.shopCell(card, it, x, y, cellW, cellH);
        });
    }
    private shopCell(parent: Node, it: ShopItem, x: number, y: number, w: number, h: number) {
        const n = this.mk(parent, 'cell'); n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(255, 255, 255, 255); g.roundRect(-w / 2, -h / 2, w, h, 18); g.fill();
        g.lineWidth = 2; g.strokeColor = new Color(232, 224, 208, 255); g.roundRect(-w / 2, -h / 2, w, h, 18); g.stroke();
        this.label(n, it.name, 28, 0, h / 2 - 32, new Color(74, 74, 70, 255), true);
        this.label(n, it.desc, 19, 0, h / 2 - 62, new Color(150, 144, 132, 255));
        const costTxt = (it.cost.diamond ? '' + it.cost.diamond : fmt(it.cost.coin!));
        const bw = w - 34;
        const btn = uiButton(n, it.cost.diamond ? 'btn_blue' : 'btn_yellow', '', 0, -h / 2 + 34, bw, 56, 26, () => {
            if (GameData.buyShopItem(it.id)) { this.toast('购买成功:' + it.name); this.refreshHUD(); }
            else this.toast('余额不足');
        });
        uiSprite(btn, it.cost.diamond ? 'icon_diamond' : 'icon_coin', 34, 34, -34, 2);
        const cl = this.label(btn, costTxt, 26, 12, 2, Color.WHITE, true);
        cl.enableOutline = true; cl.outlineColor = new Color(0, 0, 0, 70); cl.outlineWidth = 2;
    }

    // ---------- 签到 ----------
    private openSignin() {
        const { layer, card, cw, ch } = this.overlay('每日签到');
        const claimedInCycle = GameData.signinClaimed % SIGNIN_REWARDS.length;
        const cols = 4, gapX = cw * 0.22, gapY = 130;
        const startX = -gapX * 1.5, startY = ch / 2 - 150;
        SIGNIN_REWARDS.forEach((r, i) => {
            const x = startX + (i % cols) * gapX;
            const y = startY - Math.floor(i / cols) * gapY;
            const claimed = i < claimedInCycle;
            const isToday = i === claimedInCycle && GameData.canSignToday();
            this.signCell(card, r, i, x, y, cw * 0.19, claimed, isToday);
        });
        const can = GameData.canSignToday();
        uiButton(card, can ? 'btn_green' : 'btn_gray', can ? '签到领取' : '今日已签到',
            0, -ch / 2 + 60, cw * 0.6, 76, 32, () => {
                const r = GameData.doSignin();
                if (r) {
                    this.toast('签到成功!' + this.rewardText(r));
                    this.refreshHUD();
                    layer.destroy();
                    this.openSignin();
                }
            });
    }
    private signCell(parent: Node, r: { coin?: number; diamond?: number; prop?: 'undo' | 'shuffle' | 'eject' }, dayIdx: number, x: number, y: number, w: number, claimed: boolean, isToday: boolean) {
        const n = this.mk(parent, 'sc'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = claimed ? new Color(214, 236, 222, 255) : isToday ? new Color(255, 243, 205, 255) : new Color(245, 242, 236, 255);
        g.roundRect(-w / 2, -52, w, 104, 14); g.fill();
        g.lineWidth = 3; g.strokeColor = isToday ? new Color(240, 180, 60, 255) : new Color(225, 219, 206, 255);
        g.roundRect(-w / 2, -52, w, 104, 14); g.stroke();
        this.label(n, '第' + (dayIdx + 1) + '天', 18, 0, 32, new Color(120, 112, 100, 255), true);
        const rw = r as { coin?: number; diamond?: number };
        if (rw.coin) uiSprite(n, 'icon_coin', 36, 36, 0, -2);
        else if (rw.diamond) uiSprite(n, 'icon_diamond', 36, 36, 0, -2);
        this.label(n, this.rewardText(r), 16, 0, -34, new Color(150, 120, 60, 255));
        if (claimed) this.label(n, '✓', 28, w / 2 - 16, 34, new Color(46, 160, 90, 255), true);
    }
    private rewardText(r: { coin?: number; diamond?: number; prop?: 'undo' | 'shuffle' | 'eject' }): string {
        if (r.coin) return '金币×' + r.coin;
        if (r.diamond) return '钻石×' + r.diamond;
        if (r.prop) return PROP_LABELS[r.prop] + '×1';
        return '';
    }

    // ---------- 每日任务 ----------
    private openDaily() {
        const { layer, card, cw, ch } = this.overlay('每日任务');
        const rowH = 134, startY = ch / 2 - 150;
        DAILY_TASKS.forEach((t, i) => this.dailyRow(layer, card, t, startY - i * rowH, cw));
    }
    private dailyRow(layer: Node, card: Node, t: DailyTask, y: number, cw: number) {
        const w = cw * 0.86;
        const n = this.mk(card, 'row'); n.setPosition(0, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(248, 245, 238, 255); g.roundRect(-w / 2, -56, w, 112, 18); g.fill();
        this.label(n, t.name, 26, -w * 0.16, 26, new Color(74, 74, 70, 255), true);
        const cur = Math.min(GameData.dailyCurrent(t), t.goal);
        this.label(n, `${cur}/${t.goal}   奖励 金币×${t.coin}`, 20, -w * 0.16, -8, new Color(150, 140, 120, 255));
        // 进度条
        const barW = w * 0.56, bx = -w / 2 + 28;
        const bar = this.mk(n, 'bar'); bar.setPosition(bx + barW / 2, -36, 0);
        const bgc = bar.addComponent(Graphics);
        bgc.fillColor = new Color(225, 222, 213, 255); bgc.roundRect(-barW / 2, -7, barW, 14, 7); bgc.fill();
        bgc.fillColor = new Color(126, 200, 66, 255); bgc.roundRect(-barW / 2, -7, barW * Math.max(0.02, cur / t.goal), 14, 7); bgc.fill();
        bgc.fillColor = new Color(255, 255, 255, 90); bgc.roundRect(-barW / 2 + 3, 0, barW * Math.max(0.02, cur / t.goal) - 6, 5, 3); bgc.fill();
        // 领取按钮
        const done = GameData.dailyDone(t), claimed = GameData.dailyIsClaimed(t);
        uiButton(n, claimed || !done ? 'btn_gray' : 'btn_green', claimed ? '已领取' : done ? '领取' : '未完成',
            w / 2 - 87, 0, 138, 64, 24, () => {
                if (GameData.claimDaily(t.id)) {
                    this.toast('领取成功 金币×' + t.coin); this.refreshHUD();
                    layer.destroy(); this.openDaily();
                }
            });
    }

    // ---------- 排行榜 ----------
    private openLeaderboard() {
        if (isWeChat()) { this.openWeChatRank(); return; }
        this.openLocalRank();
    }

    /** 微信:开放数据域好友排行(渲染到 sharedCanvas) */
    private openWeChatRank() {
        const { card, cw, ch } = this.overlay('好友排行');
        const w = cw * 0.9, h = ch * 0.68;
        const view = this.mk(card, 'subctx'); view.setPosition(0, -8, 0);
        view.addComponent(UITransform).setContentSize(w, h);
        const sub = view.addComponent('SubContextView' as any);
        postRankRender(w, h);
        if (!sub) {
            this.label(card, '好友排行需在微信小游戏内查看', 24, 0, 10, new Color(120, 112, 100, 255));
            this.label(card, '(分数已上报,请用微信打开)', 20, 0, -32, new Color(150, 140, 120, 255));
        }
    }

    /** 非微信:本地模拟排行 */
    private openLocalRank() {
        const { card, cw, ch } = this.overlay('排行榜');
        const names = ['喵星人', '汤圆', '可可', '布丁', '奶盖', '椰果', 'momo', '大福', '奥利奥', '芋圆'];
        const base = [9800, 8600, 7400, 6900, 5200, 4800, 4200, 3600, 3000, 2400];
        const all: { name: string; score: number; isMe: boolean }[] = names.map((nm, i) => ({ name: nm, score: base[i], isMe: false }));
        all.push({ name: '我', score: GameData.highScore, isMe: true });
        all.sort((a, b) => b.score - a.score);
        const myRank = all.findIndex(x => x.isMe) + 1;
        const rowH = 58, startY = ch / 2 - 128;
        all.slice(0, 8).forEach((p, i) => this.lbRow(card, i + 1, p.name, p.score, p.isMe, startY - i * rowH, cw));
        this.label(card, `我的最高分 ${fmt(GameData.highScore)} · 第 ${myRank} 名`, 24, 0, -ch / 2 + 48, new Color(133, 79, 11, 255), true);
    }
    private lbRow(card: Node, rank: number, name: string, score: number, isMe: boolean, y: number, cw: number) {
        const w = cw * 0.86;
        const n = this.mk(card, 'lb'); n.setPosition(0, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = isMe ? new Color(255, 240, 205, 255) : new Color(248, 245, 238, 255);
        g.roundRect(-w / 2, -25, w, 50, 12); g.fill();
        if (rank <= 3) uiSprite(n, 'icon_trophy', 32, 32, -w / 2 + 42, 0);
        else this.label(n, '#' + rank, 24, -w / 2 + 42, -2, new Color(120, 112, 100, 255), true);
        this.label(n, name, 24, -w * 0.16, -2, new Color(74, 74, 70, 255));
        this.label(n, fmt(score), 24, w / 2 - 86, -2, new Color(60, 52, 137, 255), true);
    }
}
