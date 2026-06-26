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
