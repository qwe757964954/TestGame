import { _decorator, Component, Node, Prefab, SpriteFrame, instantiate, v3, Vec3, director } from 'cc';
import { GameConfig, levelParams } from './GameConfig';
import { LevelGenerator } from './LevelGenerator';
import { Tile, overlapRatio } from './Tile';
import { SlotBar } from './SlotBar';
import { SceneDecor } from './SceneDecor';
import { GameData, winReward } from './GameData';
import { reportScore } from './Platform';
import { CHARACTERS } from './Characters';
const { ccclass, property } = _decorator;

interface HistoryItem { tile: Tile; pos: Vec3; layer: number; }
export interface DropInfo { typeId: number; name: string; rarity: string; isNew: boolean; collected: number; total: number; coinReward: number; }

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager | null = null;

    @property({ type: Prefab, tooltip: 'Tile 预制体' })
    tilePrefab: Prefab = null!;
    @property({ type: Node, tooltip: '棋盘牌的父节点' })
    boardRoot: Node = null!;
    @property({ type: SlotBar })
    slotBar: SlotBar = null!;
    @property({ type: [SpriteFrame], tooltip: '图案图集,长度应 >= TYPE_COUNT' })
    iconFrames: SpriteFrame[] = [];
    @property({ type: Node, tooltip: '胜利面板(可选)' })
    winPanel: Node | null = null;
    @property({ type: Node, tooltip: '失败面板(可选)' })
    losePanel: Node | null = null;

    private _boardTiles: Tile[] = [];
    private _history: HistoryItem[] = [];
    private _level = 1;
    private _typeCount = 8;
    private _hintTile: Tile | null = null;

    onLoad() {
        GameManager.instance = this;
        GameData.load();
        this._level = GameData.playLevel || GameData.level;
    }

    start() {
        this.slotBar.onGameOver = () => this.showLose();
        this.slotBar.onAllChecked = () => { this.checkWin(); this.checkStuck(); this.updateRating(); };
        this.restart();
    }

    get remaining(): number { return this._boardTiles.length; }
    get level(): number { return this._level; }

    restart() {
        this.winPanel && (this.winPanel.active = false);
        this.losePanel && (this.losePanel.active = false);
        this.clearHint();
        this.slotBar.clear();
        this._boardTiles.forEach(t => t.node.destroy());
        this._boardTiles = [];
        this._history = [];
        SceneDecor.instance && SceneDecor.instance.onNewGame();
        SceneDecor.instance && SceneDecor.instance.setLevel(this._level);

        const p = levelParams(this._level);
        this._typeCount = Math.min(p.typeCount, this.iconFrames.length || p.typeCount);
        const placements = LevelGenerator.generate({ ...p, typeCount: this._typeCount });
        for (const pl of placements) {
            const node = instantiate(this.tilePrefab);
            node.setParent(this.boardRoot);
            node.setPosition(v3(pl.x, pl.y, 0));
            const tile = node.getComponent(Tile)!;
            const frame = this.iconFrames[pl.typeId % this.iconFrames.length];
            tile.init(pl.typeId, pl.layer, frame, (t) => this.onTileClick(t));
            this._boardTiles.push(tile);
        }
        this._boardTiles.slice().sort((a, b) => a.layer - b.layer)
            .forEach((t, i) => t.node.setSiblingIndex(i));

        this.refreshCover();
        this.updateRemaining();
        this.scheduleHint();
    }

    private onTileClick(tile: Tile) {
        if (this.slotBar.isLocked) return;
        if (tile.isCovered || tile.isCollected) return;
        const idx = this._boardTiles.indexOf(tile);
        if (idx < 0) return;
        this.clearHint();

        this._history.push({ tile, pos: tile.node.position.clone(), layer: tile.layer });
        this._boardTiles.splice(idx, 1);
        this.refreshCover();
        this.updateRemaining();
        this.slotBar.collect(tile);
        this.scheduleHint();
    }

    private refreshCover() {
        const rects = this._boardTiles.map(t => t.getWorldRect());
        for (let i = 0; i < this._boardTiles.length; i++) {
            const a = this._boardTiles[i];
            let covered = false;
            for (let j = 0; j < this._boardTiles.length; j++) {
                if (i === j) continue;
                const b = this._boardTiles[j];
                if (b.layer <= a.layer) continue;
                if (overlapRatio(rects[i], rects[j]) >= GameConfig.COVER_OVERLAP_RATIO) { covered = true; break; }
            }
            a.setCovered(covered);
        }
    }

    private updateRemaining() {
        SceneDecor.instance && SceneDecor.instance.setRemaining(this._boardTiles.length);
        this.updateRating();
    }

    private updateRating() {
        SceneDecor.instance && SceneDecor.instance.setRating(this.slotBar.count, GameConfig.SLOT_CAPACITY);
    }

    // ---------- 空闲提示 ----------
    private scheduleHint() {
        this.unschedule(this._doHint);
        this.scheduleOnce(this._doHint, 4);
    }
    private clearHint() {
        this.unschedule(this._doHint);
        if (this._hintTile) { this._hintTile.stopHint(); this._hintTile = null; }
    }
    private _doHint = () => {
        const unc = this._boardTiles.filter(t => !t.isCovered);
        if (unc.length === 0) return;
        const pick = unc.find(t => this.slotBar.countOf(t.typeId) === 2)
            || unc.find(t => this.slotBar.countOf(t.typeId) === 1)
            || unc[0];
        this._hintTile = pick;
        pick.startHint();
    };

    // ---------- 卡死检测:近满且无法完成三连时自动洗牌救场 ----------
    private checkStuck() {
        if (this.slotBar.count < GameConfig.SLOT_CAPACITY - 1) return;
        const pairTypes = new Set<number>();
        for (let id = 0; id < this.iconFrames.length; id++) {
            if (this.slotBar.countOf(id) >= 2) pairTypes.add(id);
        }
        if (pairTypes.size === 0) return; // 全是单张,洗牌也救不了
        const canComplete = this._boardTiles.some(t => pairTypes.has(t.typeId));
        if (!canComplete && this._boardTiles.length > 0) {
            SceneDecor.instance && SceneDecor.instance.toast('自动洗牌!');
            this.doShuffle();
        }
    }

    // ---------- 道具 ----------
    doUndo(): boolean {
        if (this.slotBar.isLocked || this._history.length === 0) return false;
        const h = this._history.pop()!;
        if (!this.slotBar.release(h.tile)) return false;
        const t = h.tile;
        t.node.setParent(this.boardRoot);
        t.node.setPosition(h.pos);
        t.node.setScale(1, 1, 1);
        t.layer = h.layer;
        t.isCollected = false;
        this._boardTiles.push(t);
        t.node.setSiblingIndex(this.boardRoot.children.length - 1);
        this.refreshCover();
        this.updateRemaining();
        return true;
    }

    doShuffle(): boolean {
        if (this.slotBar.isLocked || this._boardTiles.length === 0) return false;
        const ids = this._boardTiles.map(t => t.typeId);
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        this._boardTiles.forEach((t, i) => {
            const id = ids[i];
            t.setIcon(id, this.iconFrames[id % this.iconFrames.length]);
            t.playPop();
        });
        return true;
    }

    doEject(): boolean {
        if (this.slotBar.isLocked) return false;
        const out = this.slotBar.ejectTiles(3);
        if (out.length === 0) return false;
        let topLayer = 0;
        this._boardTiles.forEach(t => topLayer = Math.max(topLayer, t.layer));
        const halfW = ((GameConfig.GRID_COLS - 1) * GameConfig.GRID_STEP) / 2;
        const halfH = ((GameConfig.GRID_ROWS - 1) * GameConfig.GRID_STEP) / 2;
        out.forEach((t, k) => {
            t.node.setParent(this.boardRoot);
            t.node.setScale(1, 1, 1);
            t.node.setPosition(v3((Math.random() * 2 - 1) * halfW, (Math.random() * 2 - 1) * halfH, 0));
            t.layer = topLayer + 1 + k;
            t.isCollected = false;
            this._boardTiles.push(t);
            t.node.setSiblingIndex(this.boardRoot.children.length - 1);
            t.playPop();
        });
        this.refreshCover();
        this.updateRemaining();
        return true;
    }

    // ---------- 关卡推进 ----------
    nextLevel() {
        this._level++;
        GameData.unlockLevel(this._level);
        GameData.playLevel = this._level;
        GameData.save();
        this.restart();
    }

    /** 返回开始页 */
    backToHome() { director.loadScene('Home'); }
    /** 返回关卡选择 */
    backToLevels() { director.loadScene('LevelSelect'); }

    private checkWin() {
        if (this._boardTiles.length === 0 && this.slotBar.count === 0) this.showWin();
    }

    private showWin() {
        this.clearHint();
        GameData.unlockLevel(this._level + 1);
        const score = SceneDecor.instance ? SceneDecor.instance.score : 0;
        // 结算奖励:发金币、记最高分、累计每日完成关卡
        const coinReward = winReward(this._level, score);
        GameData.addCoins(coinReward);
        GameData.recordScore(score);
        reportScore(GameData.highScore);
        GameData.addDailyPlay();
        const typeId = Math.floor(Math.random() * this._typeCount);
        const info = CHARACTERS[typeId % CHARACTERS.length];
        const isNew = GameData.addCodex(typeId);
        const drop: DropInfo = {
            typeId, name: info.name, rarity: info.rarity, isNew,
            collected: GameData.collectedCount, total: CHARACTERS.length, coinReward,
        };
        this.winPanel && (this.winPanel.active = true);
        SceneDecor.instance && SceneDecor.instance.showWin(score, drop);
    }

    private showLose() {
        this.clearHint();
        GameData.recordScore(SceneDecor.instance ? SceneDecor.instance.score : 0);
        reportScore(GameData.highScore);
        this.losePanel && (this.losePanel.active = true);
        SceneDecor.instance && SceneDecor.instance.showLose(SceneDecor.instance ? SceneDecor.instance.score : 0);
    }

    /** 失败复活:解锁卡槽并移出 3 张腾位继续(由弹窗在扣钻后调用) */
    revive() {
        this.losePanel && (this.losePanel.active = false);
        this.slotBar.unlock();
        this.doEject();
        this.scheduleHint();
    }
}
