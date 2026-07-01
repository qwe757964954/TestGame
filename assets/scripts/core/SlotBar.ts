import { _decorator, Component, Node, UITransform, Vec3, v3 } from 'cc';
import { GameConfig } from './GameConfig';
import { Tile } from './Tile';
import { SceneDecor } from './SceneDecor';
const { ccclass, property } = _decorator;

/**
 * 底部卡槽:接收点击的牌、按类型聚拢、三连消除、满槽判负。
 */
@ccclass('SlotBar')
export class SlotBar extends Component {
    @property({ type: Node, tooltip: '收纳牌的父节点(决定卡槽位置基准)' })
    slotRoot: Node = null!;

    @property
    slotStep = GameConfig.TILE_SIZE;

    private _tiles: Tile[] = [];
    private _locked = false;

    public onGameOver: (() => void) | null = null;
    public onAllChecked: (() => void) | null = null;

    get count() { return this._tiles.length; }
    get isLocked() { return this._locked; }

    /** 卡槽里某类型的数量 */
    countOf(typeId: number): number {
        let n = 0;
        for (const t of this._tiles) if (t.typeId === typeId) n++;
        return n;
    }

    private slotWorldPos(index: number): Vec3 {
        const cap = GameConfig.SLOT_CAPACITY;
        const localX = (index - (cap - 1) / 2) * this.slotStep;
        const ut = this.slotRoot.getComponent(UITransform)!;
        return ut.convertToWorldSpaceAR(v3(localX, 0, 0));
    }

    collect(tile: Tile) {
        if (this._locked) return;
        tile.isCollected = true;

        let insertAt = this._tiles.length;
        for (let i = this._tiles.length - 1; i >= 0; i--) {
            if (this._tiles[i].typeId === tile.typeId) { insertAt = i + 1; break; }
        }
        this._tiles.splice(insertAt, 0, tile);

        const worldPos = tile.node.worldPosition.clone();
        tile.node.setParent(this.slotRoot);
        tile.node.setWorldPosition(worldPos);

        this._locked = true;
        this.relayout(() => this.resolveMatches());
    }

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

    private resolveMatches() {
        const groups = new Map<number, Tile[]>();
        for (const t of this._tiles) {
            if (!groups.has(t.typeId)) groups.set(t.typeId, []);
            groups.get(t.typeId)!.push(t);
        }

        let removed: Tile[] = [];
        for (const [, list] of groups) {
            if (list.length >= 3) { removed = list.slice(0, 3); break; }
        }

        if (removed.length === 3) {
            const set = new Set(removed);
            this._tiles = this._tiles.filter(t => !set.has(t));
            const center = removed[1].node.worldPosition.clone();
            SceneDecor.instance && SceneDecor.instance.onMatch(center);
            let pending = removed.length;
            removed.forEach(t => t.popOut(() => {
                pending--;
                if (pending === 0) this.relayout(() => this.afterSettle(true));
            }));
        } else {
            this.afterSettle(false);
        }
    }

    private afterSettle(didRemove: boolean) {
        if (didRemove) { this.resolveMatches(); return; }
        this._locked = false;
        this.onAllChecked && this.onAllChecked();
        if (this._tiles.length >= GameConfig.SLOT_CAPACITY) {
            this._locked = true;
            this.onGameOver && this.onGameOver();
        }
    }

    /** 道具:把指定牌从卡槽放回(撤销用),返回是否成功 */
    release(tile: Tile): boolean {
        const i = this._tiles.indexOf(tile);
        if (i < 0) return false;
        this._tiles.splice(i, 1);
        tile.isCollected = false;
        this.relayout();
        return true;
    }

    /** 道具:取出前 n 张牌(移出用),返回这些牌 */
    ejectTiles(n: number): Tile[] {
        const out = this._tiles.splice(0, Math.min(n, this._tiles.length));
        out.forEach(t => t.isCollected = false);
        this.relayout();
        return out;
    }

    clear() {
        this._tiles.forEach(t => t.node.destroy());
        this._tiles = [];
        this._locked = false;
    }

    /** 复活用:解除满槽锁定,让后续移出/点击恢复 */
    unlock() { this._locked = false; }
}
