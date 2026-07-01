import { Node, Canvas, Camera, UITransform, Layers, Color, director, find } from 'cc';

/**
 * 确保当前场景有可用的 2D Canvas(含 UI 相机)。
 * 用于程序化构建的空场景(Home / LevelSelect):运行时自建,无需在编辑器里手摆。
 */
export function ensureCanvas(): Node {
    const existing = find('Canvas');
    if (existing) return existing;

    const scene = director.getScene()!;

    const camNode = new Node('UICamera');
    scene.addChild(camNode);
    camNode.setPosition(0, 0, 1000);
    const cam = camNode.addComponent(Camera);
    cam.projection = Camera.ProjectionType.ORTHO;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(186, 224, 240, 255);
    cam.visibility = Layers.Enum.UI_2D;
    cam.near = 0;
    cam.far = 2000;

    const cn = new Node('Canvas');
    cn.layer = Layers.Enum.UI_2D;
    scene.addChild(cn);
    cn.addComponent(UITransform);
    const cv = cn.addComponent(Canvas);
    cv.cameraComponent = cam;
    return cn;
}
