import * as util from './utils';

export const RADAR_LEVELS = 5;

export const getRadarScaleMax = (totalContributions: number): number =>
    Math.max(totalContributions, 1);

export const buildRadarRangeLabels = (
    totalContributions: number,
): Array<string> =>
    Array.from({ length: RADAR_LEVELS }, (_, index) =>
        util.toScale(
            Math.round(
                (getRadarScaleMax(totalContributions) * (index + 1)) /
                    RADAR_LEVELS,
            ),
        ),
    );

export const toRadarLevel = (
    value: number,
    totalContributions: number,
): number => {
    if (value <= 0) {
        return 0;
    }

    return Math.min(
        (value / getRadarScaleMax(totalContributions)) * RADAR_LEVELS,
        RADAR_LEVELS,
    );
};
