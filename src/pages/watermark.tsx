import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { track } from '@/lib/track';
import { useTitle } from '@/lib/use-title';

export default function WatermarkPage() {
  useTitle('图片水印');

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imageLoadedRef = useRef<HTMLImageElement | null>(null);
  const [watermarkText, setWatermarkText] = useState('');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(30);
  const [position, setPosition] = useState('右下');
  const [mode, setMode] = useState('single');
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  const resetDefaults = useCallback(() => {
    setWatermarkText('');
    setFontSize(48);
    setOpacity(30);
    setPosition('右下');
    setMode('single');
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      imageLoadedRef.current = img;
      // 解码完成才 setState：否则下面那条 effect 拿到的 img 还没有
      // naturalWidth，画出来是 0×0 的空 canvas
      setImageSrc(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  }, []);

  // 参数一变就重画。图片全程在 canvas 里，不出浏览器
  useEffect(() => {
    const img = imageLoadedRef.current;
    const text = watermarkText.trim();
    if (!img || !text) {
      setProcessedUrl(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const fs = fontSize;
    const op = opacity;
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.fillStyle = op >= 100 ? '#ffffff' : `rgba(255,255,255,${op / 100})`;
    ctx.textBaseline = 'bottom';

    const textWidth = ctx.measureText(text).width;
    const padding = 20;

    if (mode === 'tile') {
      const spacingX = textWidth + 60;
      const spacingY = fs + 60;
      for (let y = padding; y < canvas.height; y += spacingY) {
        for (let x = padding; x < canvas.width; x += spacingX) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      let x: number, y: number;
      switch (position) {
        case '左上':
          x = padding;
          y = fs + padding;
          break;
        case '右上':
          x = canvas.width - textWidth - padding;
          y = fs + padding;
          break;
        case '左下':
          x = padding;
          y = canvas.height - padding;
          break;
        default: // 右下
          x = canvas.width - textWidth - padding;
          y = canvas.height - padding;
      }
      ctx.fillText(text, x, y);
    }

    setProcessedUrl(canvas.toDataURL('image/png'));
  }, [imageSrc, watermarkText, fontSize, opacity, position, mode]);

  const handleDownload = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = 'watermarked.png';
    a.click();
    // 游离 anchor 的 click 不冒泡到 document，委托监听收不到，只能各自上报
    track('使用工具', { 工具: '图片水印', 动作: '下载', 位置: position });
  }, [processedUrl, position]);

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <Icon icon="mdi:water" className="size-6 text-primary" />
        <h1 className="text-xl font-bold">图片水印</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">选择图片</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFile}
                className="flex h-9 w-full items-center border border-input bg-background px-1.5 text-sm file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground file:cursor-pointer"
              />
            </div>
            <Button variant="outline" size="icon-lg" onClick={resetDefaults} title="恢复默认参数">
              <Icon icon="mdi:restore" className="size-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">水印文字</Label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="2x.nz"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">类型</Label>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 w-full items-center justify-between gap-1 border border-input bg-transparent px-3 text-left text-sm select-none focus:outline-none focus-visible:outline-none">
                  {mode === 'single' ? '单个水印' : '全屏平铺'}
                  <Icon icon="mdi:chevron-down" className="size-4 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[140px]">
                  <DropdownMenuItem onClick={() => setMode('single')}>单个水印</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('tile')}>全屏平铺</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">字体大小 ({fontSize})</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min={12}
                  max={200}
                  step={1}
                  className="h-2 flex-1 cursor-pointer appearance-none bg-muted accent-primary"
                />
              </div>
            </div>
            {mode === 'single' && (
              <div className="space-y-1.5">
                <Label className="text-xs">位置</Label>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-8 w-full items-center justify-between gap-1 border border-input bg-transparent px-3 text-left text-sm select-none focus:outline-none focus-visible:outline-none">
                      {position}
                      <Icon
                        icon="mdi:chevron-down"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full min-w-[100px]">
                      <DropdownMenuItem onClick={() => setPosition('左上')}>左上</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPosition('右上')}>右上</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPosition('左下')}>左下</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPosition('右下')}>右下</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">不透明度 ({opacity}%)</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                min={5}
                max={100}
                step={1}
                className="h-2 flex-1 cursor-pointer appearance-none bg-muted accent-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {imageSrc && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <img src={processedUrl || imageSrc} alt="水印结果" className="w-full border" />
            {processedUrl && (
              <Button className="w-full" variant="default" onClick={handleDownload}>
                <Icon icon="mdi:download" className="mr-1 size-4" />
                下载图片
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
