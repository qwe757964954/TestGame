/**
 * 全局配置常量
 * 三张堆叠消除(羊了个羊式)原型
 */
export const GameConfig = {
    /** 卡槽容量,装满且无三连即判负 */
    SLOT_CAPACITY: 7,

    /** 单张牌的逻辑尺寸(像素),用于遮挡包围盒计算 */
    TILE_SIZE: 90,

    /** 牌面图案种类数量(需与传入的 SpriteFrame 数组长度一致) */
    TYPE_COUNT: 8,

    /** 堆叠层数 */
    LAYER_COUNT: 4,

    /** 每层在网格上的可用槽位数(实际生成数会向下取整为3的倍数) */
    SLOTS_PER_LAYER: 12,

    /**
     * 同层网格步长。设为 TILE_SIZE/2 让上下层产生半格错位,
     * 这样上层牌能压住下层多张,形成羊了个羊的遮挡感。
     */
    GRID_STEP: 60,

    /** 棋盘网格列数 / 行数(用于在范围内随机摆放) */
    GRID_COLS: 7,
    GRID_ROWS: 7,

    /** 判定为"被遮挡"所需的最小重叠面积比例(0~1) */
    COVER_OVERLAP_RATIO: 0.15,

    /** 牌移动到卡槽的动画时长(秒) */
    MOVE_DURATION: 0.18,
};

/** 关卡难度参数 */
export interface LevelParams { typeCount: number; layerCount: number; slotsPerLayer: number; }

/**
 * 按关卡号生成难度:种类、层数、每层牌数随关卡持续递增。
 * 封顶抬高,难度爬升到约 16 关(总牌数从 ~27 一路升到 ~138),不再早早停在 78。
 * 注:typeCount 上限 8 受图标素材数限制(要更多种类需补图标)。
 */
export function levelParams(level: number): LevelParams {
    const L = Math.max(1, level);
    const typeCount = Math.min(4 + Math.floor((L - 1) / 2), 8);     // 4 → 8(第 9 关封顶)
    const layerCount = Math.min(2 + Math.floor((L - 1) / 3), 7);    // 2 → 7(第 16 关封顶)
    const slotsPerLayer = Math.min(9 + (L - 1), 20);                // 9 → 20(第 12 关封顶)
    return { typeCount, layerCount, slotsPerLayer };
}
