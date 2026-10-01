import React, {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Streamdown } from 'streamdown';
import { parseNextStepsAlgorithm } from '../utils/nextStepsAlgorithm.js';

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif';
const DISPLAY = '"Iowan Old Style", Baskerville, Palatino, Georgia, serif';

const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 650 }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
};

const sameNode = (previous, next) => {
  const a = previous.node;
  const b = next.node;
  return a.id === b.id
    && a.parent === b.parent
    && a.branch === b.branch
    && a.kind === b.kind
    && a.title === b.title
    && a.detail === b.detail
    && previous.isDark === next.isDark
    && previous.theme.textPrimary === next.theme.textPrimary
    && previous.theme.textSecondary === next.theme.textSecondary;
};

const ClinicalNode = memo(({ node, theme, isDark, isCompact, registerNode }) => {
  const isDecision = node.kind === 'decision';
  const isTerminal = node.kind === 'terminal';
  const isCaution = node.kind === 'caution';
  const border = isDecision
    ? (isDark ? 'rgba(240,243,246,0.64)' : 'rgba(29,37,43,0.62)')
    : (isDark ? 'rgba(240,243,246,0.31)' : 'rgba(29,37,43,0.34)');

  return (
    <article
      ref={(element) => registerNode(node.id, element)}
      className="astra-clinical-flow-node"
      data-kind={node.kind}
      style={{
        position: 'relative',
        zIndex: 2,
        alignSelf: 'center',
        minWidth: 0,
        minHeight: isCompact ? 0 : 108,
        padding: isCompact ? '13px 15px 14px' : '14px 16px 15px',
        color: theme.textPrimary,
        background: isDark
          ? (isTerminal ? '#1B211F' : isCaution ? '#211E1A' : '#191C20')
          : (isTerminal ? '#F8FBF9' : isCaution ? '#FCFAF6' : '#FFFFFF'),
        border: `1px solid ${border}`,
        borderRadius: 2,
        boxShadow: 'none',
        textAlign: 'center',
      }}
    >
      {isCompact && node.branch && (
        <div style={{
          marginBottom: 5,
          color: theme.textSecondary,
          fontFamily: SANS,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {node.branch}
        </div>
      )}

      <div style={{
        fontFamily: SANS,
        fontSize: isCompact ? 14.5 : 15,
        fontWeight: isDecision || isCaution ? 660 : 610,
        letterSpacing: '-0.012em',
        lineHeight: 1.3,
      }}>
        {node.title}
      </div>

      {node.detail && (
        <div className="astra-node-streamdown" style={{
          marginTop: 7,
          color: theme.textSecondary,
          fontFamily: SANS,
          fontSize: isCompact ? 12.25 : 12,
          lineHeight: 1.48,
          letterSpacing: '-0.001em',
        }}>
          <Streamdown mode="static" isAnimating={false} components={MARKDOWN_COMPONENTS}>
            {node.detail}
          </Streamdown>
        </div>
      )}
    </article>
  );
}, sameNode);

ClinicalNode.displayName = 'ClinicalNode';

const connectionGeometryMatches = (first, second) => (
  first.length === second.length
  && first.every((edge, index) => {
    const other = second[index];
    return edge.id === other?.id
      && Math.abs(edge.startX - other.startX) < 0.5
      && Math.abs(edge.startY - other.startY) < 0.5
      && Math.abs(edge.endX - other.endX) < 0.5
      && Math.abs(edge.endY - other.endY) < 0.5;
  })
);

const NextStepsAlgorithm = ({ content, theme, isDark, isStreaming, isMobile, isCompact = false }) => {
  const parsed = useMemo(() => parseNextStepsAlgorithm(content), [content]);
  const useCompactLayout = isMobile || isCompact;
  const canvasRef = useRef(null);
  const nodeElementsRef = useRef(new Map());
  const [connections, setConnections] = useState([]);

  const layout = useMemo(() => {
    if (useCompactLayout) {
      return new Map(parsed.nodes.map((node, index) => [node.id, {
        row: index + 1,
        column: 1,
      }]));
    }

    const byRow = new Map();
    parsed.nodes.forEach((node) => {
      const row = byRow.get(node.row) || [];
      row.push(node);
      byRow.set(node.row, row);
    });

    const positions = new Map();
    byRow.forEach((nodes, row) => {
      nodes.sort((a, b) => a.column - b.column || a.id.localeCompare(b.id));
      if (nodes.length === 1) {
        positions.set(nodes[0].id, {
          row: row + 1,
          column: Math.max(1, Math.min(3, nodes[0].column + 2)),
        });
        return;
      }

      const columns = nodes.length === 2 ? [1, 3] : [1, 2, 3];
      nodes.slice(0, 3).forEach((node, index) => positions.set(node.id, {
        row: row + 1,
        column: columns[index],
      }));
    });
    return positions;
  }, [parsed.nodes, useCompactLayout]);

  const registerNode = (id, element) => {
    if (element) nodeElementsRef.current.set(id, element);
    else nodeElementsRef.current.delete(id);
  };

  useLayoutEffect(() => {
    if (useCompactLayout || !canvasRef.current || parsed.nodes.length === 0) {
      setConnections([]);
      return undefined;
    }

    const measure = () => {
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      if (!canvasBounds) return;

      const nextConnections = parsed.nodes.flatMap((node) => {
        if (!node.parent) return [];
        const source = nodeElementsRef.current.get(node.parent);
        const target = nodeElementsRef.current.get(node.id);
        if (!source || !target) return [];

        const sourceBounds = source.getBoundingClientRect();
        const targetBounds = target.getBoundingClientRect();
        return [{
          id: `${node.parent}-${node.id}`,
          branch: node.branch,
          startX: sourceBounds.left - canvasBounds.left + (sourceBounds.width / 2),
          startY: sourceBounds.bottom - canvasBounds.top,
          endX: targetBounds.left - canvasBounds.left + (targetBounds.width / 2),
          endY: targetBounds.top - canvasBounds.top,
        }];
      });

      setConnections((current) => (
        connectionGeometryMatches(current, nextConnections) ? current : nextConnections
      ));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvasRef.current);
    nodeElementsRef.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [parsed.nodes, layout, useCompactLayout]);

  const reservedRows = useCompactLayout
    ? Math.max(1, parsed.nodes.length)
    : Math.max(1, (parsed.meta.maxRow ?? 0) + 1, ...parsed.nodes.map((node) => node.row + 1));

  return (
    <div className="astra-next-steps-algorithm" style={{ color: theme.textPrimary }}>
      <header style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 18,
        marginBottom: 16,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: theme.textSecondary,
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Clinical pathway
          </div>
          <h2 style={{
            margin: '4px 0 0',
            color: theme.textPrimary,
            fontFamily: DISPLAY,
            fontSize: useCompactLayout ? 21 : 23,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.18,
          }}>
            {parsed.meta.title || 'Building the next-step algorithm'}
          </h2>
          {parsed.meta.summary && (
            <p style={{
              margin: '6px 0 0',
              maxWidth: 760,
              color: theme.textSecondary,
              fontFamily: SANS,
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {parsed.meta.summary}
            </p>
          )}
        </div>

        <div style={{
          flexShrink: 0,
          paddingTop: 2,
          color: theme.textSecondary,
          fontFamily: SANS,
          fontSize: 10.5,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {isStreaming ? 'Building pathway…' : `${parsed.nodes.length} steps`}
        </div>
      </header>

      {parsed.nodes.length > 0 ? (
        <div
          ref={canvasRef}
          className="astra-clinical-flow-canvas"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: useCompactLayout ? 'minmax(0, 560px)' : 'repeat(3, minmax(0, 1fr))',
            gridTemplateRows: `repeat(${reservedRows}, minmax(${useCompactLayout ? 0 : 108}px, auto))`,
            justifyContent: useCompactLayout ? 'center' : 'stretch',
            columnGap: useCompactLayout ? 0 : 34,
            rowGap: useCompactLayout ? 18 : 58,
            padding: useCompactLayout ? 16 : 24,
            overflow: 'hidden',
            border: `1px solid ${isDark ? 'rgba(240,243,246,0.14)' : 'rgba(29,37,43,0.16)'}`,
            borderRadius: 3,
            background: isDark ? '#14171A' : '#FBFBFA',
          }}
        >
          {!useCompactLayout && (
            <svg
              aria-hidden="true"
              width="100%"
              height="100%"
              viewBox={`0 0 ${canvasRef.current?.clientWidth || 1} ${canvasRef.current?.clientHeight || 1}`}
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'visible' }}
            >
              <defs>
                <marker
                  id="astra-clinical-arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L7,3.5 L0,7 Z" fill={isDark ? '#8F989F' : '#454D52'} />
                </marker>
              </defs>
              {connections.map((edge) => {
                const middleY = edge.startY + ((edge.endY - edge.startY) / 2);
                const labelX = edge.startX === edge.endX
                  ? edge.startX + 7
                  : edge.startX + ((edge.endX - edge.startX) / 2);
                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${edge.startX} ${edge.startY} V ${middleY} H ${edge.endX} V ${edge.endY - 7}`}
                      fill="none"
                      stroke={isDark ? '#8F989F' : '#454D52'}
                      strokeWidth="1.15"
                      vectorEffect="non-scaling-stroke"
                      markerEnd="url(#astra-clinical-arrow)"
                    />
                    {edge.branch && (
                      <text
                        x={labelX}
                        y={middleY - 6}
                        textAnchor={edge.startX === edge.endX ? 'start' : 'middle'}
                        fill={theme.textSecondary}
                        stroke={isDark ? '#14171A' : '#FBFBFA'}
                        strokeWidth="5"
                        paintOrder="stroke"
                        style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 600 }}
                      >
                        {edge.branch}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {parsed.nodes.map((node) => {
            const position = layout.get(node.id) || { row: node.row + 1, column: 2 };
            return (
              <div
                key={node.id}
                style={{
                  gridRow: position.row,
                  gridColumn: useCompactLayout ? 1 : position.column,
                  minWidth: 0,
                  alignSelf: 'center',
                }}
              >
                <ClinicalNode
                  node={node}
                  theme={theme}
                  isDark={isDark}
                  isCompact={useCompactLayout}
                  registerNode={registerNode}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="astra-algorithm-skeleton" style={{
          minHeight: 220,
          display: 'grid',
          placeItems: 'center',
          border: `1px solid ${isDark ? 'rgba(240,243,246,0.14)' : 'rgba(29,37,43,0.16)'}`,
          borderRadius: 3,
          color: theme.textSecondary,
          background: isDark ? '#14171A' : '#FBFBFA',
          fontFamily: SANS,
          fontSize: 12,
        }}>
          {isStreaming ? 'Structuring decision points…' : 'No pathway was returned.'}
        </div>
      )}
    </div>
  );
};

export default NextStepsAlgorithm;
