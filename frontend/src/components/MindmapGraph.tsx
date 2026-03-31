/** MindmapGraph - Visual mind map renderer using markmap.
 *
 *  从 Markdown 内容生成真正的图形化思维导图（SVG 树形结构，带连线和节点）
 *  使用 markmap-lib (Transformer) + markmap-view (Markmap) 渲染
 */

import { useEffect, useRef } from 'react';
import { Markmap, globalCSS } from 'markmap-view';
import { Transformer } from 'markmap-lib';

interface MindmapGraphProps {
  /** Markdown content for the mind map */
  content: string;
}

// Dark-theme overrides for markmap SVG nodes
const DARK_THEME_CSS = `
.markmap-node circle { fill: #1e3a5f !important; stroke: #60a5fa !important; stroke-width: 1.5px !important; }
.markmap-node:hover circle { fill: #2563eb !important; stroke: #93c5fd !important; }
.markmap-node text { fill: #f1f5f9 !important; font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-size: 14px !important; }
.markmap-link { stroke: #475569 !important; stroke-width: 1.5px !important; }
`;

// Singleton transformer (expensive to create)
const transformer = new Transformer();

export default function MindmapGraph({ content }: MindmapGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);

  useEffect(() => {
    if (!svgRef.current || !content?.trim()) return;

    // Inject markmap global CSS + dark theme overrides once
    const styleId = 'markmap-mindmap-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = globalCSS + '\n' + DARK_THEME_CSS;
      document.head.appendChild(style);
    }

    // Destroy previous instance
    if (mmRef.current) {
      mmRef.current.destroy();
      mmRef.current = null;
    }

    // Create markmap with dark theme options
    const mm = Markmap.create(svgRef.current, {
      maxWidth: 400,
      nodeMinHeight: 36,
      paddingX: 14,
      initialDepth: 0,
      autoFit: true,
      colorFreezeLevel: 3,
      duration: 500,
    } as any);

    mmRef.current = mm;

    // Parse markdown into tree and render
    try {
      const { root } = transformer.transform(content);
      mm.setData(root);
      mm.fit();
    } catch (e) {
      console.error('Mindmap parse error:', e);
    }

    return () => {
      if (mmRef.current) {
        mmRef.current.destroy();
        mmRef.current = null;
      }
    };
  }, [content]);

  return (
    <div className="w-full overflow-auto rounded-lg" style={{ minHeight: '440px' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          minWidth: '600px',
          height: '600px',
          minHeight: '440px',
        }}
      />
    </div>
  );
}
