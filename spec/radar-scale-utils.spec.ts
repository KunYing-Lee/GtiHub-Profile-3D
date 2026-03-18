import {
    buildRadarRangeLabels,
    getRadarScaleMax,
    toRadarLevel,
} from '../src/radar-scale-utils';

describe('radar-scale-utils', () => {
    it('builds radar labels from total contributions', () => {
        expect(buildRadarRangeLabels(194)).toEqual([
            '39',
            '78',
            '116',
            '155',
            '194',
        ]);
    });

    it('maps radar values against total contributions', () => {
        expect(getRadarScaleMax(194)).toEqual(194);
        expect(toRadarLevel(16, 194)).toBeCloseTo(0.4124, 4);
        expect(toRadarLevel(9, 194)).toBeCloseTo(0.232, 3);
        expect(toRadarLevel(194, 194)).toEqual(5);
        expect(toRadarLevel(0, 194)).toEqual(0);
    });
});
