/** 角色资料(顺序与 iconFrames / typeId 一致) */
export interface CharInfo { name: string; rarity: string; }

export const CHARACTERS: CharInfo[] = [
    { name: '樱花猫娘', rarity: '史诗' }, // 0
    { name: '机械喵', rarity: '稀有' },   // 1
    { name: '皇冠王', rarity: '传说' },   // 2
    { name: '招财蛙', rarity: '稀有' },   // 3
    { name: '柯基', rarity: '普通' },     // 4
    { name: '小幽灵', rarity: '稀有' },   // 5
    { name: '外星崽', rarity: '普通' },   // 6
    { name: '墨镜哥', rarity: '普通' },   // 7
];

/** 稀有度对应胶囊配色 [bgRGB, textRGB] */
export const RARITY_PILL: { [k: string]: { bg: number[]; tc: number[] } } = {
    '普通': { bg: [192, 221, 151], tc: [39, 80, 10] },
    '稀有': { bg: [181, 212, 244], tc: [12, 68, 124] },
    '史诗': { bg: [206, 203, 246], tc: [60, 52, 137] },
    '传说': { bg: [250, 199, 117], tc: [99, 56, 6] },
};
