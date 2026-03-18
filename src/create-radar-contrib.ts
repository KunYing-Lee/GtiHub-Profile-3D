import * as d3 from 'd3';
import {
    buildRadarRangeLabels,
    RADAR_LEVELS,
    toRadarLevel,
} from './radar-scale-utils';
import * as util from './utils';
import * as type from './type';

const radians = 2 * Math.PI;

export const createRadarContrib = (
    svg: d3.Selection<SVGSVGElement, unknown, null, unknown>,
    userInfo: type.UserInfo,
    x: number,
    y: number,
    width: number,
    height: number,
    settings: type.RadarContribSettings,
    isForcedAnimation: boolean,
): void => {
    const radius = (height / 2) * 0.8;
    const cx = width / 2;
    const cy = (height / 2) * 1.1;

    const isAnimate = settings.growingAnimation || isForcedAnimation;

    const commitLabel = settings.l10n ? settings.l10n.commit : 'Commit';
    const issueLabel = settings.l10n ? settings.l10n.issue : 'Issue';
    const pullReqLabel = settings.l10n ? settings.l10n.pullreq : 'PullReq';
    const reviewLabel = settings.l10n ? settings.l10n.review : 'Review';
    const repoLabel = settings.l10n ? settings.l10n.repo : 'Repo';
    const rangeLabels = buildRadarRangeLabels(userInfo.totalContributions);

    const data = [
        {
            name: commitLabel,
            value: userInfo.totalCommitContributions,
        },
        {
            name: issueLabel,
            value: userInfo.totalIssueContributions,
        },
        {
            name: pullReqLabel,
            value: userInfo.totalPullRequestContributions,
        },
        {
            name: reviewLabel,
            value: userInfo.totalPullRequestReviewContributions,
        },
        {
            name: repoLabel,
            value: userInfo.totalRepositoryContributions,
        },
    ];
    const total = data.length;
    const posX = (level: number, num: number) =>
        util.toFixed(
            radius *
                (level / RADAR_LEVELS) *
                Math.sin((num / total) * radians),
        );
    const posY = (level: number, num: number) =>
        util.toFixed(
            radius *
                (level / RADAR_LEVELS) *
                -Math.cos((num / total) * radians),
        );

    const group = svg
        .append('g')
        .attr(
            'transform',
            `translate(${util.toFixed(x + cx)}, ${util.toFixed(y + cy)})`,
        );

    for (let j = 0; j < RADAR_LEVELS; j++) {
        group
            .selectAll(null)
            .data(data)
            .enter()
            .append('line')
            .attr('x1', (d, i) => posX(j + 1, i))
            .attr('y1', (d, i) => posY(j + 1, i))
            .attr('x2', (d, i) => posX(j + 1, i + 1))
            .attr('y2', (d, i) => posY(j + 1, i + 1))
            .attr('class', 'stroke-weak')
            .style('stroke-dasharray', '4 4')
            .style('stroke-width', '1px');
    }

    group
        .selectAll(null)
        .data(rangeLabels)
        .enter()
        .append('text')
        .text((d) => d)
        .style('font-size', `${util.toFixed(radius / 12)}px`)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'auto')
        .attr('x', util.toFixed(radius / 50))
        .attr(
            'y',
            (d, i) => util.toFixed(-radius * ((i + 1) / RADAR_LEVELS)),
        )
        .attr('class', 'fill-weak');

    const axis = group
        .selectAll(null)
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'axis');

    axis.append('line')
        .attr('x1', (d, i) => posX(1, i))
        .attr('y1', (d, i) => posY(1, i))
        .attr('x2', (d, i) => posX(RADAR_LEVELS, i))
        .attr('y2', (d, i) => posY(RADAR_LEVELS, i))
        .attr('class', 'stroke-weak')
        .style('stroke-dasharray', '4 4')
        .style('stroke-width', '1px');

    axis.append('text')
        .text((d) => d.name)
        .style('font-size', `${util.toFixed(radius / 7.5)}px`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('x', (d, i) => posX(1.25 * RADAR_LEVELS, i))
        .attr('y', (d, i) => posY(1.17 * RADAR_LEVELS, i))
        .attr('class', 'fill-fg')
        .append('title')
        .text((d) => d.value);

    const points = data
        .map((d) => toRadarLevel(d.value, userInfo.totalContributions))
        .map((level, i) => `${posX(level, i)},${posY(level, i)}`)
        .join(' ');

    const radar = group
        .append('polygon')
        .attr('class', 'radar')
        .attr('points', points);
    if (isAnimate) {
        const level0 = toRadarLevel(0, userInfo.totalContributions);
        const points0 = data
            .map((d, i) => `${posX(level0, i)},${posY(level0, i)}`)
            .join(' ');
        radar
            .append('animate')
            .attr('attributeName', 'points')
            .attr('values', `${points0};${points}`)
            .attr('dur', '3s')
            .attr('repeatCount', '1');
    }
};
