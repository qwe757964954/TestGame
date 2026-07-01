/**
 * 关卡主题。每个主题有名字和一套配色,作用于选关页与游戏内背景。
 * themeFor:每 5 关切换一个主题,走完 10 个后停在最后一个(不循环)。
 */

export interface Theme {
    name: string;
    sky: number[];        // 背景下半主色
    skyTop: number[];     // 背景上半色
    cloud: number[];      // 云 / 白色装饰
    ground: number[];     // 地面 / 草地主色
    groundDark: number[]; // 地面暗色(描边层)
    accent: number[];     // 标题强调色(用在白底面板上)
}

/** 每个主题持续的关卡数 */
export const LEVELS_PER_THEME = 5;

export const THEMES: Theme[] = [
    { name: '樱花小镇', sky: [205, 235, 247], skyTop: [186, 224, 240], cloud: [255, 255, 255], ground: [192, 221, 151], groundDark: [151, 196, 89], accent: [212, 83, 126] },
    { name: '薄荷海湾', sky: [200, 238, 232], skyTop: [168, 224, 220], cloud: [255, 255, 255], ground: [150, 214, 196], groundDark: [96, 180, 158], accent: [18, 150, 150] },
    { name: '枫叶山谷', sky: [247, 226, 205], skyTop: [240, 206, 176], cloud: [255, 250, 245], ground: [221, 170, 120], groundDark: [180, 120, 70], accent: [200, 90, 40] },
    { name: '星光夜市', sky: [62, 56, 98], skyTop: [40, 38, 72], cloud: [186, 190, 232], ground: [92, 84, 146], groundDark: [62, 54, 112], accent: [240, 200, 90] },
    { name: '云顶花园', sky: [205, 235, 247], skyTop: [180, 222, 240], cloud: [255, 255, 255], ground: [150, 210, 140], groundDark: [90, 170, 90], accent: [80, 160, 120] },
    { name: '糖果工坊', sky: [255, 228, 240], skyTop: [250, 210, 230], cloud: [255, 255, 255], ground: [255, 200, 150], groundDark: [240, 160, 110], accent: [230, 90, 140] },
    { name: '沙漠绿洲', sky: [250, 235, 200], skyTop: [244, 222, 168], cloud: [255, 252, 240], ground: [225, 200, 120], groundDark: [190, 160, 80], accent: [200, 140, 40] },
    { name: '极地冰原', sky: [224, 242, 250], skyTop: [200, 230, 245], cloud: [255, 255, 255], ground: [200, 225, 235], groundDark: [150, 190, 210], accent: [60, 140, 200] },
    { name: '熔岩火山', sky: [74, 48, 46], skyTop: [46, 30, 30], cloud: [206, 162, 150], ground: [150, 70, 50], groundDark: [110, 46, 36], accent: [240, 120, 50] },
    { name: '深海秘境', sky: [40, 72, 102], skyTop: [26, 52, 80], cloud: [150, 200, 210], ground: [40, 112, 122], groundDark: [26, 80, 90], accent: [60, 200, 190] },
];

/** 按关卡号取主题:每 LEVELS_PER_THEME 关一换,超出后保持最后一个(不循环) */
export function themeFor(level: number): Theme {
    const idx = Math.floor((Math.max(1, level) - 1) / LEVELS_PER_THEME);
    return THEMES[Math.min(idx, THEMES.length - 1)];
}

export function themeIndexFor(level: number): number {
    return Math.min(Math.floor((Math.max(1, level) - 1) / LEVELS_PER_THEME), THEMES.length - 1);
}
