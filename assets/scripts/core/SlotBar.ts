import { _decorator, Component, Node, UITransform, Vec3, v3 } from 'cc';
import { GameConfig } from './GameConfig';
import { Tile } from './Tile';
const { ccclass, property } = _decorator;

/**
 * 底部卡槽。负责:
 *  - 接收点击的牌,按图案种类聚拢排列
 *  - 凑齐 3 张相同 -> 消除
 *  - 槽位装满(SLOT_CAPACITY)且无法消除 -> 判负
 */
@ccclass('SlotBar')
export class SlotBar extends Component {
    @property({ type: Node, tooltip: '收纳牌的父节点(决定卡槽位置基准)' })
    slotRoot: Node = null!;

    /** 槽位间距,默认用牌尺寸 */
    @property
    slotStep = GameConfig.TILE_SIZE;

    /** 当前卡槽内的牌(已按类型排序) */
    private _tiles: Tile[] = [];
    private _locked = false;

    public onGameOver: (() => void) | null = null;
    public onAllChecked: (() => void) | null = null; // 每次消除/落定后回调,供胜利判定

    get count() { return this._tiles.length; }
    get isLocked() { return this._locked; }

    /** 第 index 个槽位的世界坐标 */
    private slotWorldPos(index: number): Vec3 {
        const cap = GameConfig.SLOT_CAPACITY;
        const localX = (index - (cap - 1) / 2) * this.slotStep;
        const ut = this.slotRoot.getComponent(UITransform)!;
        return ut.convertToWorldSpaceAR(v3(localX, 0, 0));
    }

    /** 收入一张牌 */
    collect(tile: Tile) {
        if (this._locked) return;
        tile.isCollected = true;

        // 计算插入位置:放在同类型最后一个之后,保持同类相邻
        let insertAt = this._tiles.length;
        for (let i = this._tiles.length - 1; i >= 0; i--) {
            if (this._tiles[i].typeId === tile.typeId) { insertAt = i + 1; break; }
        }
        this._tiles.splice(insertAt, 0, tile);

        // 移到卡槽层级下
        const worldPos = tile.node.worldPosition.clone();
        tile.node.setParent(this.slotRoot);
        tile.node.setWorldPosition(worldPos);

        this._locked = true;
        this.relayout(() => {
            this.resolveMatches();
        });
    }

    /** 重新排布所有牌到各自槽位 */
    private relayout(onDone?: () => void) {
        let pending = this._tiles.length;
        if (pending === 0) { onDone && onDone(); return; }
        this._tiles.forEach((t, i) => {
            t.moveToWorld(this.slotWorldPos(i), () => {
                pending--;
                if (pending === 0) onDone && onDone();
            });
        });
    }

    /** 检查并消除三连 */
    private resolveMatches() {
        // 统计每种类型
        const groups = new Map<number, Tile[]>();
        for (const t of this._tiles) {
            if (!groups.has(t.typeId)) groups.set(t.typeId, []);
            groups.get(t.typeId)!.push(t);
        }

        let removed: Tile[] = [];
        for (const [, list] of groups) {
            if (list.length >= 3) {
                removed = list.slice(0, 3);
                break; // 一次处理一组,处理完再递归检查
            }
        }

        if (removed.length === 3) {
            const removeSet = new Set(removed);
            this._tiles = this._tiles.filter(t => !removeSet.has(t));
            removed.forEach(t => t.node.destroy());
            // 重新排布后再次检查(可能连续消除)
            this.relayout(() => this.afterSettle(true));
        } else {
            this.afterSettle(false);
        }
    }

    private afterSettle(didRemove: boolean) {
        if (didRemove) {
            // 再查一遍是否还有可消除组
            this.resolveMatches();
            return;
        }
        this._locked = false;
        this.onAllChecked && this.onAllChecked();
        if (this._tiles.length >= GameConfig.SLOT_CAPACITY) {
            this._locked = true;
            this.onGameOver && this.onGameOver();
        }
    }

    /** 重置卡槽 */
    clear() {
        this._tiles.forEach(t => t.node.destroy());
        this._tiles = [];
        this._locked = false;
    }
}
