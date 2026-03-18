import * as d3 from 'd3';
import {
    buildSnakeRoute,
    normalizeSnakeAnimationSettings,
} from './snake-animation-utils';
import type { NormalizedSnakeAnimationSettings } from './snake-animation-utils';
import * as util from './utils';
import * as type from './type';

const BASE_TILE_HEIGHT = 3;

type SvgGroupSelection = d3.Selection<SVGGElement, unknown, null, unknown>;
type SvgRectSelection = d3.Selection<SVGRectElement, unknown, null, unknown>;

export interface ContributionGeometry {
    contributionCount: number;
    contributionLevel: number;
    date: Date;
    week: number;
    dayOfWeek: number;
    baseX: number;
    baseY: number;
    groundX: number;
    groundY: number;
    calHeight: number;
}

export interface AnimatedContributionBar {
    geometry: ContributionGeometry;
    bar: SvgGroupSelection;
    leftPanel: SvgRectSelection;
    rightPanel: SvgRectSelection;
    heightLeft: number;
    heightRight: number;
    scaleLeft: number;
    scaleRight: number;
}

const toKey = (week: number, dayOfWeek: number): string =>
    `${week}:${dayOfWeek}`;

const formatRatio = (value: number): string => {
    if (value <= 0) {
        return '0';
    }
    if (1 <= value) {
        return '1';
    }
    return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
};

const buildKeyTimes = (routeLength: number): string =>
    [...Array(routeLength + 1).keys()]
        .map((index) => formatRatio(index / routeLength))
        .join(';');

const buildCoordinateValues = (
    route: ContributionGeometry[],
    segmentOffset: number,
    attribute: 'groundX' | 'groundY',
    delta = 0,
): string => {
    const total = route.length;
    return [...Array(total + 1).keys()]
        .map(
            (index) =>
                route[(index - segmentOffset + total) % total][attribute],
        )
        .map((value) => util.toFixed(value + delta))
        .join(';');
};

const animateAttribute = (
    element:
        | SvgGroupSelection
        | d3.Selection<SVGCircleElement, unknown, null, unknown>
        | d3.Selection<SVGEllipseElement, unknown, null, unknown>,
    attributeName: string,
    values: string,
    keyTimes: string,
    settings: NormalizedSnakeAnimationSettings,
): void => {
    element
        .append('animate')
        .attr('attributeName', attributeName)
        .attr('values', values)
        .attr('keyTimes', keyTimes)
        .attr('dur', settings.duration)
        .attr('begin', settings.begin)
        .attr('repeatCount', settings.repeatCount)
        .attr('fill', 'freeze');
};

const addSnakeSegment = (
    group: SvgGroupSelection,
    route: ContributionGeometry[],
    keyTimes: string,
    settings: NormalizedSnakeAnimationSettings,
    segmentIndex: number,
    tileWidth: number,
    tileHeight: number,
): void => {
    const isHead = segmentIndex === 0;
    const offset = segmentIndex * settings.segmentGap;
    const size = isHead ? 1.15 : Math.max(0.45, 0.95 - segmentIndex * 0.06);
    const rx = util.toFixed(tileWidth * settings.segmentScale * size);
    const ry = util.toFixed(tileHeight * settings.segmentScale * size * 1.2);

    const shadow = group
        .append('ellipse')
        .attr('class', 'snake-shadow')
        .attr('cx', util.toFixed(route[0].groundX + tileWidth * 0.18))
        .attr('cy', util.toFixed(route[0].groundY + tileHeight * 0.45))
        .attr('rx', util.toFixed(rx * 1.1))
        .attr('ry', util.toFixed(ry * 0.85))
        .attr('opacity', 0.65);

    animateAttribute(
        shadow,
        'cx',
        buildCoordinateValues(route, offset, 'groundX', tileWidth * 0.18),
        keyTimes,
        settings,
    );
    animateAttribute(
        shadow,
        'cy',
        buildCoordinateValues(route, offset, 'groundY', tileHeight * 0.45),
        keyTimes,
        settings,
    );

    const segment = group
        .append('ellipse')
        .attr('class', isHead ? 'snake-head' : 'snake-body')
        .attr('cx', util.toFixed(route[0].groundX))
        .attr('cy', util.toFixed(route[0].groundY))
        .attr('rx', rx)
        .attr('ry', ry);

    animateAttribute(
        segment,
        'cx',
        buildCoordinateValues(route, offset, 'groundX'),
        keyTimes,
        settings,
    );
    animateAttribute(
        segment,
        'cy',
        buildCoordinateValues(route, offset, 'groundY'),
        keyTimes,
        settings,
    );

    if (!isHead) {
        return;
    }

    const eyeOffsetX = rx * 0.35;
    const eyeOffsetY = ry * 0.35;

    [-1, 1].forEach((direction) => {
        const eye = group
            .append('circle')
            .attr('class', 'snake-eye')
            .attr('cx', util.toFixed(route[0].groundX + eyeOffsetX * direction))
            .attr('cy', util.toFixed(route[0].groundY - eyeOffsetY))
            .attr('r', util.toFixed(Math.max(1.2, rx * 0.18)));

        animateAttribute(
            eye,
            'cx',
            buildCoordinateValues(
                route,
                offset,
                'groundX',
                eyeOffsetX * direction,
            ),
            keyTimes,
            settings,
        );
        animateAttribute(
            eye,
            'cy',
            buildCoordinateValues(route, offset, 'groundY', -eyeOffsetY),
            keyTimes,
            settings,
        );
    });
};

const addSnakeBody = (
    group: SvgGroupSelection,
    route: ContributionGeometry[],
    settings: NormalizedSnakeAnimationSettings,
    tileWidth: number,
    tileHeight: number,
): void => {
    const keyTimes = buildKeyTimes(route.length);

    group.attr('class', 'snake-layer').attr('opacity', 0);
    animateAttribute(group, 'opacity', '1;1', '0;1', settings);

    for (
        let segmentIndex = settings.segmentCount - 1;
        0 <= segmentIndex;
        segmentIndex--
    ) {
        addSnakeSegment(
            group,
            route,
            keyTimes,
            settings,
            segmentIndex,
            tileWidth,
            tileHeight,
        );
    }
};

const addEatAnimations = (
    bars: AnimatedContributionBar[],
    route: ContributionGeometry[],
    settings: NormalizedSnakeAnimationSettings,
): void => {
    if (route.length === 0 || bars.length === 0) {
        return;
    }

    const firstVisit = new Map<string, number>();
    route.forEach((cell, index) => {
        const key = toKey(cell.week, cell.dayOfWeek);
        if (!firstVisit.has(key)) {
            firstVisit.set(key, index);
        }
    });

    bars.forEach((barInfo) => {
        const visitIndex = firstVisit.get(
            toKey(barInfo.geometry.week, barInfo.geometry.dayOfWeek),
        );
        if (visitIndex === undefined) {
            return;
        }

        const start = visitIndex / route.length;
        const end = Math.min(start + settings.eatDurationFraction, 1);
        const keyTimes = ['0', formatRatio(start), formatRatio(end), '1'].join(
            ';',
        );

        barInfo.bar
            .append('animateTransform')
            .attr('attributeName', 'transform')
            .attr('type', 'translate')
            .attr(
                'values',
                `${util.toFixed(barInfo.geometry.baseX)} ${util.toFixed(
                    barInfo.geometry.baseY - barInfo.geometry.calHeight,
                )};${util.toFixed(barInfo.geometry.baseX)} ${util.toFixed(
                    barInfo.geometry.baseY - barInfo.geometry.calHeight,
                )};${util.toFixed(barInfo.geometry.baseX)} ${util.toFixed(
                    barInfo.geometry.baseY - BASE_TILE_HEIGHT,
                )};${util.toFixed(barInfo.geometry.baseX)} ${util.toFixed(
                    barInfo.geometry.baseY - BASE_TILE_HEIGHT,
                )}`,
            )
            .attr('keyTimes', keyTimes)
            .attr('dur', settings.duration)
            .attr('begin', settings.begin)
            .attr('repeatCount', settings.repeatCount)
            .attr('fill', 'freeze');

        barInfo.bar
            .append('animate')
            .attr('attributeName', 'opacity')
            .attr('values', '1;1;0;0')
            .attr('keyTimes', keyTimes)
            .attr('dur', settings.duration)
            .attr('begin', settings.begin)
            .attr('repeatCount', settings.repeatCount)
            .attr('fill', 'freeze');

        barInfo.leftPanel
            .append('animate')
            .attr('attributeName', 'height')
            .attr(
                'values',
                `${util.toFixed(barInfo.heightLeft)};${util.toFixed(
                    barInfo.heightLeft,
                )};${util.toFixed(
                    Math.max(1 / barInfo.scaleLeft, 0.5),
                )};${util.toFixed(Math.max(1 / barInfo.scaleLeft, 0.5))}`,
            )
            .attr('keyTimes', keyTimes)
            .attr('dur', settings.duration)
            .attr('begin', settings.begin)
            .attr('repeatCount', settings.repeatCount)
            .attr('fill', 'freeze');

        barInfo.rightPanel
            .append('animate')
            .attr('attributeName', 'height')
            .attr(
                'values',
                `${util.toFixed(barInfo.heightRight)};${util.toFixed(
                    barInfo.heightRight,
                )};${util.toFixed(
                    Math.max(1 / barInfo.scaleRight, 0.5),
                )};${util.toFixed(Math.max(1 / barInfo.scaleRight, 0.5))}`,
            )
            .attr('keyTimes', keyTimes)
            .attr('dur', settings.duration)
            .attr('begin', settings.begin)
            .attr('repeatCount', settings.repeatCount)
            .attr('fill', 'freeze');
    });
};

export const addSnakeAnimation = (
    group: SvgGroupSelection,
    cells: ContributionGeometry[],
    bars: AnimatedContributionBar[],
    settings: type.FullSettings,
    hasGrowingAnimation: boolean,
    tileWidth: number,
    tileHeight: number,
): void => {
    const snakeSettings = normalizeSnakeAnimationSettings(
        settings,
        hasGrowingAnimation,
    );
    if (!snakeSettings) {
        return;
    }

    const route = buildSnakeRoute(cells);
    if (route.length < 2) {
        return;
    }

    addSnakeBody(group, route, snakeSettings, tileWidth, tileHeight);
    addEatAnimations(bars, route, snakeSettings);
};
