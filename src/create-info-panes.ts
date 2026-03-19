import * as d3 from 'd3';
import * as type from './type';
import * as util from './utils';

const PANE_RADIUS = 4;
const BAR_HEIGHT = 34;
const PADDING_X = 24;
const PADDING_Y = 22;
const CONTENT_GAP = 18;
const MONO_FONT_FAMILY =
    '"SFMono-Regular", "Cascadia Mono", "IBM Plex Mono", "Liberation Mono", Menlo, Consolas, monospace';

interface InlineTextSegment {
    text: string;
    weight: number | string;
}

const getBoldWeight = (weight: number | string): number | string => {
    if (typeof weight === 'number') {
        return Math.min(weight + 300, 900);
    }

    return '700';
};

const parseInlineSegments = (
    text: string,
    baseWeight: number | string,
): InlineTextSegment[] => {
    const segments: InlineTextSegment[] = [];
    const matcher = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(text)) !== null) {
        if (lastIndex < match.index) {
            segments.push({
                text: text.slice(lastIndex, match.index),
                weight: baseWeight,
            });
        }

        segments.push({
            text: match[1],
            weight: getBoldWeight(baseWeight),
        });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        segments.push({
            text: text.slice(lastIndex),
            weight: baseWeight,
        });
    }

    return segments.filter((segment) => 0 < segment.text.length);
};

const mergeSegments = (
    segments: InlineTextSegment[],
): InlineTextSegment[] =>
    segments.reduce((merged: InlineTextSegment[], segment) => {
        const last = merged[merged.length - 1];
        if (last && last.weight === segment.weight) {
            last.text += segment.text;
            return merged;
        }

        merged.push({ ...segment });
        return merged;
    }, []);

const trimTrailingWhitespace = (
    segments: InlineTextSegment[],
): InlineTextSegment[] => {
    const trimmed = segments.map((segment) => ({ ...segment }));

    while (0 < trimmed.length) {
        const last = trimmed[trimmed.length - 1];
        const nextText = last.text.replace(/\s+$/, '');
        if (0 < nextText.length) {
            last.text = nextText;
            break;
        }
        trimmed.pop();
    }

    return trimmed;
};

const wrapInlineSegments = (
    segments: InlineTextSegment[],
    maxChars: number,
): InlineTextSegment[][] => {
    const lines: InlineTextSegment[][] = [];
    let currentLine: InlineTextSegment[] = [];
    let currentLength = 0;

    const pushToken = (token: InlineTextSegment): void => {
        currentLine.push(token);
        currentLength += token.text.length;
    };

    const flushLine = (): void => {
        const trimmed = trimTrailingWhitespace(currentLine);
        if (0 < trimmed.length) {
            lines.push(mergeSegments(trimmed));
        }
        currentLine = [];
        currentLength = 0;
    };

    segments
        .flatMap((segment) =>
            (segment.text.match(/\s+|\S+/g) ?? []).map((tokenText) => ({
                text: tokenText,
                weight: segment.weight,
            })),
        )
        .forEach((token) => {
            const isWhitespace = /^\s+$/.test(token.text);
            if (isWhitespace) {
                if (
                    0 < currentLength &&
                    currentLength + token.text.length <= maxChars
                ) {
                    pushToken(token);
                }
                return;
            }

            let remainder = token.text;
            while (0 < remainder.length) {
                if (currentLength === 0 && maxChars < remainder.length) {
                    pushToken({
                        text: remainder.slice(0, maxChars),
                        weight: token.weight,
                    });
                    remainder = remainder.slice(maxChars);
                    flushLine();
                    continue;
                }

                if (currentLength + remainder.length <= maxChars) {
                    pushToken({
                        text: remainder,
                        weight: token.weight,
                    });
                    remainder = '';
                    continue;
                }

                if (0 < currentLength) {
                    flushLine();
                    continue;
                }

                pushToken({
                    text: remainder.slice(0, maxChars),
                    weight: token.weight,
                });
                remainder = remainder.slice(maxChars);
                flushLine();
            }
        });

    flushLine();

    return 0 < lines.length ? lines : [[{ text: '', weight: segments[0]?.weight ?? '500' }]];
};

const wrapMonospaceText = (
    text: string,
    width: number,
    fontSize: number,
    weight: number | string,
    wrapWidthRatio = 0.62,
): InlineTextSegment[][] => {
    const maxChars = Math.max(1, Math.floor(width / (fontSize * wrapWidthRatio)));

    return text.split('\n').flatMap((line) => {
        const segments = parseInlineSegments(line, weight);
        return wrapInlineSegments(segments, maxChars);
    });
};

const addTextLines = (
    group: d3.Selection<SVGGElement, unknown, null, unknown>,
    x: number,
    y: number,
    fontSize: number,
    lineHeight: number,
    text: string,
    width: number,
    weight: number | string,
    color: string,
    align: 'left' | 'center' = 'left',
    wrapWidthRatio = 0.62,
): number => {
    const lines = wrapMonospaceText(
        text,
        width,
        fontSize,
        weight,
        wrapWidthRatio,
    );
    const textX = align === 'center' ? x + width / 2 : x;
    const textNode = group
        .append('text')
        .attr('x', util.toFixed(textX))
        .attr('y', util.toFixed(y))
        .attr('fill', color)
        .attr('text-anchor', align === 'center' ? 'middle' : 'start')
        .style('font-family', MONO_FONT_FAMILY)
        .style('font-size', `${fontSize}px`)
        .style('font-weight', `${weight}`);

    lines.forEach((line, index) => {
        const lineNode = textNode
            .append('tspan')
            .attr('x', util.toFixed(textX))
            .attr('dy', index === 0 ? '0' : `${lineHeight}px`);

        line.forEach((segment) => {
            lineNode
                .append('tspan')
                .style('font-weight', `${segment.weight}`)
                .text(segment.text);
        });
    });

    return y + Math.max(lines.length, 1) * lineHeight;
};

const renderPane = (
    svg: d3.Selection<SVGSVGElement, unknown, null, unknown>,
    pane: type.InfoPaneSettings,
): void => {
    const group = svg
        .append('g')
        .attr(
            'transform',
            `translate(${util.toFixed(pane.x)} ${util.toFixed(pane.y)})`,
        );

    group
        .append('rect')
        .attr('x', 10)
        .attr('y', 12)
        .attr('width', util.toFixed(pane.width))
        .attr('height', util.toFixed(pane.height))
        .attr('rx', PANE_RADIUS)
        .attr('ry', PANE_RADIUS)
        .attr('fill', '#000000')
        .attr('opacity', 0.06);

    group
        .append('rect')
        .attr('width', util.toFixed(pane.width))
        .attr('height', util.toFixed(pane.height))
        .attr('rx', PANE_RADIUS)
        .attr('ry', PANE_RADIUS)
        .attr('fill', '#fbfbfc')
        .attr('stroke', '#cfd4dc')
        .attr('stroke-width', 1.2);

    group
        .append('rect')
        .attr('width', util.toFixed(pane.width))
        .attr('height', BAR_HEIGHT)
        .attr('rx', PANE_RADIUS)
        .attr('ry', PANE_RADIUS)
        .attr('fill', '#e6e9ee');

    group
        .append('rect')
        .attr('y', BAR_HEIGHT - PANE_RADIUS)
        .attr('width', util.toFixed(pane.width))
        .attr('height', PANE_RADIUS)
        .attr('fill', '#e6e9ee');

    group
        .append('line')
        .attr('x1', 0)
        .attr('y1', BAR_HEIGHT)
        .attr('x2', util.toFixed(pane.width))
        .attr('y2', BAR_HEIGHT)
        .attr('stroke', '#cfd4dc')
        .attr('stroke-width', 1);

    const paddingX = pane.paddingX ?? PADDING_X;
    const paddingY = pane.paddingY ?? PADDING_Y;
    const textWidth = pane.width - paddingX * 2;

    group
        .append('text')
        .attr('x', util.toFixed(paddingX))
        .attr('y', util.toFixed(23))
        .attr('fill', '#5e6673')
        .style('font-family', MONO_FONT_FAMILY)
        .style('font-size', `${pane.titleFontSize ?? 15}px`)
        .style('font-weight', '700')
        .style('letter-spacing', '0.08em')
        .text(pane.title);

    let cursorY = BAR_HEIGHT + paddingY;

    if (pane.header) {
        cursorY = addTextLines(
            group,
            paddingX,
            cursorY,
            pane.headerFontSize ?? 32,
            pane.headerLineHeight ?? 38,
            pane.header,
            textWidth,
            800,
            '#16181d',
            pane.headerAlign ?? 'left',
        );
        cursorY += pane.headerGap ?? 12;
    }

    if (pane.subtitle) {
        cursorY = addTextLines(
            group,
            paddingX,
            cursorY,
            pane.subtitleFontSize ?? 18,
            pane.subtitleLineHeight ?? 24,
            pane.subtitle,
            textWidth,
            500,
            '#596273',
            pane.subtitleAlign ?? 'left',
        );
        cursorY += pane.subtitleGap ?? CONTENT_GAP;
    }

    addTextLines(
        group,
        paddingX,
        cursorY,
        pane.bodyFontSize ?? 18,
        pane.bodyLineHeight ?? 30,
        pane.body,
        textWidth,
        500,
        '#232831',
        pane.bodyAlign ?? 'left',
        pane.bodyWrapWidthRatio,
    );
};

export const createInfoPanes = (
    svg: d3.Selection<SVGSVGElement, unknown, null, unknown>,
    panes: type.InfoPaneSettings[] | undefined,
): void => {
    panes?.forEach((pane) => {
        renderPane(svg, pane);
    });
};
