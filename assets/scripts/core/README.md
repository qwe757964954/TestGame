# 三张堆叠消除核心玩法(羊了个羊 / Role Match 式)

本工程 `assets/scripts/core` 下的核心脚本。Cocos Creator 3.8。

包含:分层堆叠发牌、遮挡判定(被上层压住的牌变灰不可点)、底部 7 卡槽、三连消除、满槽判负、全消胜利。

## 脚本

- `GameConfig.ts` — 全局参数(槽容量/层数/种类/网格步长)
- `LevelGenerator.ts` — 关卡生成(保证每种图案数量为 3 的倍数 → 可全消)
- `Tile.ts` — 单张牌:点击、图标、遮挡变灰、飞入卡槽动画;含 `overlapRatio` 工具
- `SlotBar.ts` — 卡槽:按类型聚拢、三连消除、满槽判负
- `GameManager.ts` — 主控:发牌、z 序、遮挡刷新、胜负判定

## 在编辑器里搭场景(约 10 分钟)

1. **Tile 预制体**
   - 新建节点 `Tile`,加 `Sprite`(底框)、`UITransform` 设为 90×90(与 `GameConfig.TILE_SIZE` 一致)。
   - 子节点 `Icon` 加 `Sprite`,显示图案。
   - 给 `Tile` 根节点挂 `Tile.ts`,把子节点 `Icon` 的 Sprite 拖到 `icon` 字段。
   - 存为预制体 `Tile.prefab`。

2. **场景层级**
   ```
   Canvas
   ├─ GameRoot        (挂 GameManager.ts)
   │  └─ BoardRoot    (空节点,放棋盘牌)
   ├─ SlotBarNode     (挂 SlotBar.ts)
   │  └─ SlotRoot     (空节点 + UITransform,放收进卡槽的牌)
   ├─ WinPanel        (可选,默认隐藏)
   └─ LosePanel       (可选,默认隐藏)
   ```

3. **连引用**
   - `SlotBar`:`SlotRoot` → `slotRoot`。
   - `GameManager`:`Tile.prefab` → `tilePrefab`,`BoardRoot` → `boardRoot`,`SlotBarNode` → `slotBar`,8 张以上图案 SpriteFrame 拖进 `iconFrames`(长度 ≥ `TYPE_COUNT`,默认 8),可选 `winPanel` / `losePanel`。

4. 运行预览。点牌收入卡槽,凑齐 3 张同图案自动消除。

## 调难度

都在 `GameConfig.ts`:`LAYER_COUNT`(层数)、`SLOTS_PER_LAYER`、`TYPE_COUNT`(种类越多越难)、`COVER_OVERLAP_RATIO`(遮挡灵敏度)。

## 微信 / 抖音双端构建要点

一套代码导出两份。

### 微信小游戏
- **项目 → 构建发布**,平台选 **微信小游戏**,填 AppID(微信公众平台「小游戏」类目),构建。
- 产物用 **微信开发者工具** 打开、上传体验版,再到公众平台提交审核。
- 主包首包 ≤ 4MB,超出走分包 / 远程资源(构建里勾「分离引擎」「资源服务器地址」)。
- 广告变现用激励视频 `wx.createRewardedVideoAd`。

### 抖音小游戏
- 同样 **构建发布**,平台选 **字节跳动 / 抖音小游戏**(没有该平台时在 Dashboard 扩展商店装「ByteDance Mini Game」发布插件)。
- 产物用 **抖音开发者工具** 打开,在抖音开放平台创建小游戏拿 AppID。
- 广告用 `tt.createRewardedVideoAd`(API 同微信,前缀为 `tt`)。

### 跨端隔离建议
把登录/广告/分享/支付的平台差异收进一个适配层(如 `platform/Platform.ts`),玩法层只调统一接口,加新平台只改适配层。

## 已知简化(原型范围)
- 未做无解检测 / 自动洗牌,极端布局理论上可能卡死;建议加道具兜底。
- 消除/飞入用基础 tween,无粒子音效。
- 美术为占位 SpriteFrame,替换正式图案即可。
