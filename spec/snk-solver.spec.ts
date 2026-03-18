import { buildSnkSnakeRoute } from '../src/snk-solver';

describe('snk-solver', () => {
    it('builds a route that visits every colored contribution cell', () => {
        const cells = [...Array(4).keys()].flatMap((week) =>
            [...Array(7).keys()].map((dayOfWeek) => ({
                week,
                dayOfWeek,
                contributionLevel:
                    (week === 0 && dayOfWeek === 0) ||
                    (week === 1 && dayOfWeek === 3) ||
                    (week === 2 && dayOfWeek === 2) ||
                    (week === 3 && dayOfWeek === 6)
                        ? 1
                        : 0,
            })),
        );

        const route = buildSnkSnakeRoute(cells, 4);
        const coloredKeys = cells
            .filter((cell) => 0 < cell.contributionLevel)
            .map((cell) => `${cell.week}:${cell.dayOfWeek}`);
        const visitedKeys = new Set(
            route.map((point) => `${point.x}:${point.y}`),
        );

        expect(route.length).toBeGreaterThan(4);
        expect(route[0]).toEqual({ x: 0, y: -1 });
        expect(coloredKeys.every((key) => visitedKeys.has(key))).toBe(true);
    });
});
