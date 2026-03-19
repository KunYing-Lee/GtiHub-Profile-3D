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

const wrapMonospaceText = (
    text: string,
    width: number,
    fontSize: number,
    wrapWidthRatio = 0.62,
): string[] => {
    const maxChars = Math.max(1, Math.floor(width / (fontSize * wrapWidthRatio)));

    const wrapSingleLine = (line: string): string[] => {
        if (line.length <= maxChars) {
            return [line];
        }

        const words = line.split(/\s+/).filter((word) => 0 < word.length);
        const lines: string[] = [];
        let current = '';

        words.forEach((word) => {
            if (current.length === 0) {
                if (word.length <= maxChars) {
                    current = word;
                    return;
                }

                for (let index = 0; index < word.length; index += maxChars) {
                    lines.push(word.slice(index, index + maxChars));
                }
                return;
            }

            const next = `${current} ${word}`;
            if (next.length <= maxChars) {
                current = next;
                return;
            }

            lines.push(current);
            if (word.length <= maxChars) {
                current = word;
                return;
            }

            for (let index = 0; index < word.length; index += maxChars) {
                const chunk = word.slice(index, index + maxChars);
                if (chunk.length === maxChars) {
                    lines.push(chunk);
                } else {
                    current = chunk;
                }
            }
        });

        if (0 < current.length) {
            lines.push(current);
        }

        return lines;
    };

    return text.split('\n').flatMap((line) => wrapSingleLine(line));
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
    const lines = wrapMonospaceText(text, width, fontSize, wrapWidthRatio);
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
        textNode
            .append('tspan')
            .attr('x', util.toFixed(textX))
            .attr('dy', index === 0 ? '0' : `${lineHeight}px`)
            .text(line);
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
