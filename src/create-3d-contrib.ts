import * as d3 from 'd3';
import * as snake from './create-snake-animation';
import * as util from './utils';
import * as type from './type';

const ANGLE = 30;
const DARKER_RIGHT = 1;
const DARKER_LEFT = 0.5;
const DARKER_TOP = 0;
const BASE_TILE_HEIGHT = 3;

const toEpochDays = (date: Date): number =>
    Math.floor(date.getTime() / (24 * 60 * 60 * 1000));

type PanelType = 'top' | 'left' | 'right';
type SvgGroupSelection = d3.Selection<SVGGElement, unknown, null, unknown>;
type SvgRectSelection = d3.Selection<SVGRectElement, unknown, null, unknown>;

interface RenderedBar {
    bar: SvgGroupSelection;
    leftPanel: SvgRectSelection;
    rightPanel: SvgRectSelection;
    heightLeft: number;
    heightRight: number;
    scaleLeft: number;
    scaleRight: number;
}

const addNormalColor = (
    path: SvgRectSelection,
    contribLevel: number,
    panel: PanelType,
): void => {
    path.attr('class', `cont-${panel}-${contribLevel}`);
};

const decideSeasonPatternNo = (date: Date): number => {
    const sunday = new Date(date.getTime());
    sunday.setDate(sunday.getDate() - sunday.getDay());

    const month = sunday.getUTCMonth();
    const dayOfMonth = sunday.getUTCDate();

    const diff =
        dayOfMonth <= 7
            ? 0
            : dayOfMonth <= 14
              ? 1
              : dayOfMonth <= 21
                ? 2
                : dayOfMonth <= 28
                  ? 3
                  : 4;

    switch (month + 1) {
        case 9:
            return 0 + diff;
        case 10:
        case 11:
            return 4;
        case 12:
            return 5 + diff;
        case 1:
        case 2:
            return 9;
        case 3:
            return 10 + diff;
        case 4:
        case 5:
            return 14;
        case 6:
            return 15 + diff;
        case 7:
        case 8:
        default:
            return 19;
    }
};

const addSeasonColor = (
    path: SvgRectSelection,
    contribLevel: number,
    panel: PanelType,
    date: Date,
): void => {
    const pattern = decideSeasonPatternNo(date);
    path.attr('class', `cont-${panel}-p${pattern}-${contribLevel}`);
};

const addRainbowColor = (
    path: SvgRectSelection,
    contribLevel: number,
    settings: type.RainbowColorSettings,
    darker: number,
    week: number,
): void => {
    const offsetHue = week * settings.hueRatio;
    const saturation = settings.saturation;
    const lightness = settings.contribLightness[contribLevel];
    const values = [...Array<undefined>(7)]
        .map((_, i) => (i * 60 + offsetHue) % 360)
        .map((hue) => `hsl(${hue},${saturation},${lightness})`)
        .map((color) => d3.rgb(color).darker(darker).toString())
        .join(';');

    path.append('animate')
        .attr('attributeName', 'fill')
        .attr('values', values)
        .attr('dur', settings.duration)
        .attr('repeatCount', 'indefinite');
};

const addBitmapPattern = (
    path: SvgRectSelection,
    contributionLevel: number,
    panel: PanelType,
): void => {
    path.attr('fill', `url(#pattern_${contributionLevel}_${panel})`);
};

const atan = (value: number): number => (Math.atan(value) * 360) / 2 / Math.PI;

const applyPanelColor = (
    path: SvgRectSelection,
    geometry: snake.ContributionGeometry,
    settings: type.FullSettings,
    contribLevel: number,
    panel: PanelType,
): void => {
    if (settings.type === 'normal') {
        addNormalColor(path, contribLevel, panel);
    } else if (settings.type === 'season') {
        addSeasonColor(path, contribLevel, panel, geometry.date);
    } else if (settings.type === 'rainbow') {
        const darker =
            panel === 'left'
                ? DARKER_LEFT
                : panel === 'right'
                  ? DARKER_RIGHT
                  : DARKER_TOP;
        addRainbowColor(path, contribLevel, settings, darker, geometry.week);
    } else if (settings.type === 'bitmap') {
        addBitmapPattern(path, contribLevel, panel);
    }
};

const renderBar = (
    group: SvgGroupSelection,
    geometry: snake.ContributionGeometry,
    settings: type.FullSettings,
    contribLevel: number,
    height: number,
    className?: string,
): RenderedBar => {
    const dxx = (geometry.groundX - geometry.baseX) * 2;
    const dyy = geometry.groundY - (geometry.baseY - BASE_TILE_HEIGHT);
    const translateY = geometry.baseY - height;
    const bar = group
        .append('g')
        .attr(
            'transform',
            `translate(${util.toFixed(geometry.baseX)} ${util.toFixed(
                translateY,
            )})`,
        );
    if (className) {
        bar.attr('class', className);
    }

    const widthTop =
        settings.type === 'bitmap'
            ? Math.max(1, settings.contribPatterns[contribLevel].top.width)
            : dxx;
    const topPanel = bar
        .append('rect')
        .attr('stroke', 'none')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', util.toFixed(widthTop))
        .attr('height', util.toFixed(widthTop))
        .attr(
            'transform',
            `skewY(${-ANGLE}) skewX(${util.toFixed(
                atan(dxx / 2 / dyy),
            )}) scale(${util.toFixed(
                dxx / widthTop,
            )} ${util.toFixed((2 * dyy) / widthTop)})`,
        );
    applyPanelColor(topPanel, geometry, settings, contribLevel, 'top');

    const widthLeft =
        settings.type === 'bitmap'
            ? Math.max(1, settings.contribPatterns[contribLevel].left.width)
            : dxx;
    const scaleLeft = Math.sqrt(dxx ** 2 + dyy ** 2) / widthLeft;
    const heightLeft = height / scaleLeft;
    const leftPanel = bar
        .append('rect')
        .attr('stroke', 'none')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', util.toFixed(widthLeft))
        .attr('height', util.toFixed(heightLeft))
        .attr(
            'transform',
            `skewY(${ANGLE}) scale(${util.toFixed(
                dxx / widthLeft,
            )} ${util.toFixed(scaleLeft)})`,
        );
    applyPanelColor(leftPanel, geometry, settings, contribLevel, 'left');

    const widthRight =
        settings.type === 'bitmap'
            ? Math.max(1, settings.contribPatterns[contribLevel].right.width)
            : dxx;
    const scaleRight = Math.sqrt(dxx ** 2 + dyy ** 2) / widthRight;
    const heightRight = height / scaleRight;
    const rightPanel = bar
        .append('rect')
        .attr('stroke', 'none')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', util.toFixed(widthRight))
        .attr('height', util.toFixed(heightRight))
        .attr(
            'transform',
            `translate(${util.toFixed(dxx)} ${util.toFixed(
                dyy,
            )}) skewY(${-ANGLE}) scale(${util.toFixed(
                dxx / widthRight,
            )} ${util.toFixed(scaleRight)})`,
        );
    applyPanelColor(rightPanel, geometry, settings, contribLevel, 'right');

    return {
        bar,
        leftPanel,
        rightPanel,
        heightLeft,
        heightRight,
        scaleLeft,
        scaleRight,
    };
};

const addGrowingAnimation = (
    renderedBar: RenderedBar,
    geometry: snake.ContributionGeometry,
): void => {
    renderedBar.bar
        .append('animateTransform')
        .attr('attributeName', 'transform')
        .attr('type', 'translate')
        .attr(
            'values',
            `${util.toFixed(geometry.baseX)} ${util.toFixed(
                geometry.baseY - BASE_TILE_HEIGHT,
            )};${util.toFixed(geometry.baseX)} ${util.toFixed(
                geometry.baseY - geometry.calHeight,
            )}`,
        )
        .attr('dur', '3s')
        .attr('repeatCount', '1');

    renderedBar.leftPanel
        .append('animate')
        .attr('attributeName', 'height')
        .attr(
            'values',
            `${util.toFixed(BASE_TILE_HEIGHT / renderedBar.scaleLeft)};${util.toFixed(
                renderedBar.heightLeft,
            )}`,
        )
        .attr('dur', '3s')
        .attr('repeatCount', '1');

    renderedBar.rightPanel
        .append('animate')
        .attr('attributeName', 'height')
        .attr(
            'values',
            `${util.toFixed(
                BASE_TILE_HEIGHT / renderedBar.scaleRight,
            )};${util.toFixed(renderedBar.heightRight)}`,
        )
        .attr('dur', '3s')
        .attr('repeatCount', '1');
};

const createGeometries = (
    userInfo: type.UserInfo,
    width: number,
    height: number,
): { cells: snake.ContributionGeometry[]; dxx: number; dyy: number } => {
    const firstDate = userInfo.contributionCalendar[0].date;
    const sundayOfFirstWeek = toEpochDays(firstDate) - firstDate.getUTCDay();
    const weekcount = Math.ceil(
        (userInfo.contributionCalendar.length + firstDate.getUTCDay()) / 7.0,
    );
    const dx = width / 64;
    const dy = dx * Math.tan(ANGLE * ((2 * Math.PI) / 360));
    const dxx = dx * 0.9;
    const dyy = dy * 0.9;
    const offsetX = dx * 7;
    const offsetY = height - (weekcount + 7) * dy;

    const cells = userInfo.contributionCalendar.map((cal) => {
        const week = Math.floor(
            (toEpochDays(cal.date) - sundayOfFirstWeek) / 7,
        );
        const dayOfWeek = cal.date.getUTCDay();
        const baseX = offsetX + (week - dayOfWeek) * dx;
        const baseY = offsetY + (week + dayOfWeek) * dy;
        const calHeight = Math.log10(cal.contributionCount / 20 + 1) * 144 + 3;

        return {
            contributionCount: cal.contributionCount,
            contributionLevel: cal.contributionLevel,
            date: cal.date,
            week,
            dayOfWeek,
            baseX,
            baseY,
            groundX: baseX + dxx / 2,
            groundY: baseY - BASE_TILE_HEIGHT + dyy,
            calHeight,
        };
    });

    return { cells, dxx, dyy };
};

export const addDefines = (
    svg: d3.Selection<SVGSVGElement, unknown, null, unknown>,
    settings: type.Settings,
): void => {
    if (settings.type === 'bitmap') {
        const defs = svg.append('defs');
        for (const [contribLevel, info] of settings.contribPatterns.entries()) {
            const addPattern = (
                panelPattern: type.PanelPattern,
                panel: PanelType,
            ): void => {
                const width = Math.max(1, panelPattern.width);
                const height = Math.max(1, panelPattern.bitmap.length);
                const pattern = defs
                    .append('pattern')
                    .attr('id', `pattern_${contribLevel}_${panel}`)
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', width)
                    .attr('height', height)
                    .attr('patternUnits', 'userSpaceOnUse');
                pattern
                    .append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', width)
                    .attr('height', height)
                    .attr('class', `cont-${panel}-bg-${contribLevel}`);
                const path = d3.path();
                for (const [y, bitmapValue] of panelPattern.bitmap.entries()) {
                    const bitmap =
                        typeof bitmapValue === 'string'
                            ? parseInt(bitmapValue, 16)
                            : bitmapValue;
                    for (let x = 0; x < width; x++) {
                        if ((bitmap & (1 << (width - x - 1))) !== 0) {
                            path.rect(x, y, 1, 1);
                        }
                    }
                }
                pattern
                    .append('path')
                    .attr('stroke', 'none')
                    .attr('class', `cont-${panel}-fg-${contribLevel}`)
                    .attr('d', path.toString());
            };

            addPattern(info.top, 'top');
            addPattern(info.left, 'left');
            addPattern(info.right, 'right');
        }
    }
};

export const create3DContrib = (
    svg: d3.Selection<SVGSVGElement, unknown, null, unknown>,
    userInfo: type.UserInfo,
    x: number,
    y: number,
    width: number,
    height: number,
    settings: type.FullSettings,
    isForcedAnimation = false,
): void => {
    if (userInfo.contributionCalendar.length === 0) {
        return;
    }

    const { cells, dxx, dyy } = createGeometries(userInfo, width, height);
    const groundGroup = svg
        .append('g')
        .attr('class', 'contrib-ground')
        .attr('transform', `translate(${x}, ${y})`);
    const snakeGroup = svg
        .append('g')
        .attr('transform', `translate(${x}, ${y})`);
    const barGroup = svg
        .append('g')
        .attr('class', 'contrib-bars')
        .attr('transform', `translate(${x}, ${y})`);

    cells.forEach((geometry) => {
        renderBar(
            groundGroup,
            geometry,
            settings,
            0,
            BASE_TILE_HEIGHT,
            'contrib-floor',
        );
    });

    const hasGrowingAnimation = settings.growingAnimation || isForcedAnimation;
    const renderedBars: snake.AnimatedContributionBar[] = [];

    cells
        .filter((geometry) => 0 < geometry.contributionCount)
        .forEach((geometry) => {
            const renderedBar = renderBar(
                barGroup,
                geometry,
                settings,
                geometry.contributionLevel,
                geometry.calHeight,
                'contrib-bar',
            );

            if (hasGrowingAnimation) {
                addGrowingAnimation(renderedBar, geometry);
            }

            renderedBars.push({
                geometry,
                bar: renderedBar.bar,
                leftPanel: renderedBar.leftPanel,
                rightPanel: renderedBar.rightPanel,
                heightLeft: renderedBar.heightLeft,
                heightRight: renderedBar.heightRight,
                scaleLeft: renderedBar.scaleLeft,
                scaleRight: renderedBar.scaleRight,
            });
        });

    snake.addSnakeAnimation(
        snakeGroup,
        cells,
        renderedBars,
        settings,
        hasGrowingAnimation,
        dxx,
        dyy,
    );
};
