import * as type from './type';

const DEFAULT_DURATION = '18s';
const DEFAULT_EAT_DURATION = '0.35s';
const DEFAULT_REPEAT_COUNT = 'indefinite';

export interface SnakeRouteCell {
    week: number;
    dayOfWeek: number;
}

export interface NormalizedSnakeAnimationSettings {
    begin: string;
    duration: string;
    durationMs: number;
    eatDurationFraction: number;
    repeatCount: string;
    pathMode: 'snk' | 'serpentine';
    solverSnakeLength: number;
    segmentCount: number;
    segmentGap: number;
    segmentScale: number;
}

const parseDurationMs = (
    duration: string | undefined,
    fallbackMs: number,
): number => {
    if (!duration) {
        return fallbackMs;
    }

    const matched = duration.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(ms|s)$/i);
    if (!matched) {
        return fallbackMs;
    }

    const value = Number(matched[1]);
    if (!Number.isFinite(value) || value < 0) {
        return fallbackMs;
    }

    return matched[2].toLowerCase() === 'ms' ? value : value * 1000;
};

const toKey = (week: number, dayOfWeek: number): string =>
    `${week}:${dayOfWeek}`;

export const normalizeSnakeAnimationSettings = (
    settings: type.FullSettings,
    hasGrowingAnimation: boolean,
): NormalizedSnakeAnimationSettings | null => {
    const snake = settings.snakeAnimation;
    if (!snake?.enabled) {
        return null;
    }

    const duration = snake.duration || DEFAULT_DURATION;
    const durationMs = Math.max(parseDurationMs(duration, 18_000), 1_000);
    const eatDurationMs = parseDurationMs(
        snake.eatDuration,
        parseDurationMs(DEFAULT_EAT_DURATION, 350),
    );
    const startDelay = snake.startDelay
        ? snake.startDelay
        : hasGrowingAnimation
          ? '3s'
          : '0s';

    return {
        begin: startDelay,
        duration,
        durationMs,
        eatDurationFraction: Math.min(
            Math.max(eatDurationMs / durationMs, 0.01),
            0.25,
        ),
        repeatCount: snake.repeatCount || DEFAULT_REPEAT_COUNT,
        pathMode: snake.pathMode || 'snk',
        solverSnakeLength: Math.max(
            3,
            Math.min(6, snake.solverSnakeLength || 4),
        ),
        segmentCount: Math.max(4, Math.min(24, snake.segmentCount || 8)),
        segmentGap: Math.max(1, Math.min(8, snake.segmentGap || 2)),
        segmentScale: Math.max(0.18, Math.min(0.45, snake.segmentScale || 0.3)),
    };
};

export const buildSerpentineSnakeRoute = <T extends SnakeRouteCell>(
    cells: T[],
): T[] => {
    if (cells.length < 2) {
        return [];
    }

    const cellMap = new Map<string, T>();
    cells.forEach((cell) => {
        cellMap.set(toKey(cell.week, cell.dayOfWeek), cell);
    });

    const weekCount = Math.max(...cells.map((cell) => cell.week)) + 1;
    const route: T[] = [];

    for (let week = 0; week < weekCount; week++) {
        const days =
            week % 2 === 0 ? [0, 1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1, 0];
        for (const dayOfWeek of days) {
            const cell = cellMap.get(toKey(week, dayOfWeek));
            if (cell) {
                route.push(cell);
            }
        }
    }

    if (route.length < 2) {
        return route;
    }

    const lastCell = route[route.length - 1];

    for (let dayOfWeek = lastCell.dayOfWeek - 1; 0 <= dayOfWeek; dayOfWeek--) {
        const cell = cellMap.get(toKey(lastCell.week, dayOfWeek));
        if (cell) {
            route.push(cell);
        }
    }

    for (let week = lastCell.week - 1; 1 <= week; week--) {
        const cell = cellMap.get(toKey(week, 0));
        if (cell) {
            route.push(cell);
        }
    }

    return route;
};
