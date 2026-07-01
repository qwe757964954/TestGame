import { _decorator, Component, Node, Graphics, Color, Label, Sprite, SpriteFrame, UITransform, Layers, view, ResolutionPolicy, tween, v3, director } from 'cc';
import { GameData } from './GameData';
import { CHARACTERS, RARITY_PILL } from './Characters';
import { ensureCanvas } from './UIBoot';
import { loadCharFrames } from './CharLoader';
const { ccclass } = _decorator;

/** 角色图鉴(收集册)。空场景 + 程序化 UI。 */
@ccclass('CodexScene')
export class CodexScene extends Component {
    private W = 720; private H = 1280;

    onLoad() { view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH); GameData.load(); }

    start() {
        const canvas = ensureCanvas();
        const vs = view.getVisibleSize(); this.W = vs.width; this.H = vs.height;
        loadCharFrames((frames) => this.build(canvas, frames));
    }

    private mk(p: Node, n = 'n'): Node {
        const node = new Node(n); node.layer = Layers.Enum.UI_2D; p.addChild(node); node.setPosition(0, 0, 0); return node;
    }
    private gfx(p: Node, sib = -1): Graphics { const n = this.mk(p, 'g'); if (sib >= 0) n.setSiblingIndex(sib); return n.addComponent(Graphics); }
    private rr(g: Graphics, x: number, y: number, w: number, h: number, r: number, c: Color) { g.fillColor = c; g.roundRect(x, y, w, h, r); g.fill(); }
    private label(p: Node, t: string, size: number, x: number, y: number, c: Color): Label {
        const n = this.mk(p, 'l'); n.setPosition(x, y, 0);
        const l = n.addComponent(Label); l.string = t; l.fontSize = size; l.color = c; l.horizontalAlign = Label.HorizontalAlign.CENTER; return l;
    }

    private build(canvas: Node, frames: SpriteFrame[]) {
        const W = this.W, H = this.H;
        const g = this.gfx(canvas, 0);
        this.rr(g, -W / 2, -H / 2, W, H, 0, new Color(244, 243, 238, 255));
        // 标题条
        const hg = this.gfx(canvas);
        this.rr(hg, -W * 0.46, H / 2 - 160, W * 0.92, 110, 28, new Color(255, 255, 255, 255));
        this.label(canvas, '角色图鉴', 38, 0, H / 2 - 105, new Color(74, 74, 70, 255));
        this.label(canvas, GameData.collectedCount + ' / ' + CHARACTERS.length, 26, W * 0.30, H / 2 - 105, new Color(127, 119, 221, 255));
        // 返回
        const back = this.mk(canvas, 'back'); back.setPosition(-W / 2 + 70, H / 2 - 105, 0);
        back.addComponent(UITransform).setContentSize(90, 70);
        const bg = back.addComponent(Graphics); bg.fillColor = new Color(240, 238, 230, 255); bg.roundRect(-45, -35, 90, 70, 16); bg.fill();
        this.label(canvas, '‹', 46, -W / 2 + 70, H / 2 - 116, new Color(90, 90, 84, 255));
        back.on(Node.EventType.TOUCH_END, () => director.loadScene('Home'));

        // 角色网格
        const startY = H * 0.22, colX = 215, rowStep = 230;
        for (let i = 0; i < CHARACTERS.length; i++) {
            const col = i % 3, row = Math.floor(i / 3);
            const x = (col - 1) * colX;
            const y = startY - row * rowStep;
            this.cell(canvas, i, x, y, GameData.codex.indexOf(i) >= 0, frames[i]);
        }
    }

    private cell(canvas: Node, typeId: number, x: number, y: number, owned: boolean, frame: SpriteFrame | undefined) {
        const info = CHARACTERS[typeId];
        const n = this.mk(canvas, 'cell'); n.setPosition(x, y, 0);
        const w = 195, h = 210;
        const g = n.addComponent(Graphics);
        this.rr(g, -w / 2, -h / 2, w, h, 22, new Color(255, 255, 255, 255));
        const rp = RARITY_PILL[info.rarity] || RARITY_PILL['普通'];
        const bd = owned ? new Color(rp.bg[0], rp.bg[1], rp.bg[2], 255) : new Color(200, 198, 190, 255);
        g.lineWidth = 4; g.strokeColor = bd; g.roundRect(-w / 2, -h / 2, w, h, 22); g.stroke();

        // 头像底
        const cbg = this.mk(n, 'cbg'); cbg.setPosition(0, 28, 0);
        const cg = cbg.addComponent(Graphics);
        cg.fillColor = owned ? new Color(238, 237, 254, 255) : new Color(225, 223, 215, 255);
        cg.circle(0, 0, 50); cg.fill();

        if (owned && frame) {
            const av = this.mk(cbg, 'av'); av.addComponent(UITransform).setContentSize(86, 86);
            const sp = av.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = frame;
            this.label(n, info.name, 24, 0, -42, new Color(60, 52, 80, 255));
            const pn = this.mk(n, 'pill'); pn.setPosition(0, -78, 0);
            const pg = pn.addComponent(Graphics); pg.fillColor = new Color(rp.bg[0], rp.bg[1], rp.bg[2], 255);
            pg.roundRect(-55, -17, 110, 34, 17); pg.fill();
            this.label(pn, info.rarity, 22, 0, 0, new Color(rp.tc[0], rp.tc[1], rp.tc[2], 255));
        } else {
            this.label(cbg, '?', 50, 0, 0, new Color(150, 148, 140, 255));
            this.label(n, '？？？', 24, 0, -42, new Color(150, 148, 140, 255));
            // 锁
            const lk = this.mk(n, 'lk'); lk.setPosition(0, -78, 0);
            const lg = lk.addComponent(Graphics);
            lg.lineWidth = 4; lg.strokeColor = new Color(150, 148, 140, 255);
            lg.moveTo(-10, 2); lg.bezierCurveTo(-10, -16, 10, -16, 10, 2); lg.stroke();
            lg.fillColor = new Color(150, 148, 140, 255); lg.roundRect(-14, -12, 28, 20, 4); lg.fill();
        }
    }
}
