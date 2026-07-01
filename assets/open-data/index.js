// 微信小游戏「开放数据域」入口。
// 该目录需在 Cocos 构建设置里设为 “Open Data Context Root”,仅在微信环境生效。
// 职责:读取好友云存储里的 score,把好友排行榜绘制到 sharedCanvas。
//
// 注意:本文件在浏览器/编辑器预览里也可能被加载,因此必须先做平台判断,
// 非微信环境直接退出,避免 “wx is not defined” 顶层报错。

/* global wx */
(function () {
    'use strict';

    // —— 平台判断:没有 wx 或拿不到 sharedCanvas 就直接不初始化 ——
    if (typeof wx === 'undefined' || typeof wx.getSharedCanvas !== 'function') {
        return;
    }

    var sharedCanvas = wx.getSharedCanvas();
    var ctx = sharedCanvas.getContext('2d');

    function drawRank(opts) {
        var W = (opts && opts.width) || sharedCanvas.width || 600;
        var H = (opts && opts.height) || sharedCanvas.height || 800;
        sharedCanvas.width = W;
        sharedCanvas.height = H;

        if (typeof wx.getFriendCloudStorage !== 'function') { render(W, H, []); return; }
        wx.getFriendCloudStorage({
            keyList: ['score'],
            success: function (res) {
                var list = (res.data || []).map(function (u) {
                    var score = 0;
                    var kv = (u.KVDataList || []).filter(function (k) { return k.key === 'score'; })[0];
                    if (kv) score = parseInt(kv.value, 10) || 0;
                    return { name: u.nickname || '玩家', score: score };
                });
                list.sort(function (a, b) { return b.score - a.score; });
                render(W, H, list);
            },
            fail: function () { render(W, H, []); }
        });
    }

    function render(W, H, list) {
        ctx.clearRect(0, 0, W, H);
        ctx.textBaseline = 'middle';

        if (!list.length) {
            ctx.fillStyle = '#8a8478';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无好友数据', W / 2, H / 2);
            return;
        }

        var rowH = Math.min(64, Math.floor(H / Math.max(8, list.length)));
        var maxRows = Math.floor(H / rowH);
        list.slice(0, maxRows).forEach(function (u, i) {
            var top = i * rowH;
            var y = top + rowH / 2;
            ctx.fillStyle = (i % 2) ? 'rgba(248,245,238,0.92)' : 'rgba(255,255,255,0.92)';
            roundRect(ctx, 8, top + 4, W - 16, rowH - 8, 10);
            ctx.fill();

            ctx.textAlign = 'left';
            ctx.fillStyle = i < 3 ? '#d68c14' : '#78766a';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('#' + (i + 1), 24, y);

            ctx.fillStyle = '#4a4a46';
            ctx.font = '24px sans-serif';
            ctx.fillText(u.name.length > 8 ? u.name.slice(0, 8) : u.name, 90, y);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#3c3489';
            ctx.fillText(String(u.score), W - 28, y);
        });
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    if (typeof wx.onMessage === 'function') {
        wx.onMessage(function (msg) {
            if (msg && msg.type === 'renderRank') drawRank(msg);
        });
    }

    // 首次默认绘制
    drawRank({});
})();
