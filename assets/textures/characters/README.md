# 角色美术资源(黏土风矢量)

8 个主牌面角色,扁平糖果 / 伪 3D 黏土风,统一光照与描边。源文件为矢量 SVG,可无损缩放、随时改色改造型。

## typeId 对应表

游戏里 `iconFrames` 数组的下标(typeId)按文件名前缀顺序排列:

| typeId | 文件 | 角色 | 主色 | 建议稀有度 |
|--------|------|------|------|-----------|
| 0 | 00_cat | 樱花猫娘 | 粉 | 史诗 |
| 1 | 01_robot_cat | 机械喵 | 蓝 | 稀有 |
| 2 | 02_king | 皇冠王 | 金 | 传说 |
| 3 | 03_frog | 招财蛙 | 绿 | 稀有 |
| 4 | 04_corgi | 柯基 | 橙 | 普通 |
| 5 | 05_ghost | 小幽灵 | 紫 | 稀有 |
| 6 | 06_alien | 外星崽 | 青 | 普通 |
| 7 | 07_cool | 墨镜哥 | 红 | 普通 |

## 目录

```
characters/
├─ svg/            矢量源文件(8 个,256×256,透明底)
├─ png/            渲染产物(运行脚本后生成 128/256/512 三档)
├─ render_png.py   批量 SVG -> PNG 脚本
└─ README.md
```

## 出 PNG(Cocos 用的是 PNG,不直接吃 SVG)

任选其一:

1. 本机跑脚本:`pip install cairosvg` 后 `python render_png.py`,自动在 `png/128|256|512` 下生成同名 PNG。
2. 无 Python 环境:用任意「SVG 转 PNG」在线工具或设计软件(Figma/Illustrator/Inkscape)导出 256×256 透明底即可。

> 本次因运行环境未就绪,PNG 尚未生成;脚本已就位,跑一次即可。

## 接入游戏

1. 把 `png/256/` 下的 8 张 PNG 拖进 Cocos 资源面板(纹理类型设为 sprite-frame)。
2. 选中场景里挂 `GameManager` 的节点,把这 8 张 SpriteFrame 按 typeId 顺序拖进 `iconFrames` 数组(00→下标0,依次)。
3. 局内牌面约 50px,256 档已足够清晰;首页/图鉴想更精细可用 512 档。

## 改造提示

每个 SVG 顶部 `radialGradient` 的两个 `stop-color` 控制主色(浅→深),`rect` 的 `fill`(rim 那条)是底部厚度色。改这三处就能整体换色。
