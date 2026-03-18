import {
    buildSerpentineSnakeRoute,
    normalizeSnakeAnimationSettings,
} from '../src/snake-animation-utils';
import * as type from '../src/type';

describe('snake-animation-utils', () => {
    it('builds a serpentine route and closes it along the top edge', () => {
        const cells = [...Array(3).keys()].flatMap((week) =>
            [...Array(7).keys()].map((dayOfWeek) => ({
                week,
                dayOfWeek,
                key: `${week}:${dayOfWeek}`,
            })),
        );

        const route = buildSerpentineSnakeRoute(cells);

        expect(route.map((cell) => cell.key)).toEqual([
            '0:0',
            '0:1',
            '0:2',
            '0:3',
            '0:4',
            '0:5',
            '0:6',
            '1:6',
            '1:5',
            '1:4',
            '1:3',
            '1:2',
            '1:1',
            '1:0',
            '2:0',
            '2:1',
            '2:2',
            '2:3',
            '2:4',
            '2:5',
            '2:6',
            '2:5',
            '2:4',
            '2:3',
            '2:2',
            '2:1',
            '2:0',
            '1:0',
        ]);
    });

    it('normalizes defaults for snake timing and body size', () => {
        const settings: type.NormalColorSettings = {
            type: 'normal',
            backgroundColor: '#ffffff',
            foregroundColor: '#00000f',
            strongColor: '#111133',
            weakColor: 'gray',
            radarColor: '#47a042',
            contribColors: [
                '#efefef',
                '#d8e887',
                '#8cc569',
                '#47a042',
                '#1d6a23',
            ],
            growingAnimation: true,
            snakeAnimation: {
                enabled: true,
            },
        };

        expect(normalizeSnakeAnimationSettings(settings, true)).toEqual({
            begin: '3s',
            duration: '18s',
            durationMs: 18000,
            eatDurationFraction: 350 / 18000,
            repeatCount: 'indefinite',
            pathMode: 'snk',
            solverSnakeLength: 4,
            segmentCount: 8,
            segmentGap: 2,
            segmentScale: 0.3,
        });
    });
});
