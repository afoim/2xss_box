import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ratio, ShadowConfig, ExportConfig } from './types';
import { CoverPreview } from './cover-preview';
import { TextSettings } from './text-settings';
import { IconSettings } from './icon-settings';
import { BackgroundSettings } from './background-settings';
import { SizeSettings } from './size-settings';
import { ColorSettings } from './color-settings';
import { IconBackgroundSettings } from './icon-background-settings';
import { ShadowSettings } from './shadow-settings';
import { ExportSettings } from './export-settings';
import { track } from '@/lib/track';

/**
 * Iconify 的原始 svg 文本缓存。图标名 → svg（或一个正在飞的 Promise）。
 * 只缓存**未上色**的原件，颜色在 processIconSvg 里现算。
 */
const rawIconCache = new Map<string, Promise<string>>();

function fetchRawIconSvg(iconName: string): Promise<string> {
  const cached = rawIconCache.get(iconName);
  if (cached) return cached;

  const [prefix, name] = iconName.split(':');
  const pending = fetch(`https://api.iconify.design/${prefix}/${name}.svg`)
    .then((res) => {
      if (!res.ok) throw new Error('Icon not found');
      return res.text();
    })
    .catch((err) => {
      // 失败的不留缓存，换个网络环境还能重试
      rawIconCache.delete(iconName);
      throw err;
    });
  rawIconCache.set(iconName, pending);
  return pending;
}

/** 把 Iconify 的原始 svg 处理成能塞进 foreignObject 的形态，并按需强制上色 */
function processIconSvg(svg: string, iconColor: string, useOriginalIconColor: boolean): string {
  return svg
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace(
      /<svg\b([^>]*)>/,
      '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet">',
    )
    .replace(/currentColor/gi, iconColor)
    .replace(/fill="[^"]*"/g, (m) => (useOriginalIconColor ? m : `fill="${iconColor}"`));
}

export function CoverGenerator() {
  const BASE_HEIGHT = 600;

  // ── Text state ──
  const [leftText, setLeftText] = useState('示例');
  const [rightText, setRightText] = useState('文本');
  const [fontWeight, setFontWeight] = useState(400);

  // ── Icon state ──
  const [iconName, setIconName] = useState('simple-icons:cloudflare');
  const [iconSize, setIconSize] = useState(64);
  const [iconSvg, setIconSvg] = useState('');
  const [localIcon, setLocalIcon] = useState<string | null>(null);
  const [showIcon, setShowIcon] = useState(true);
  const [iconColor, setIconColor] = useState('#000000');
  const [useOriginalIconColor, setUseOriginalIconColor] = useState(true);
  const [iconRadius, setIconRadius] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Font state ──
  const [fontSize, setFontSize] = useState(64);
  // 用 ref 而不是 state：这个 object URL 从不参与渲染（渲染看的是
  // customFontName），存进 state 只会白白多一次重渲染
  const customFontUrlRef = useRef<string | null>(null);
  const [customFontName, setCustomFontName] = useState('');

  // ── Spacing ──
  const [gap, setGap] = useState(20);

  // ── Color state ──
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgColorOpacity, setBgColorOpacity] = useState(1);
  const [linkColor, setLinkColor] = useState(true);

  // ── Shadow state ──
  const [textShadow, setTextShadow] = useState<ShadowConfig>({ x: 0, y: 0, blur: 0, color: '#000000', alpha: 0 });
  const [iconShadow, setIconShadow] = useState<ShadowConfig>({ x: 0, y: 0, blur: 0, color: '#000000', alpha: 0 });
  const [shadowTarget, setShadowTarget] = useState<'both' | 'text' | 'icon'>('both');

  // ── Icon background state ──
  const [iconBgEnabled, setIconBgEnabled] = useState(false);
  const [iconBgRadius, setIconBgRadius] = useState(20);
  const [iconBgColor, setIconBgColor] = useState('#000000');
  const [iconBgOpacity, setIconBgOpacity] = useState(0.2);
  const [iconBgBlur, setIconBgBlur] = useState(0);
  const [iconBgPadding, setIconBgPadding] = useState(10);

  // ── Background image state ──
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgImageX, setBgImageX] = useState(0);
  const [bgImageY, setBgImageY] = useState(0);
  const [bgImageScale, setBgImageScale] = useState(1);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(1);
  const [isBgDragOver, setIsBgDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Ratios ──
  const [ratios, setRatios] = useState<Ratio[]>([
    { label: '1:1', w: 1, h: 1, checked: false },
    { label: '4:3', w: 4, h: 3, checked: false },
    { label: '16:9', w: 16, h: 9, checked: true },
    { label: '21:9', w: 21, h: 9, checked: false },
  ]);

  // ── Scale linking ──
  const [linkScale, setLinkScale] = useState(true);
  const lastFontSizeRef = useRef(64);
  const lastIconSizeRef = useRef(64);

  // ── Export config ──
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    scales: [1],
    filename: 'cover',
    transparentBg: false,
    exportRatios: [],
  });

  // ── Mobile tab state ──
  const [mobileTab, setMobileTab] = useState<'content' | 'style' | 'export'>('content');

  // ── SVG ref ──
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Drag state refs ──
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const initialImageXRef = useRef(0);
  const initialImageYRef = useRef(0);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef(0);
  const initialScaleRef = useRef(1);

  // ── Derived canvas dimensions ──
  const activeRatios = ratios.filter((r) => r.checked);
  const visualRatios = activeRatios.length > 0 ? activeRatios : [ratios[2]];
  const maxWidthRatio = visualRatios.reduce((max, r) => (r.w / r.h > max ? r.w / r.h : max), 0);
  const canvasWidth = Math.round(BASE_HEIGHT * maxWidthRatio);
  const canvasHeight = BASE_HEIGHT;

  // ── Helper ──
  const hexToRgba = useCallback((hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  // ── Shadow update ──
  const updateShadow = useCallback(
    (key: string, value: string | number) => {
      if (shadowTarget === 'both' || shadowTarget === 'text') {
        setTextShadow((prev) => ({ ...prev, [key]: value }));
      }
      if (shadowTarget === 'both' || shadowTarget === 'icon') {
        setIconShadow((prev) => ({ ...prev, [key]: value }));
      }
    },
    [shadowTarget]
  );

  // ── Color change ──
  const handleColorChange = useCallback(
    (newColor: string, type: 'text' | 'icon') => {
      if (type === 'text') {
        setColor(newColor);
        if (linkColor) setIconColor(newColor);
      } else {
        setIconColor(newColor);
        if (linkColor) setColor(newColor);
      }
    },
    [linkColor]
  );

  // ── Font size change with linked scaling ──
  const handleFontSizeChange = useCallback(
    (value: number) => {
      if (linkScale) {
        const ratio = value / lastFontSizeRef.current;
        setIconSize((prev) => {
          const newSize = Math.round(prev * ratio);
          lastIconSizeRef.current = newSize;
          return newSize;
        });
      }
      setFontSize(value);
      lastFontSizeRef.current = value;
    },
    [linkScale]
  );

  // ── Icon size change with linked scaling ──
  const handleIconSizeChange = useCallback(
    (value: number) => {
      if (linkScale) {
        const ratio = value / lastIconSizeRef.current;
        setFontSize((prev) => {
          const newSize = Math.round(prev * ratio);
          lastFontSizeRef.current = newSize;
          return newSize;
        });
      }
      setIconSize(value);
      lastIconSizeRef.current = value;
    },
    [linkScale]
  );

  // ── Background image upload ──
  const loadBgImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBgImage(e.target?.result as string);
      setBgImageX(0);
      setBgImageY(0);
      setBgImageScale(1);
      setBgBlur(0);
      setBgOpacity(1);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleBgImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadBgImageFile(file);
    },
    [loadBgImageFile]
  );

  // ── Font upload ──
  // 上传的字体 blob 会一直被 object URL 钉在内存里。连传几个字体文件（动辄
  // 几 MB 到几十 MB）而不释放旧的，标签页就一路涨上去 —— 所以每次换字体都
  // 先把上一个 URL 撤掉。这也正是 customFont 这个 state 存在的意义。
  const revokeCustomFont = useCallback(() => {
    if (customFontUrlRef.current) {
      URL.revokeObjectURL(customFontUrlRef.current);
      customFontUrlRef.current = null;
    }
  }, []);

  // 页面卸载时也要撤，否则切走再回来就漏一份
  useEffect(() => revokeCustomFont, [revokeCustomFont]);

  const handleFontUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fontData = ev.target?.result as ArrayBuffer;
        const fontName = file.name.replace(/\.[^/.]+$/, '');
        const blob = new Blob([fontData]);
        const url = URL.createObjectURL(blob);
        const fontFace = new FontFace(fontName, `url(${url})`);
        fontFace
          .load()
          .then((loadedFace) => {
            document.fonts.add(loadedFace);
            revokeCustomFont();
            customFontUrlRef.current = url;
            setCustomFontName(fontName);
          })
          .catch(() => {
            // 不是合法字体文件：撤掉这次的 URL，保持原有字体不变
            URL.revokeObjectURL(url);
          });
      };
      reader.readAsArrayBuffer(file);
    },
    [revokeCustomFont],
  );

  const handleSystemFontSelect = useCallback(
    (fontName: string) => {
      revokeCustomFont();
      setCustomFontName(fontName);
    },
    [revokeCustomFont],
  );

  const handleRemoveFont = useCallback(() => {
    revokeCustomFont();
    setCustomFontName('');
  }, [revokeCustomFont]);

  // ── Icon search ──
  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=20`
      );
      const data = await res.json();
      setSearchResults(data.icons || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);
      clearTimeout(searchDebounceRef.current);
      if (val.trim()) {
        searchDebounceRef.current = setTimeout(() => handleSearch(val), 500);
      } else {
        setSearchResults([]);
      }
    },
    [handleSearch]
  );

  // ── Local icon upload ──
  const handleLocalIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalIcon(e.target?.result as string);
        setIconName('本地图片');
        setIconSvg('');
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const selectIcon = useCallback((icon: string) => {
    setIconName(icon);
    setLocalIcon(null);
  }, []);

  // ── Icon SVG 加载 / 重新上色 ──
  // 上色是纯字符串替换，**不需要重新下载**：原来这里是两段逐字节相同的 effect，
  // 一段监听图标名、一段监听颜色，于是拖一下颜色选择器就是一串
  // api.iconify.design 请求。现在原始 svg 进模块级缓存，换色只走本地。
  useEffect(() => {
    if (!iconName?.includes(':') || localIcon) {
      setIconSvg('');
      return;
    }
    let alive = true;
    fetchRawIconSvg(iconName)
      .then((svg) => {
        if (alive) setIconSvg(processIconSvg(svg, iconColor, useOriginalIconColor));
      })
      .catch(() => {
        if (alive) setIconSvg('');
      });
    return () => {
      alive = false;
    };
  }, [iconName, localIcon, iconColor, useOriginalIconColor]);

  // ── Background drag/drop ──
  const handleBgDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsBgDragOver(true);
  }, []);

  const handleBgDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsBgDragOver(false);
  }, []);

  const handleBgDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsBgDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) loadBgImageFile(file);
    },
    [loadBgImageFile]
  );

  // ── Pointer events for background image ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!bgImage) return;
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointersRef.current.size === 1) {
        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragStartYRef.current = e.clientY;
        initialImageXRef.current = bgImageX;
        initialImageYRef.current = bgImageY;
      } else if (activePointersRef.current.size === 2) {
        setIsDragging(false);
        const points = Array.from(activePointersRef.current.values());
        initialPinchDistRef.current = Math.hypot(
          points[1].x - points[0].x,
          points[1].y - points[0].y
        );
        initialScaleRef.current = bgImageScale;
      }
    },
    [bgImage, bgImageX, bgImageY, bgImageScale]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!bgImage || !activePointersRef.current.has(e.pointerId)) return;
      e.preventDefault();
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointersRef.current.size === 2) {
        const points = Array.from(activePointersRef.current.values());
        const currentDist = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        if (initialPinchDistRef.current > 0) {
          const scaleFactor = currentDist / initialPinchDistRef.current;
          setBgImageScale(
            Math.max(0.1, Math.min(initialScaleRef.current * scaleFactor, 10))
          );
        }
      } else if (activePointersRef.current.size === 1 && isDragging) {
        const deltaX = e.clientX - dragStartXRef.current;
        const deltaY = e.clientY - dragStartYRef.current;
        setBgImageX(initialImageXRef.current + deltaX / bgImageScale);
        setBgImageY(initialImageYRef.current + deltaY / bgImageScale);
      }
    },
    [bgImage, bgImageScale, isDragging]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    if (activePointersRef.current.size < 2) initialPinchDistRef.current = 0;
    if (activePointersRef.current.size === 0) setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!bgImage) return;
      e.preventDefault();
      const scaleFactor = 1.1;
      if (e.deltaY < 0) {
        setBgImageScale((prev) => Math.min(prev * scaleFactor, 10));
      } else {
        setBgImageScale((prev) => Math.max(prev / scaleFactor, 0.1));
      }
    },
    [bgImage]
  );

  // ── Export ──
  const downloadLink = useCallback((url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const doExport = useCallback(async () => {
    if (!svgRef.current) return;

    const svgEl = svgRef.current;

    // Hide guides, border, and preview-only elements
    const guides = svgEl.querySelectorAll('.ratio-guide');
    guides.forEach((g) => ((g as SVGElement).style.display = 'none'));
    const border = svgEl.querySelector('.canvas-border') as SVGElement | null;
    if (border) border.style.display = 'none';
    const checkerboard = svgEl.querySelector('.checkerboard-bg') as SVGElement | null;
    if (checkerboard) checkerboard.style.display = 'none';
    const colorBg = svgEl.querySelector('.color-bg') as SVGElement | null;
    if (exportConfig.transparentBg && colorBg) colorBg.style.display = 'none';

    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;

    const ratiosToExport =
      exportConfig.exportRatios.length > 0
        ? ratios.filter((r) => exportConfig.exportRatios.includes(r.label))
        : activeRatios;

    for (const ratio of ratiosToExport) {
      const ratioWidth = Math.round(BASE_HEIGHT * (ratio.w / ratio.h));
      const ratioHeight = BASE_HEIGHT;
      const xOffset = (canvasWidth - ratioWidth) / 2;

      const ratioSvgClone = svgClone.cloneNode(true) as SVGSVGElement;
      ratioSvgClone.setAttribute('width', ratioWidth.toString());
      ratioSvgClone.setAttribute('height', ratioHeight.toString());
      ratioSvgClone.setAttribute('viewBox', `${xOffset} 0 ${ratioWidth} ${ratioHeight}`);

      const svgData = new XMLSerializer().serializeToString(ratioSvgClone);
      const ratioFilename =
        activeRatios.length > 1
          ? `${exportConfig.filename}-${ratio.label.replace(':', '-')}`
          : exportConfig.filename;

      if (exportConfig.format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        downloadLink(url, `${ratioFilename}.svg`);
      } else {
        const img = new Image();
        img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });

        const scales = exportConfig.scales.length > 0 ? exportConfig.scales : [1];
        for (const scale of scales) {
          const canvas = document.createElement('canvas');
          canvas.width = ratioWidth * scale;
          canvas.height = ratioHeight * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const suffix = scales.length > 1 ? `@${scale}x` : '';
          downloadLink(canvas.toDataURL('image/png'), `${ratioFilename}${suffix}.png`);
        }
      }
    }

    // 一次导出可能落好几个文件（多比例 × 多倍率），只在整轮结束后报一条
    track('使用工具', {
      工具: '封面生成',
      动作: '导出',
      格式: exportConfig.format,
      比例数: ratiosToExport.length,
    });

    // Restore
    guides.forEach((g) => ((g as SVGElement).style.display = ''));
    if (border) border.style.display = '';
    if (checkerboard) checkerboard.style.display = '';
    if (exportConfig.transparentBg && colorBg) colorBg.style.display = '';
  }, [exportConfig, ratios, activeRatios, canvasWidth, canvasHeight, downloadLink]);

  // ── Desktop sub-columns ──
  const contentColumn = (
    <>
      <TextSettings
        leftText={leftText}
        rightText={rightText}
        fontWeight={fontWeight}
        customFontName={customFontName}
        onLeftTextChange={setLeftText}
        onRightTextChange={setRightText}
        onFontWeightChange={setFontWeight}
        onFontUpload={handleFontUpload}
        onSystemFontSelect={handleSystemFontSelect}
        onRemoveFont={handleRemoveFont}
      />
      <IconSettings
        showIcon={showIcon}
        localIcon={localIcon}
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        iconName={iconName}
        onShowIconChange={setShowIcon}
        onLocalIconUpload={handleLocalIconUpload}
        onSearchInput={onSearchInput}
        onSelectIcon={selectIcon}
      />
      <BackgroundSettings
        bgImage={bgImage}
        bgBlur={bgBlur}
        bgOpacity={bgOpacity}
        isBgDragOver={isBgDragOver}
        onBgImageUpload={handleBgImageUpload}
        onBgBlurChange={setBgBlur}
        onBgOpacityChange={setBgOpacity}
        onBgImageRemove={() => setBgImage(null)}
        onBgDragOver={handleBgDragOver}
        onBgDragLeave={handleBgDragLeave}
        onBgDrop={handleBgDrop}
      />
    </>
  );

  const styleColumn = (
    <>
      <SizeSettings
        fontSize={fontSize}
        iconSize={iconSize}
        iconRadius={iconRadius}
        gap={gap}
        linkScale={linkScale}
        onFontSizeChange={handleFontSizeChange}
        onIconSizeChange={handleIconSizeChange}
        onIconRadiusChange={setIconRadius}
        onGapChange={setGap}
        onLinkScaleChange={setLinkScale}
      />
      <ColorSettings
        color={color}
        iconColor={iconColor}
        bgColor={bgColor}
        bgColorOpacity={bgColorOpacity}
        linkColor={linkColor}
        useOriginalIconColor={useOriginalIconColor}
        onColorChange={handleColorChange}
        onBgColorChange={setBgColor}
        onBgColorOpacityChange={setBgColorOpacity}
        onLinkColorChange={(v) => {
          setLinkColor(v);
          if (!v) setUseOriginalIconColor(false);
        }}
        onUseOriginalIconColorChange={setUseOriginalIconColor}
      />
      <IconBackgroundSettings
        iconBgEnabled={iconBgEnabled}
        iconBgColor={iconBgColor}
        iconBgPadding={iconBgPadding}
        iconBgRadius={iconBgRadius}
        iconBgBlur={iconBgBlur}
        iconBgOpacity={iconBgOpacity}
        onIconBgEnabledChange={setIconBgEnabled}
        onIconBgColorChange={setIconBgColor}
        onIconBgPaddingChange={setIconBgPadding}
        onIconBgRadiusChange={setIconBgRadius}
        onIconBgBlurChange={setIconBgBlur}
        onIconBgOpacityChange={setIconBgOpacity}
      />
      <ShadowSettings
        shadowTarget={shadowTarget}
        textShadow={textShadow}
        iconShadow={iconShadow}
        onShadowTargetChange={setShadowTarget}
        onUpdateShadow={updateShadow}
      />
    </>
  );

  const exportColumn = (
    <ExportSettings
      ratios={ratios}
      exportConfig={exportConfig}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      activeRatios={activeRatios}
      onRatiosChange={setRatios}
      onExportConfigChange={setExportConfig}
      onExport={doExport}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Preview */}
      <div className="flex-1 lg:max-w-[55%]">
        <div className="lg:sticky lg:top-20">
          <CoverPreview
            ref={svgRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            visualRatios={visualRatios}
            bgImage={bgImage}
            bgImageX={bgImageX}
            bgImageY={bgImageY}
            bgImageScale={bgImageScale}
            bgBlur={bgBlur}
            bgOpacity={bgOpacity}
            bgColor={bgColor}
            bgColorOpacity={bgColorOpacity}
            leftText={leftText}
            rightText={rightText}
            fontSize={fontSize}
            fontWeight={fontWeight}
            customFontName={customFontName}
            color={color}
            textShadow={textShadow}
            gap={gap}
            showIcon={showIcon}
            iconSvg={iconSvg}
            localIcon={localIcon}
            iconSize={iconSize}
            iconBgPadding={iconBgPadding}
            iconBgEnabled={iconBgEnabled}
            iconBgColor={iconBgColor}
            iconBgOpacity={iconBgOpacity}
            iconBgBlur={iconBgBlur}
            iconBgRadius={iconBgRadius}
            useOriginalIconColor={useOriginalIconColor}
            iconColor={iconColor}
            iconShadow={iconShadow}
            iconRadius={iconRadius}
            isDragging={isDragging}
            hexToRgba={hexToRgba}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="w-full lg:flex-1">
        {/* Mobile tabs */}
        <div className="lg:hidden">
          <div className="flex border-b mb-6">
            <button
              onClick={() => setMobileTab('content')}
              className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                mobileTab === 'content'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              内容
            </button>
            <button
              onClick={() => setMobileTab('style')}
              className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                mobileTab === 'style'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              样式
            </button>
            <button
              onClick={() => setMobileTab('export')}
              className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                mobileTab === 'export'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              导出
            </button>
          </div>
          {mobileTab === 'content' && <div className="space-y-6">{contentColumn}</div>}
          {mobileTab === 'style' && <div className="space-y-6">{styleColumn}</div>}
          {mobileTab === 'export' && <div className="space-y-6">{exportColumn}</div>}
        </div>

        {/* Desktop 3-column grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">内容</h2>
            {contentColumn}
          </div>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">样式</h2>
            {styleColumn}
          </div>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">导出</h2>
            {exportColumn}
          </div>
        </div>
      </div>
    </div>
  );
}
