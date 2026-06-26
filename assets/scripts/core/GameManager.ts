import { _decorator, Component, Node, Prefab, SpriteFrame, instantiate, v3 } from 'cc';
import { GameConfig } from './GameConfig';
import { LevelGenerator } from './LevelGenerator';
import { Tile, overlapRatio } from './Tile';
import { SlotBar } from './SlotBar';
const { ccclass, property } = _decorator;

/**
 * 游戏主控:生成棋盘 -> 处理点击 -> 遮挡刷新 -> 胜负判定。
 * 挂在场景里的 GameRoot 节点上,在编辑器拖入相应引用。
 */
@ccclass('GameManager')
export class GameManager extends Component {
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

    start() {
        this.slotBar.onGameOver = () => this.showLose();
        this.slotBar.onAllChecked = () => this.checkWin();
        this.restart();
    }

    /** 开始/重开一局 */
    restart() {
        this.winPanel && (this.winPanel.active = false);
        this.losePanel && (this.losePanel.active = false);
        this.slotBar.clear();
        this._boardTiles.forEach(t => t.node.destroy());
        this._boardTiles = [];

        const placements = LevelGenerator.generate(this.iconFrames.length || GameConfig.TYPE_COUNT);
        for (const p of placements) {
            const node = instantiate(this.tilePrefab);
            node.setParent(this.boardRoot);
            node.setPosition(v3(p.x, p.y, 0));
            const tile = node.getComponent(Tile)!;
            const frame = this.iconFrames[p.typeId % this.iconFrames.length];
            tile.init(p.typeId, p.layer, frame, (t) => this.onTileClick(t));
            this._boardTiles.push(tile);
        }
        // z 序:按层级从低到高依次设置 siblingIndex,层级越高越靠前景
        this._boardTiles
            .slice()
            .sort((a, b) => a.layer - b.layer)
            .forEach((t, i) => t.node.setSiblingIndex(i));

        this.refreshCover();
    }

    private onTileClick(tile: Tile) {
        if (this.slotBar.isLocked) return;          // 动画/结算中,忽略点击
        if (tile.isCovered || tile.isCollected) return;
        const idx = this._boardTiles.indexOf(tile);
        if (idx < 0) return;

        this._boardTiles.splice(idx, 1);
        this.refreshCover();                         // 移除后,下层牌可能解锁
        this.slotBar.collect(tile);
    }

    /**
     * 刷新所有棋盘牌的遮挡状态。
     * 规则:存在另一张"层级更高"且包围盒重叠达到阈值的牌,则被遮挡。
     */
    private refreshCover() {
        const rects = this._boardTiles.map(t => t.getWorldRect());
        for (let i = 0; i < this._boardTiles.length; i++) {
            const a = this._boardTiles[i];
            let covered = false;
            for (let j = 0; j < this._boardTiles.length; j++) {
                if (i === j) continue;
                const b = this._boardTiles[j];
                if (b.layer <= a.layer) continue;     // 只被更高层遮挡
                if (overlapRatio(rects[i], rects[j]) >= GameConfig.COVER_OVERLAP_RATIO) {
                    covered = true;
                    break;
                }
            }
            a.setCovered(covered);
        }
    }

    private checkWin() {
        if (this._boardTiles.length === 0 && this.slotBar.count === 0) {
            this.showWin();
        }
    }

    private showWin() {
        this.winPanel && (this.winPanel.active = true);
        console.log('[TripleMatch] 胜利!');
    }

    private showLose() {
        this.losePanel && (this.losePanel.active = true);
        console.log('[TripleMatch] 卡槽已满,失败');
    }
}
