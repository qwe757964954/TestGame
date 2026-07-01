# 微信好友排行接入说明

代码已经接好,但「开放数据域」是微信小游戏的平台功能,**只能在微信开发者工具 / 真机里生效**,Cocos 编辑器预览和网页里会自动降级为本地模拟排行。

## 代码做了什么

- `assets/scripts/core/Platform.ts`：检测微信环境、上报本人最高分(`wx.setUserCloudStorage`)、通知子域渲染(`postMessage`)。非微信环境全部安全空操作。
- `assets/open-data/index.js`：开放数据域脚本。读取好友云存储里的 `score`(`wx.getFriendCloudStorage`),排序后绘制到 `sharedCanvas`。
- `HomeScene` 的「排行」按钮：微信环境走好友排行(`SubContextView` 把 sharedCanvas 贴到弹层),否则走本地模拟。
- 结算(胜/负)时调用 `reportScore` 上报最高分。

## 你需要在编辑器里做的事

1. **构建平台选微信小游戏**:菜单 `项目 → 构建发布`,平台选「微信小游戏」。
2. **设置开放数据域目录**:在构建面板的「开放数据域根目录 / Open Data Context Root」填 `assets/open-data`(即本目录)。
3. **挂 SubContextView(可选,推荐)**:若希望排行直接贴到弹层,在场景里放一个节点挂 Cocos 内置的 `SubContextView` 组件;当前代码会用字符串方式尝试自动添加,挂上更稳。
4. **微信后台开通**:在微信公众平台为该小游戏开通「好友关系链」能力,否则 `getFriendCloudStorage` 取不到数据。
5. 用微信开发者工具打开构建出的 `build/wechatgame` 目录运行;真机需登录、且好友也玩过并上报过分数才能看到他们。

## 数据键

本人分数以 KV 形式存:`key = "score"`,`value = 最高分字符串`。好友域按同一 key 读取并排序。

## 调试提示

- 取不到好友数据通常是:未开通关系链、好友没玩过、或不在微信环境。
- 本地(编辑器/网页)看到的是模拟玩家,属正常降级。
