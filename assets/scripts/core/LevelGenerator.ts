import { GameConfig } from './GameConfig';

/** 一张牌的布局数据 */
export interface TilePlacement {
    typeId: number;   // 图案种类
    layer: number;    // 第几层(越大越在上层,优先被点击)
    x: number;        // 相对棋盘中心的本地坐标
    y: number;
}

/**
 * 关卡生成器
 * 关键约束:每种图案出现的总数必须是 3 的倍数,否则牌无法全部消除。
 * 这里采用"先按 3 张一组凑出牌池 -> 洗牌 -> 铺到各层网格"的做法,
 * 保证可解(在不卡死的前提下)。
 */
export class LevelGenerator {

    /**
     * 生成一关的牌面布局
     * @param typeCount 图案种类数(默认取配置)
     */
    static generate(typeCount = GameConfig.TYPE_COUNT): TilePlacement[] {
        const layerCount = GameConfig.LAYER_COUNT;
        const slotsPerLayer = GameConfig.SLOTS_PER_LAYER;

        // 1. 计算总牌数,向下取整为 3 的倍数
        let total = layerCount * slotsPerLayer;
        total -= total % 3;

        // 2. 构造牌池:每次塞入同一种图案 ×3,直到填满
        const pool: number[] = [];
        const groups = total / 3;
        for (let i = 0; i < groups; i++) {
            const t = Math.floor(Math.random() * typeCount);
            pool.push(t, t, t);
        }
        this.shuffle(pool);

        // 3. 生成所有候选坐标(逐层),数量 >= total
        const positions = this.buildPositions(layerCount, total);

        // 4. 配对 typeId 与坐标
        const result: TilePlacement[] = [];
        for (let i = 0; i < total; i++) {
            const p = positions[i];
            result.push({ typeId: pool[i], layer: p.layer, x: p.x, y: p.y });
        }
        return result;
    }

    /** 逐层在网格上铺位置,层与层之间做半格错位以制造遮挡 */
    private static buildPositions(layerCount: number, total: number): { layer: number; x: number; y: number }[] {
        const { GRID_COLS, GRID_ROWS, GRID_STEP } = GameConfig;
        const cells: { layer: number; x: number; y: number }[] = [];

        const halfW = ((GRID_COLS - 1) * GRID_STEP) / 2;
        const halfH = ((GRID_ROWS - 1) * GRID_STEP) / 2;

        for (let layer = 0; layer < layerCount; layer++) {
            // 偶数层不偏移,奇数层在 x/y 上各偏移半格,形成交错堆叠
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
        // 按层排序便于 z 序生成,再取够数量
        const picked = cells.slice(0, total);
        picked.sort((a, b) => a.layer - b.layer);
        return picked;
    }

    /** Fisher-Yates 洗牌 */
    private static shuffle<T>(arr: T[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
