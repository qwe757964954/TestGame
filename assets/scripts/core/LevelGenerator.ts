import { GameConfig, LevelParams } from './GameConfig';

/** 一张牌的布局数据 */
export interface TilePlacement {
    typeId: number;
    layer: number;
    x: number;
    y: number;
}

/**
 * 关卡生成器。每种图案数量为 3 的倍数,保证可全消。
 */
export class LevelGenerator {

    /** 按难度参数生成一关 */
    static generate(p: LevelParams): TilePlacement[] {
        const { typeCount, layerCount, slotsPerLayer } = p;

        let total = layerCount * slotsPerLayer;
        total -= total % 3;

        const pool: number[] = [];
        const groups = total / 3;
        for (let i = 0; i < groups; i++) {
            const t = Math.floor(Math.random() * typeCount);
            pool.push(t, t, t);
        }
        this.shuffle(pool);

        const positions = this.buildPositions(layerCount, total);

        const result: TilePlacement[] = [];
        for (let i = 0; i < total; i++) {
            const pos = positions[i];
            result.push({ typeId: pool[i], layer: pos.layer, x: pos.x, y: pos.y });
        }
        return result;
    }

    private static buildPositions(layerCount: number, total: number): { layer: number; x: number; y: number }[] {
        const { GRID_COLS, GRID_ROWS, GRID_STEP } = GameConfig;
        const cells: { layer: number; x: number; y: number }[] = [];
        const halfW = ((GRID_COLS - 1) * GRID_STEP) / 2;
        const halfH = ((GRID_ROWS - 1) * GRID_STEP) / 2;

        for (let layer = 0; layer < layerCount; layer++) {
            const off = (layer % 2) * (GRID_STEP / 2);
            const layerCells: { layer: number; x: number; y: number }[] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                for (let r = 0; r < GRID_ROWS; r++) {
                    layerCells.push({
                        layer,
                        x: c * GRID_STEP - halfW + off,
                        y: r * GRID_STEP - halfH + off,
                    });
                }
            }
            this.shuffle(layerCells);
            cells.push(...layerCells);
        }

        this.shuffle(cells);
        const picked = cells.slice(0, total);
        picked.sort((a, b) => a.layer - b.layer);
        return picked;
    }

    private static shuffle<T>(arr: T[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
