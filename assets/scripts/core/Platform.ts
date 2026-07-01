/**
 * 平台适配:微信小游戏好友排行相关。
 * 非微信环境(编辑器/网页/原生)下所有方法安全降级为无操作,排行榜走本地模拟。
 */

declare const wx: any;

function getWx(): any { return (typeof wx !== 'undefined') ? wx : null; }

/** 是否运行在微信小游戏环境(具备开放数据域能力) */
export function isWeChat(): boolean {
    const w = getWx();
    return !!w && typeof w.getOpenDataContext === 'function';
}

/** 上报本人最高分到微信托管云存储(供好友排行读取) */
export function reportScore(score: number) {
    const w = getWx();
    if (!w || typeof w.setUserCloudStorage !== 'function') return;
    try {
        w.setUserCloudStorage({
            KVDataList: [{ key: 'score', value: String(Math.max(0, Math.floor(score))) }],
            success: () => { }, fail: () => { },
        });
    } catch (e) { /* ignore */ }
}

/** 通知开放数据域把好友排行绘制到 sharedCanvas */
export function postRankRender(width: number, height: number) {
    const w = getWx();
    if (!w || typeof w.getOpenDataContext !== 'function') return;
    try {
        w.getOpenDataContext().postMessage({ type: 'renderRank', width: Math.round(width), height: Math.round(height) });
    } catch (e) { /* ignore */ }
}
