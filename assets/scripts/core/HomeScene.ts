import { _decorator, Component, Node, Graphics, Color, Label, UITransform, find, Layers, view, ResolutionPolicy, tween, v3, UIOpacity, director } from 'cc';
import { GameData, fmt, SHOP_ITEMS, SIGNIN_REWARDS, ShopItem, PROP_LABELS, DAILY_TASKS, DailyTask } from './GameData';
import { isWeChat, postRankRender } from './Platform';
import { ensureCanvas } from './UIBoot';
const { ccclass } = _decorator;

/** 开始页(程序化 UI)。挂在场景里 Canvas 下的一个空节点上。 */
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
        const l = n.addComponent(Label); l.string = t; l.fontSize = size; l.lineHeight = size + 4; l.color = c;
        l.horizontalAlign = Label.HorizontalAlign.CENTER; return l;
    }
    private pill(p: Node, t: string, x: number, y: number, w: number, bg: Color, tc: Color): Label {
        const h = 48; const n = this.mk(p, 'pill'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics); g.fillColor = bg; g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill();
        const l = this.mk(n, 'l').addComponent(Label); l.string = t; l.fontSize = 26; l.color = tc;
        return l;
    }
    private button(p: Node, t: string, x: number, y: number, w: number, h: number, color: Color, fz: number, onTap: () => void) {
        const n = this.mk(p, 'btn'); n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics); g.fillColor = color; g.roundRect(-w / 2, -h / 2, w, h, Math.min(24, h / 2)); g.fill();
        const l = this.mk(n, 'l').addComponent(Label); l.string = t; l.fontSize = fz; l.color = Color.WHITE;
        n.on(Node.EventType.TOUCH_END, () => tween(n).to(0.06, { scale: v3(0.93, 0.93, 1) }).to(0.08, { scale: v3(1, 1, 1) }).call(onTap).start());
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
        this.rr(g, -W / 2, -H / 2, W, H, 0, new Color(205, 235, 247, 255));
        this.rr(g, -W / 2, -H / 2, W, H * 0.5, 0, new Color(186, 224, 240, 255));
        this.circ(g, -W * 0.28, H * 0.30, 70, new Color(255, 255, 255, 130));
        this.circ(g, W * 0.30, H * 0.34, 84, new Color(255, 255, 255, 120));
        // 草地
        this.rr(g, -W * 0.42, H * 0.02, W * 0.84, 90, 44, new Color(192, 221, 151, 255));

        // 顶部货币 / 体力(读真实存档)
        this.coinLabel = this.pill(canvas, '', -W / 2 + 110, H / 2 - 70, 180, new Color(250, 199, 117, 255), new Color(99, 56, 6, 255));
        this.diaLabel = this.pill(canvas, '', -W / 2 + 270, H / 2 - 70, 120, new Color(181, 212, 244, 255), new Color(12, 68, 124, 255));
        this.lifeLabel = this.pill(canvas, '', W / 2 - 100, H / 2 - 70, 130, new Color(245, 170, 175, 255), new Color(124, 22, 24, 255));
        this.refreshHUD();
        this.schedule(this.refreshHUD, 1); // 体力倒计时刷新

        // 标题
        this.label(canvas, '萌物CC乐', 72, 0, H * 0.34, new Color(212, 83, 126, 255));
        this.label(canvas, 'Role Match · 集卡消除', 26, 0, H * 0.34 - 70, new Color(110, 110, 104, 255));

        // 吉祥物(简易猫脸)
        this.mascot(canvas, 0, H * 0.12);

        // 开始游戏
        this.button(canvas, '▶  开始游戏', 0, -H * 0.06, 460, 96, new Color(29, 158, 117, 255), 40,
            () => director.loadScene('LevelSelect'));

        // 导航
        const navY = -H * 0.24;
        const items = [['图鉴', new Color(127, 119, 221, 255)], ['商店', new Color(186, 117, 23, 255)], ['排行', new Color(55, 138, 221, 255)], ['签到', new Color(226, 75, 74, 255)]] as [string, Color][];
        items.forEach((it, i) => {
            const x = (i - 1.5) * 150;
            const n = this.mk(canvas, 'nav'); n.setPosition(x, navY, 0);
            n.addComponent(UITransform).setContentSize(110, 110);
            const cg = n.addComponent(Graphics); cg.fillColor = it[1]; cg.roundRect(-50, -50, 100, 100, 28); cg.fill();
            this.drawNavIcon(cg, it[0]);
            this.label(canvas, it[0], 26, x, navY - 80, new Color(90, 90, 84, 255));
            n.on(Node.EventType.TOUCH_END, () => {
                if (it[0] === '图鉴') director.loadScene('Codex');
                else if (it[0] === '商店') this.openShop();
                else if (it[0] === '签到') this.openSignin();
                else if (it[0] === '排行') this.openLeaderboard();
                else this.toast(it[0] + ' 开发中');
            });
        });

        // 每日任务条(可点开,带真实进度与红点)
        const taskBar = this.mk(canvas, 'taskbar'); taskBar.setPosition(0, -H / 2 + 115, 0);
        taskBar.addComponent(UITransform).setContentSize(W * 0.88, 90);
        const tg = taskBar.addComponent(Graphics);
        tg.fillColor = new Color(255, 255, 255, 230); tg.roundRect(-W * 0.44, -45, W * 0.88, 90, 24); tg.fill();
        const doneN = DAILY_TASKS.filter(t => GameData.dailyDone(t)).length;
        this.label(taskBar, `每日任务  ${doneN}/${DAILY_TASKS.length}  ›`, 28, 0, 0, new Color(120, 110, 96, 255));
        if (GameData.hasDailyClaimable()) { const d = this.mk(taskBar, 'dot'); d.setPosition(W * 0.40, 22, 0); this.circ(d.addComponent(Graphics), 0, 0, 9, new Color(226, 75, 74, 255)); }
        taskBar.on(Node.EventType.TOUCH_END, () => this.openDaily());
    }

    /** 在按钮上画白色线条图标 */
    private drawNavIcon(g: Graphics, name: string) {
        const W = new Color(255, 255, 255, 255);
        g.lineWidth = 5; g.strokeColor = W; g.fillColor = W;
        if (name === '图鉴') {
            g.moveTo(0, -26); g.lineTo(0, 22);
            g.moveTo(0, -26); g.bezierCurveTo(-10, -30, -26, -28, -30, -22); g.lineTo(-30, 20); g.bezierCurveTo(-26, 14, -10, 16, 0, 22);
            g.moveTo(0, -26); g.bezierCurveTo(10, -30, 26, -28, 30, -22); g.lineTo(30, 20); g.bezierCurveTo(26, 14, 10, 16, 0, 22);
            g.stroke();
        } else if (name === '商店') {
            g.roundRect(-26, -22, 52, 44, 8); g.stroke();
            g.moveTo(-14, -22); g.bezierCurveTo(-14, -42, 14, -42, 14, -22); g.stroke();
        } else if (name === '排行') {
            g.moveTo(-20, -24); g.lineTo(20, -24);
            g.moveTo(-20, -24); g.lineTo(-20, -4); g.bezierCurveTo(-20, 14, 20, 14, 20, -4); g.lineTo(20, -24);
            g.moveTo(-20, -18); g.bezierCurveTo(-34, -18, -34, 2, -20, 2);
            g.moveTo(20, -18); g.bezierCurveTo(34, -18, 34, 2, 20, 2);
            g.moveTo(0, 14); g.lineTo(0, 24); g.moveTo(-14, 28); g.lineTo(14, 28);
            g.stroke();
        } else { // 签到 日历
            g.roundRect(-26, -22, 52, 44, 6); g.stroke();
            g.moveTo(-26, -8); g.lineTo(26, -8); g.stroke();
            g.moveTo(-14, -30); g.lineTo(-14, -18); g.moveTo(14, -30); g.lineTo(14, -18); g.stroke();
            g.circle(0, 8, 5); g.fill();
        }
    }

    private mascot(p: Node, x: number, y: number) {
        const n = this.mk(p, 'mascot'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        // 耳朵
        g.fillColor = new Color(244, 166, 192, 255);
        g.moveTo(-70, 70); g.lineTo(-110, 150); g.lineTo(-20, 110); g.close(); g.fill();
        g.moveTo(70, 70); g.lineTo(110, 150); g.lineTo(20, 110); g.close(); g.fill();
        // 脸
        g.fillColor = new Color(248, 200, 216, 255); g.circle(0, 40, 96); g.fill();
        g.lineWidth = 8; g.strokeColor = new Color(212, 83, 126, 255); g.circle(0, 40, 96); g.stroke();
        // 眼
        g.fillColor = new Color(58, 32, 48, 255); g.circle(-34, 50, 14); g.fill(); g.circle(34, 50, 14); g.fill();
        g.fillColor = new Color(255, 255, 255, 255); g.circle(-39, 55, 5); g.fill(); g.circle(29, 55, 5); g.fill();
        // 腮红
        g.fillColor = new Color(245, 143, 174, 220); g.circle(-52, 22, 14); g.fill(); g.circle(52, 22, 14); g.fill();
        // 嘴
        g.lineWidth = 5; g.strokeColor = new Color(178, 58, 99, 255);
        g.moveTo(-16, 16); g.bezierCurveTo(-8, 6, 8, 6, 16, 16); g.stroke();
    }

    // ---------- HUD 刷新(金币/钻石/体力倒计时) ----------
    private refreshHUD = () => {
        GameData.tickLives();
        if (this.coinLabel) this.coinLabel.string = '金 ' + fmt(GameData.coins);
        if (this.diaLabel) this.diaLabel.string = '钻 ' + GameData.diamonds;
        if (this.lifeLabel) {
            this.lifeLabel.string = GameData.lives >= GameData.livesMax
                ? '♥ ' + GameData.lives
                : '♥ ' + GameData.lives + '  ' + this.mmss(GameData.msToNextLife());
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
        dg.fillColor = new Color(0, 0, 0, 150); dg.rect(-W / 2, -H / 2, W, H); dg.fill();
        layer.on(Node.EventType.TOUCH_END, () => { }); // 吞掉背景点击,挡住下层按钮

        const cw = W * 0.88, ch = H * 0.66;
        const card = this.mk(layer, 'card');
        card.addComponent(UITransform).setContentSize(cw, ch);
        const cg = card.addComponent(Graphics);
        cg.fillColor = new Color(255, 252, 245, 255); cg.roundRect(-cw / 2, -ch / 2, cw, ch, 28); cg.fill();
        cg.lineWidth = 3; cg.strokeColor = new Color(226, 211, 180, 255); cg.roundRect(-cw / 2, -ch / 2, cw, ch, 28); cg.stroke();
        this.label(card, title, 40, 0, ch / 2 - 50, new Color(74, 74, 70, 255));

        const close = this.mk(card, 'x'); close.setPosition(cw / 2 - 38, ch / 2 - 38, 0);
        close.addComponent(UITransform).setContentSize(56, 56);
        const xg = close.addComponent(Graphics); xg.fillColor = new Color(235, 230, 220, 255); xg.circle(0, 0, 24); xg.fill();
        this.label(close, '✕', 30, 0, -2, new Color(120, 110, 100, 255));
        close.on(Node.EventType.TOUCH_END, () => { layer.destroy(); this.refreshHUD(); });

        card.setScale(0.85, 0.85, 1);
        tween(card).to(0.16, { scale: v3(1, 1, 1) }).start();
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
        this.label(n, it.name, 28, 0, h / 2 - 32, new Color(74, 74, 70, 255));
        this.label(n, it.desc, 19, 0, h / 2 - 62, new Color(150, 144, 132, 255));
        const costTxt = it.cost.diamond ? ('钻 ' + it.cost.diamond) : ('金 ' + fmt(it.cost.coin!));
        const bw = w - 34;
        const btn = this.mk(n, 'buy'); btn.setPosition(0, -h / 2 + 34, 0);
        btn.addComponent(UITransform).setContentSize(bw, 50);
        const bg = btn.addComponent(Graphics);
        bg.fillColor = it.cost.diamond ? new Color(91, 160, 214, 255) : new Color(240, 170, 60, 255);
        bg.roundRect(-bw / 2, -25, bw, 50, 16); bg.fill();
        this.label(btn, costTxt, 26, 0, -2, Color.WHITE);
        btn.on(Node.EventType.TOUCH_END, () => {
            tween(btn).to(0.06, { scale: v3(0.92, 0.92, 1) }).to(0.08, { scale: v3(1, 1, 1) }).start();
            if (GameData.buyShopItem(it.id)) { this.toast('购买成功:' + it.name); this.refreshHUD(); }
            else this.toast('余额不足');
        });
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
        const bw = cw * 0.6;
        const btn = this.mk(card, 'claim'); btn.setPosition(0, -ch / 2 + 56, 0);
        btn.addComponent(UITransform).setContentSize(bw, 64);
        const bg = btn.addComponent(Graphics);
        bg.fillColor = can ? new Color(29, 158, 117, 255) : new Color(190, 188, 180, 255);
        bg.roundRect(-bw / 2, -32, bw, 64, 20); bg.fill();
        this.label(btn, can ? '签到领取' : '今日已签到', 32, 0, -2, Color.WHITE);
        btn.on(Node.EventType.TOUCH_END, () => {
            const r = GameData.doSignin();
            if (r) {
                this.toast('签到成功!' + this.rewardText(r));
                this.refreshHUD();
                layer.destroy();
                this.openSignin(); // 重新渲染以更新进度
            }
        });
    }
    private signCell(parent: Node, r: { coin?: number; diamond?: number; prop?: 'undo' | 'shuffle' | 'eject' }, dayIdx: number, x: number, y: number, w: number, claimed: boolean, isToday: boolean) {
        const n = this.mk(parent, 'sc'); n.setPosition(x, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = claimed ? new Color(214, 236, 222, 255) : isToday ? new Color(255, 243, 205, 255) : new Color(245, 242, 236, 255);
        g.roundRect(-w / 2, -52, w, 104, 14); g.fill();
        g.lineWidth = 2; g.strokeColor = isToday ? new Color(240, 180, 60, 255) : new Color(225, 219, 206, 255);
        g.roundRect(-w / 2, -52, w, 104, 14); g.stroke();
        this.label(n, '第' + (dayIdx + 1) + '天', 18, 0, 32, new Color(120, 112, 100, 255));
        this.label(n, this.rewardText(r), 18, 0, -6, new Color(150, 120, 60, 255));
        if (claimed) this.label(n, '✓', 30, 0, -34, new Color(46, 160, 90, 220));
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
        this.label(n, t.name, 26, -w * 0.16, 26, new Color(74, 74, 70, 255));
        const cur = Math.min(GameData.dailyCurrent(t), t.goal);
        this.label(n, `${cur}/${t.goal}   奖励 金币×${t.coin}`, 20, -w * 0.16, -8, new Color(150, 140, 120, 255));
        // 进度条
        const barW = w * 0.56, bx = -w / 2 + 28;
        const bar = this.mk(n, 'bar'); bar.setPosition(bx + barW / 2, -36, 0);
        const bgc = bar.addComponent(Graphics);
        bgc.fillColor = new Color(225, 222, 213, 255); bgc.roundRect(-barW / 2, -6, barW, 12, 6); bgc.fill();
        bgc.fillColor = new Color(29, 158, 117, 255); bgc.roundRect(-barW / 2, -6, barW * Math.max(0.02, cur / t.goal), 12, 6); bgc.fill();
        // 领取按钮
        const done = GameData.dailyDone(t), claimed = GameData.dailyIsClaimed(t);
        const btnW = 138;
        const btn = this.mk(n, 'b'); btn.setPosition(w / 2 - btnW / 2 - 18, 0, 0);
        btn.addComponent(UITransform).setContentSize(btnW, 64);
        const bg = btn.addComponent(Graphics);
        bg.fillColor = claimed ? new Color(190, 188, 180, 255) : done ? new Color(29, 158, 117, 255) : new Color(206, 204, 196, 255);
        bg.roundRect(-btnW / 2, -32, btnW, 64, 16); bg.fill();
        this.label(btn, claimed ? '已领取' : done ? '领取' : '未完成', 24, 0, -2, Color.WHITE);
        btn.on(Node.EventType.TOUCH_END, () => {
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
        // 引擎的 SubContextView 会把开放数据域的 sharedCanvas 贴到本节点(需在微信环境)
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
        this.label(card, `我的最高分 ${fmt(GameData.highScore)} · 第 ${myRank} 名`, 24, 0, -ch / 2 + 48, new Color(133, 79, 11, 255));
    }
    private lbRow(card: Node, rank: number, name: string, score: number, isMe: boolean, y: number, cw: number) {
        const w = cw * 0.86;
        const n = this.mk(card, 'lb'); n.setPosition(0, y, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = isMe ? new Color(255, 240, 205, 255) : new Color(248, 245, 238, 255);
        g.roundRect(-w / 2, -25, w, 50, 12); g.fill();
        this.label(n, '#' + rank, 24, -w / 2 + 42, -2, rank <= 3 ? new Color(214, 140, 20, 255) : new Color(120, 112, 100, 255));
        this.label(n, name, 24, -w * 0.16, -2, new Color(74, 74, 70, 255));
        this.label(n, fmt(score), 24, w / 2 - 86, -2, new Color(60, 52, 137, 255));
    }
}
