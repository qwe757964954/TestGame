#!/usr/bin/env python3
"""把 svg/ 下的角色矢量图批量渲染成透明底 PNG(128/256/512 三档)。
用 Playwright(无头 Chromium)渲染,纯 pip 安装、不依赖系统 Cairo 库,Windows 友好。

安装(命令行依次执行):
    python -m pip install playwright
    python -m playwright install chromium

运行:
    python render_png.py

输出:png/128、png/256、png/512 下与 svg 同名的 .png(透明底)
"""
import os, glob

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    raise SystemExit("缺少 playwright,请先执行:\n  python -m pip install playwright\n  python -m playwright install chromium")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "svg")
SIZES = [128, 256, 512]

svgs = sorted(glob.glob(os.path.join(SRC, "*.svg")))
if not svgs:
    raise SystemExit(f"未找到 SVG:{SRC}")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    for size in SIZES:
        out = os.path.join(HERE, "png", str(size))
        os.makedirs(out, exist_ok=True)
        for s in svgs:
            name = os.path.splitext(os.path.basename(s))[0]
            with open(s, "r", encoding="utf-8") as f:
                svg = f.read()
            html = ('<!doctype html><meta charset="utf-8">'
                    '<body style="margin:0;padding:0">'
                    f'<div id="c" style="width:{size}px;height:{size}px">{svg}</div>')
            page.set_viewport_size({"width": size, "height": size})
            page.set_content(html)
            page.eval_on_selector("svg",
                "el => { el.setAttribute('width', el.parentElement.style.width); "
                "el.setAttribute('height', el.parentElement.style.height); }")
            page.query_selector("#c").screenshot(
                path=os.path.join(out, name + ".png"), omit_background=True)
        print(f"[ok] {size}px -> {out}  ({len(svgs)} 张)")
    browser.close()

print("完成。")
