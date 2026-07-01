import { sys } from 'cc';

const KEY = 'triplematch_save_v2';

export type PropKey = 'undo' | 'shuffle' | 'eject';

/** 道具中文名(UI 用) */
export const PROP_LABELS: Record<PropKey, string> = { undo: '撤销', shuffle: '洗牌', eject: '移出' };

/** 体力上限与单点恢复间隔 */
export const LIVES_MAX = 5;
export const LIFE_REGEN_MS = 20 * 60 * 1000; // 20 分钟恢复 1 点体力

/** 签到 7 天循环奖励 */
export const SIGNIN_REWARDS: { coin?: number; diamond?: number; prop?: PropKey }[] = [
    { coin: 100 }, { prop: 'undo' }, { coin: 150 }, { prop: 'shuffle' },
    { coin: 200 }, { prop: 'eject' }, { diamond: 5 },
];

/** 商店商品:用金币/钻石购买,发放货币/体力/道具 */
export interface ShopItem {
    id: string;
    name: string;
    desc: string;
    cost: { coin?: number; diamond?: number };
    grant: { coin?: number; diamond?: number; life?: number | 'full'; prop?: PropKey; propN?: number };
}

export const SHOP_ITEMS: ShopItem[] = [
    { id: 'life_full', name: '体力补满', desc: '立即回满体力', cost: { diamond: 10 }, grant: { life: 'full' } },
    { id: 'undo_5', name: '撤销 ×5', desc: '后悔药·撤回上一步', cost: { coin: 300 }, grant: { prop: 'undo', propN: 5 } },
    { id: 'shuffle_5', name: '洗牌 ×5', desc: '重排棋盘图案', cost: { coin: 300 }, grant: { prop: 'shuffle', propN: 5 } },
    { id: 'eject_5', name: '移出 ×3', desc: '弹出卡槽 3 张', cost: { coin: 400 }, grant: { prop: 'eject', propN: 3 } },
    { id: 'coin_1000', name: '金币 ×1000', desc: '钻石兑换金币', cost: { diamond: 20 }, grant: { coin: 1000 } },
    { id: 'diamond_50', name: '钻石 ×50', desc: '限时金币礼包', cost: { coin: 5000 }, grant: { diamond: 50 } },
];

/** 失败复活花费(钻石) */
export const REVIVE_COST = 5;

/** 关卡结算金币奖励:基础 + 关卡 + 得分 */
export function winReward(level: number, score: number): number {
    return 60 + level * 12 + Math.floor(score / 20);
}

/** 每日任务 */
export type DailyType = 'play' | 'match' | 'signin';
export interface DailyTask { id: string; name: string; type: DailyType; goal: number; coin: number; }
export const DAILY_TASKS: DailyTask[] = [
    { id: 'play3', name: '完成 3 个关卡', type: 'play', goal: 3, coin: 200 },
    { id: 'match20', name: '消除 20 组', type: 'match', goal: 20, coin: 150 },
    { id: 'signin', name: '完成每日签到', type: 'signin', goal: 1, coin: 100 },
];

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 千分位:1280 -> 1,280 */
export function fmt(n: number): string { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

/** 本地存档:进度 + 图鉴 + 经济(金币/钻石/体力/道具)+ 签到 */
class GameDataClass {
    level = 1;
    playLevel = 1;
    codex: number[] = [];

    coins = 1280;
    diamonds = 45;
    lives = 5;
    livesMax = LIVES_MAX;
    lastLifeTs = 0;     // 上次「未满体力」起算的时间戳(ms);满体力时为 0
    props: Record<PropKey, number> = { undo: 3, shuffle: 1, eject: 2 };

    signinClaimed = 0;   // 已签到天数(累计,用于循环索引)
    lastClaim = '';      // 上次签到日期

    highScore = 0;       // 历史最高分(排行榜用)

    // 每日任务(按日期重置)
    dailyDate = '';
    dailyPlay = 0;       // 今日完成关卡数
    dailyMatch = 0;      // 今日消除组数
    dailyClaimed: string[] = []; // 今日已领取的任务 id

    load() {
        try {
            const s = sys.localStorage.getItem(KEY);
            if (s) {
                const d = JSON.parse(s);
                this.level = d.level || 1;
                this.playLevel = d.playLevel || this.level;
                this.codex = Array.isArray(d.codex) ? d.codex : [];
                this.coins = d.coins ?? 1280;
                this.diamonds = d.diamonds ?? 45;
                this.lives = d.lives ?? 5;
                this.lastLifeTs = d.lastLifeTs ?? 0;
                if (d.props) this.props = { undo: d.props.undo ?? 3, shuffle: d.props.shuffle ?? 1, eject: d.props.eject ?? 2 };
                this.signinClaimed = d.signinClaimed || 0;
                this.lastClaim = d.lastClaim || '';
                this.highScore = d.highScore || 0;
                this.dailyDate = d.dailyDate || '';
                this.dailyPlay = d.dailyPlay || 0;
                this.dailyMatch = d.dailyMatch || 0;
                this.dailyClaimed = Array.isArray(d.dailyClaimed) ? d.dailyClaimed : [];
            }
        } catch (e) { /* ignore */ }
        this.tickLives();
        this.resetDailyIfNeeded();
    }

    save() {
        sys.localStorage.setItem(KEY, JSON.stringify({
            level: this.level, playLevel: this.playLevel, codex: this.codex,
            coins: this.coins, diamonds: this.diamonds, lives: this.lives, lastLifeTs: this.lastLifeTs, props: this.props,
            signinClaimed: this.signinClaimed, lastClaim: this.lastClaim, highScore: this.highScore,
            dailyDate: this.dailyDate, dailyPlay: this.dailyPlay, dailyMatch: this.dailyMatch, dailyClaimed: this.dailyClaimed,
        }));
    }

    unlockLevel(n: number) { if (n > this.level) { this.level = n; this.save(); } }
    addCodex(typeId: number): boolean { if (this.codex.indexOf(typeId) < 0) { this.codex.push(typeId); this.save(); return true; } return false; }
    get collectedCount() { return this.codex.length; }

    // ---------- 经济:货币 ----------
    spendCoins(n: number): boolean { if (this.coins < n) return false; this.coins -= n; this.save(); return true; }
    addCoins(n: number) { this.coins += n; this.save(); }
    spendDiamonds(n: number): boolean { if (this.diamonds < n) return false; this.diamonds -= n; this.save(); return true; }
    addDiamonds(n: number) { this.diamonds += n; this.save(); }

    // ---------- 经济:道具 ----------
    addProp(k: PropKey, n: number) { this.props[k] += n; this.save(); }
    useProp(k: PropKey): boolean { if (this.props[k] <= 0) return false; this.props[k]--; this.save(); return true; }

    // ---------- 经济:体力(定时恢复) ----------
    /** 按经过时间结算体力恢复。每次读取/消耗前调用。 */
    tickLives() {
        if (this.lives >= this.livesMax) { this.lastLifeTs = 0; return; }
        if (!this.lastLifeTs) { this.lastLifeTs = Date.now(); this.save(); return; }
        const elapsed = Date.now() - this.lastLifeTs;
        if (elapsed < LIFE_REGEN_MS) return;
        const gained = Math.floor(elapsed / LIFE_REGEN_MS);
        this.lives = Math.min(this.livesMax, this.lives + gained);
        this.lastLifeTs = this.lives >= this.livesMax ? 0 : this.lastLifeTs + gained * LIFE_REGEN_MS;
        this.save();
    }
    /** 距离下一点体力恢复剩余毫秒(满体力返回 0) */
    msToNextLife(): number {
        this.tickLives();
        if (this.lives >= this.livesMax) return 0;
        if (!this.lastLifeTs) return LIFE_REGEN_MS;
        return Math.max(0, LIFE_REGEN_MS - (Date.now() - this.lastLifeTs));
    }
    addLives(n: number) {
        this.tickLives();
        const wasFull = this.lives >= this.livesMax;
        this.lives = Math.min(this.livesMax, this.lives + n);
        if (wasFull && this.lives < this.livesMax) this.lastLifeTs = Date.now();
        if (this.lives >= this.livesMax) this.lastLifeTs = 0;
        this.save();
    }
    refillLives() { this.lives = this.livesMax; this.lastLifeTs = 0; this.save(); }
    useLife(): boolean {
        this.tickLives();
        if (this.lives <= 0) return false;
        const wasFull = this.lives >= this.livesMax;
        this.lives--;
        if (wasFull) this.lastLifeTs = Date.now(); // 从满变不满,开始计时
        this.save();
        return true;
    }

    // ---------- 商店 ----------
    canAfford(it: ShopItem): boolean {
        return (!it.cost.coin || this.coins >= it.cost.coin) && (!it.cost.diamond || this.diamonds >= it.cost.diamond);
    }
    /** 购买商品:成功扣费发货并存档,余额不足返回 false */
    buyShopItem(id: string): boolean {
        const it = SHOP_ITEMS.find(s => s.id === id);
        if (!it || !this.canAfford(it)) return false;
        if (it.cost.coin) this.coins -= it.cost.coin;
        if (it.cost.diamond) this.diamonds -= it.cost.diamond;
        const g = it.grant;
        if (g.coin) this.coins += g.coin;
        if (g.diamond) this.diamonds += g.diamond;
        if (g.prop && g.propN) this.props[g.prop] += g.propN;
        if (g.life === 'full') this.lives = this.livesMax, this.lastLifeTs = 0;
        else if (typeof g.life === 'number') this.addLives(g.life);
        this.save();
        return true;
    }

    // ---------- 最高分 ----------
    recordScore(s: number) { if (s > this.highScore) { this.highScore = s; this.save(); } }

    // ---------- 每日任务 ----------
    private resetDailyIfNeeded() {
        const t = today();
        if (this.dailyDate !== t) {
            this.dailyDate = t; this.dailyPlay = 0; this.dailyMatch = 0; this.dailyClaimed = [];
            this.save();
        }
    }
    addDailyPlay() { this.resetDailyIfNeeded(); this.dailyPlay++; this.save(); }
    addDailyMatch(n = 1) { this.resetDailyIfNeeded(); this.dailyMatch += n; this.save(); }
    /** 任务当前进度值 */
    dailyCurrent(task: DailyTask): number {
        this.resetDailyIfNeeded();
        if (task.type === 'play') return this.dailyPlay;
        if (task.type === 'match') return this.dailyMatch;
        return this.canSignToday() ? 0 : 1; // signin:今天签过为 1
    }
    dailyDone(task: DailyTask): boolean { return this.dailyCurrent(task) >= task.goal; }
    dailyIsClaimed(task: DailyTask): boolean { return this.dailyClaimed.indexOf(task.id) >= 0; }
    /** 领取任务奖励;未达成或已领取返回 false */
    claimDaily(id: string): boolean {
        this.resetDailyIfNeeded();
        const task = DAILY_TASKS.find(t => t.id === id);
        if (!task || !this.dailyDone(task) || this.dailyIsClaimed(task)) return false;
        this.dailyClaimed.push(id);
        this.coins += task.coin;
        this.save();
        return true;
    }
    /** 有可领取的每日任务(首页红点用) */
    hasDailyClaimable(): boolean { return DAILY_TASKS.some(t => this.dailyDone(t) && !this.dailyIsClaimed(t)); }

    // ---------- 签到 ----------
    canSignToday(): boolean { return this.lastClaim !== today(); }
    /** 今天将要领取的奖励(预览用) */
    nextSigninReward() { return SIGNIN_REWARDS[this.signinClaimed % SIGNIN_REWARDS.length]; }
    doSignin() {
        if (!this.canSignToday()) return null;
        const r = SIGNIN_REWARDS[this.signinClaimed % SIGNIN_REWARDS.length];
        if (r.coin) this.coins += r.coin;
        if (r.diamond) this.diamonds += r.diamond;
        if (r.prop) this.props[r.prop] += 1;
        this.signinClaimed++;
        this.lastClaim = today();
        this.save();
        return r;
    }
}

export const GameData = new GameDataClass();
