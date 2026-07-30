/**
 * 站点标识 —— 名字与头像的**唯一来源**。
 *
 * 别在组件里再写一遍字符串：`index.html` 的 `<title>`、顶栏、页脚、文档标题
 * 全部从这里派生，改一处就够。
 */
export const SITE_NAME = '二叉树树工具箱';

/**
 * 头像。`spec=0` 是原图（约 70KB），顶栏里只显示成 24px。
 *
 * 这里刻意**不**降到 `spec=140`：本站是个七页的小应用、只有顶栏一处用它，
 * 而原图在浏览器缓存里躺一次就够了。主站那边是每个页面都带、且有几百个页面，
 * 那才必须用 140 档。
 */
export const SITE_AVATAR = 'https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0';

export const SITE_DESCRIPTION =
  '封面制作、图片水印、格式转换、文件索引、B站封面提取、Tier List、追番记录 —— 全部在浏览器本地跑，图片不上传。';
