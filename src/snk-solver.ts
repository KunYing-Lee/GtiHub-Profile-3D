export interface SolverRouteCell {
    week: number;
    dayOfWeek: number;
    contributionLevel: number;
}

interface Point {
    x: number;
    y: number;
}

interface Grid {
    width: number;
    height: number;
    data: Uint8Array;
}

type Snake = Uint8Array & { _tag: '__Snake__' };

const around4 = [
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
] as const;

const sortPush = <T>(
    arr: T[],
    value: T,
    compare: (a: T, b: T) => number,
): void => {
    let index = 0;
    while (index < arr.length && compare(arr[index], value) <= 0) {
        index++;
    }
    arr.splice(index, 0, value);
};

const createEmptyGrid = (width: number, height: number): Grid => ({
    width,
    height,
    data: new Uint8Array(width * height),
});

const copyGrid = ({ width, height, data }: Grid): Grid => ({
    width,
    height,
    data: Uint8Array.from(data),
});

const getIndex = (grid: Grid, x: number, y: number): number =>
    x * grid.height + y;

const isInside = (grid: Grid, x: number, y: number): boolean =>
    0 <= x && 0 <= y && x < grid.width && y < grid.height;

const isInsideLarge = (
    grid: Grid,
    margin: number,
    x: number,
    y: number,
): boolean =>
    -margin <= x &&
    -margin <= y &&
    x < grid.width + margin &&
    y < grid.height + margin;

const getColor = (grid: Grid, x: number, y: number): number =>
    grid.data[getIndex(grid, x, y)];

const getColorSafe = (grid: Grid, x: number, y: number): number =>
    isInside(grid, x, y) ? getColor(grid, x, y) : 0;

const isEmpty = (color: number): boolean => color === 0;

const setColor = (grid: Grid, x: number, y: number, color: number): void => {
    grid.data[getIndex(grid, x, y)] = color;
};

const setColorEmpty = (grid: Grid, x: number, y: number): void => {
    setColor(grid, x, y, 0);
};

const setEmptySafe = (grid: Grid, x: number, y: number): void => {
    if (isInside(grid, x, y)) {
        setColorEmpty(grid, x, y);
    }
};

const isGridEmpty = (grid: Grid): boolean =>
    grid.data.every((value) => value === 0);

const getHeadX = (snake: Snake): number => snake[0] - 2;
const getHeadY = (snake: Snake): number => snake[1] - 2;
const getSnakeLength = (snake: Snake): number => snake.length / 2;

const snakeEquals = (a: Snake, b: Snake): boolean => {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

const nextSnake = (snake: Snake, dx: number, dy: number): Snake => {
    const copy = new Uint8Array(snake.length);
    for (let i = 2; i < snake.length; i++) {
        copy[i] = snake[i - 2];
    }
    copy[0] = snake[0] + dx;
    copy[1] = snake[1] + dy;
    return copy as Snake;
};

const snakeWillSelfCollide = (
    snake: Snake,
    dx: number,
    dy: number,
): boolean => {
    const nx = snake[0] + dx;
    const ny = snake[1] + dy;

    for (let i = 2; i < snake.length - 2; i += 2) {
        if (snake[i] === nx && snake[i + 1] === ny) {
            return true;
        }
    }

    return false;
};

const snakeToCells = (snake: Snake): Point[] =>
    Array.from({ length: snake.length / 2 }, (_, index) => ({
        x: snake[index * 2] - 2,
        y: snake[index * 2 + 1] - 2,
    }));

const createSnakeFromCells = (points: Point[]): Snake => {
    const snake = new Uint8Array(points.length * 2);
    for (let index = points.length; index--; ) {
        snake[index * 2] = points[index].x + 2;
        snake[index * 2 + 1] = points[index].y + 2;
    }
    return snake as Snake;
};

const createInitialSnake = (length: number): Snake =>
    createSnakeFromCells(
        Array.from({ length }, (_, index) => ({ x: index, y: -1 })),
    );

interface Outside extends Grid {
    __outside: true;
}

const isOutside = (outside: Outside, x: number, y: number): boolean =>
    !isInside(outside, x, y) || isEmpty(getColor(outside, x, y));

const fillOutside = (outside: Outside, grid: Grid, color = 0): Outside => {
    let changed = true;
    while (changed) {
        changed = false;
        for (let x = outside.width; x--; ) {
            for (let y = outside.height; y--; ) {
                if (
                    getColor(grid, x, y) <= color &&
                    !isOutside(outside, x, y) &&
                    around4.some((step) =>
                        isOutside(outside, x + step.x, y + step.y),
                    )
                ) {
                    changed = true;
                    setColorEmpty(outside, x, y);
                }
            }
        }
    }

    return outside;
};

const createOutside = (grid: Grid, color = 0): Outside => {
    const outside = createEmptyGrid(grid.width, grid.height) as Outside;
    for (let x = outside.width; x--; ) {
        for (let y = outside.height; y--; ) {
            setColor(outside, x, y, 1);
        }
    }

    return fillOutside(outside, grid, color);
};

const getTunnelPath = (snake0: Snake, tunnel: Point[]): Snake[] => {
    const chain: Snake[] = [];
    let snake = snake0;

    for (let index = 1; index < tunnel.length; index++) {
        const dx = tunnel[index].x - getHeadX(snake);
        const dy = tunnel[index].y - getHeadY(snake);
        snake = nextSnake(snake, dx, dy);
        chain.unshift(snake);
    }

    return chain;
};

const trimTunnelStart = (grid: Grid, tunnel: Point[]): void => {
    while (tunnel.length) {
        const { x, y } = tunnel[0];
        if (!isInside(grid, x, y) || isEmpty(getColor(grid, x, y))) {
            tunnel.shift();
        } else {
            break;
        }
    }
};

const trimTunnelEnd = (grid: Grid, tunnel: Point[]): void => {
    while (tunnel.length) {
        const index = tunnel.length - 1;
        const { x, y } = tunnel[index];
        if (
            !isInside(grid, x, y) ||
            isEmpty(getColor(grid, x, y)) ||
            tunnel.findIndex((point) => point.x === x && point.y === y) < index
        ) {
            tunnel.pop();
        } else {
            break;
        }
    }
};

interface EscapeNode {
    snake: Snake;
    parent: EscapeNode | null;
    weight: number;
}

const unwrapPoints = (node: EscapeNode | null): Point[] =>
    !node
        ? []
        : [
              ...unwrapPoints(node.parent),
              { x: getHeadX(node.snake), y: getHeadY(node.snake) },
          ];

const getSnakeEscapePath = (
    grid: Grid,
    outside: Outside,
    snake0: Snake,
    color: number,
): Point[] | null => {
    const openList: EscapeNode[] = [{ snake: snake0, parent: null, weight: 0 }];
    const closeList: Snake[] = [];

    while (openList[0]) {
        const node = openList.shift()!;
        const x = getHeadX(node.snake);
        const y = getHeadY(node.snake);

        if (isOutside(outside, x, y)) {
            return unwrapPoints(node);
        }

        for (const step of around4) {
            const cellColor = getColorSafe(grid, x + step.x, y + step.y);

            if (
                cellColor <= color &&
                !snakeWillSelfCollide(node.snake, step.x, step.y)
            ) {
                const snake = nextSnake(node.snake, step.x, step.y);

                if (!closeList.some((current) => snakeEquals(current, snake))) {
                    const weight =
                        node.weight + 1 + +(cellColor === color) * 1000;
                    sortPush(
                        openList,
                        { snake, weight, parent: node },
                        (a, b) => a.weight - b.weight,
                    );
                    closeList.push(snake);
                }
            }
        }
    }

    return null;
};

const getBestTunnel = (
    grid: Grid,
    outside: Outside,
    x: number,
    y: number,
    color: number,
    snakeLength: number,
): Point[] | null => {
    const cell = { x, y };
    const snake0 = createSnakeFromCells(
        Array.from({ length: snakeLength }, () => cell),
    );

    const one = getSnakeEscapePath(grid, outside, snake0, color);
    if (!one) {
        return null;
    }

    const snakeCells = one.slice(0, snakeLength);
    while (snakeCells.length < snakeLength) {
        snakeCells.push(snakeCells[snakeCells.length - 1]);
    }
    const intermediateSnake = createSnakeFromCells(snakeCells);

    const gridCopy = copyGrid(grid);
    for (const point of one) {
        setEmptySafe(gridCopy, point.x, point.y);
    }

    const two = getSnakeEscapePath(gridCopy, outside, intermediateSnake, color);
    if (!two) {
        return null;
    }

    one.shift();
    one.reverse();
    one.push(...two);

    trimTunnelStart(grid, one);
    trimTunnelEnd(grid, one);

    return one;
};

interface TunnelPoint extends Point {
    tunnel: Point[];
    priority: number;
}

const getTunnelPriority = (
    grid: Grid,
    color: number,
    tunnel: Point[],
): number => {
    let sameColorCount = 0;
    let residualPenalty = 0;

    for (let index = 0; index < tunnel.length; index++) {
        const { x, y } = tunnel[index];
        const cellColor = getColorSafe(grid, x, y);

        if (
            !isEmpty(cellColor) &&
            index ===
                tunnel.findIndex((point) => point.x === x && point.y === y)
        ) {
            if (cellColor === color) {
                sameColorCount += 1;
            } else {
                residualPenalty += color - cellColor;
            }
        }
    }

    if (sameColorCount === 0) {
        return 99_999;
    }

    return residualPenalty / sameColorCount;
};

const getResidualTunnels = (
    grid: Grid,
    outside: Outside,
    snakeLength: number,
    color: number,
): TunnelPoint[] => {
    const points: TunnelPoint[] = [];

    for (let x = grid.width; x--; ) {
        for (let y = grid.height; y--; ) {
            const cellColor = getColor(grid, x, y);
            if (!isEmpty(cellColor) && cellColor < color) {
                const tunnel = getBestTunnel(
                    grid,
                    outside,
                    x,
                    y,
                    color,
                    snakeLength,
                );
                if (tunnel) {
                    points.push({
                        x,
                        y,
                        tunnel,
                        priority: getTunnelPriority(grid, color, tunnel),
                    });
                }
            }
        }
    }

    return points;
};

const getClosestTunnel = (points: TunnelPoint[], snake: Snake): Point[] => {
    let minDistance = Infinity;
    let closestTunnel: Point[] | null = null;
    const headX = getHeadX(snake);
    const headY = getHeadY(snake);
    const topPriority = points[0].priority;

    for (
        let index = 0;
        points[index] && points[index].priority === topPriority;
        index++
    ) {
        const tunnel = points[index].tunnel;
        const distance =
            (tunnel[0].x - headX) ** 2 + (tunnel[0].y - headY) ** 2;
        if (distance < minDistance) {
            minDistance = distance;
            closestTunnel = tunnel;
        }
    }

    return closestTunnel!;
};

const clearResidualColoredLayer = (
    grid: Grid,
    outside: Outside,
    snake0: Snake,
    color: number,
): Snake[] => {
    const snakeLength = getSnakeLength(snake0);
    const tunnels = getResidualTunnels(grid, outside, snakeLength, color);
    tunnels.sort((a, b) => b.priority - a.priority);

    const chain: Snake[] = [snake0];

    while (tunnels.length) {
        const tunnel = getClosestTunnel(tunnels, chain[0]);
        const pathToTunnel = getPathTo(
            grid,
            chain[0],
            tunnel[0].x,
            tunnel[0].y,
        );
        if (!pathToTunnel) {
            break;
        }

        chain.unshift(...pathToTunnel);
        chain.unshift(...getTunnelPath(chain[0], tunnel));

        for (const point of tunnel) {
            setEmptySafe(grid, point.x, point.y);
        }

        fillOutside(outside, grid);

        for (let index = tunnels.length; index--; ) {
            if (isEmpty(getColor(grid, tunnels[index].x, tunnels[index].y))) {
                tunnels.splice(index, 1);
            } else {
                const nextTunnel = getBestTunnel(
                    grid,
                    outside,
                    tunnels[index].x,
                    tunnels[index].y,
                    color,
                    snakeLength,
                );

                if (!nextTunnel) {
                    tunnels.splice(index, 1);
                } else {
                    tunnels[index].tunnel = nextTunnel;
                    tunnels[index].priority = getTunnelPriority(
                        grid,
                        color,
                        nextTunnel,
                    );
                }
            }
        }

        tunnels.sort((a, b) => b.priority - a.priority);
    }

    chain.pop();
    return chain;
};

const getCleanTunnellablePoints = (
    grid: Grid,
    outside: Outside,
    snakeLength: number,
    color: number,
): Point[] => {
    const points: Point[] = [];

    for (let x = grid.width; x--; ) {
        for (let y = grid.height; y--; ) {
            const cellColor = getColor(grid, x, y);
            if (
                !isEmpty(cellColor) &&
                cellColor <= color &&
                !points.some((point) => point.x === x && point.y === y)
            ) {
                const tunnel = getBestTunnel(
                    grid,
                    outside,
                    x,
                    y,
                    color,
                    snakeLength,
                );
                if (tunnel) {
                    for (const point of tunnel) {
                        if (
                            isInside(grid, point.x, point.y) &&
                            !isEmpty(getColor(grid, point.x, point.y))
                        ) {
                            points.push(point);
                        }
                    }
                }
            }
        }
    }

    return points;
};

interface SearchNode {
    snake: Snake;
    parent: SearchNode | null;
}

const unwrapSnakeChain = (node: SearchNode | null): Snake[] =>
    !node ? [] : [node.snake, ...unwrapSnakeChain(node.parent)];

const getPathToNextPoint = (
    grid: Grid,
    snake0: Snake,
    color: number,
    points: Point[],
): Snake[] | undefined => {
    const closeList: Snake[] = [];
    const openList: SearchNode[] = [{ snake: snake0, parent: null }];

    while (openList.length) {
        const node = openList.shift()!;
        const x = getHeadX(node.snake);
        const y = getHeadY(node.snake);

        const pointIndex = points.findIndex(
            (point) => point.x === x && point.y === y,
        );
        if (0 <= pointIndex) {
            points.splice(pointIndex, 1);
            return unwrapSnakeChain(node);
        }

        for (const step of around4) {
            if (
                isInsideLarge(grid, 2, x + step.x, y + step.y) &&
                !snakeWillSelfCollide(node.snake, step.x, step.y) &&
                getColorSafe(grid, x + step.x, y + step.y) <= color
            ) {
                const snake = nextSnake(node.snake, step.x, step.y);

                if (!closeList.some((current) => snakeEquals(current, snake))) {
                    closeList.push(snake);
                    openList.push({ snake, parent: node });
                }
            }
        }
    }
};

const clearCleanColoredLayer = (
    grid: Grid,
    outside: Outside,
    snake0: Snake,
    color: number,
): Snake[] => {
    const snakeLength = getSnakeLength(snake0);
    const points = getCleanTunnellablePoints(grid, outside, snakeLength, color);
    const chain: Snake[] = [snake0];

    while (points.length) {
        const path = getPathToNextPoint(grid, chain[0], color, points);
        if (!path) {
            break;
        }
        path.pop();

        for (const snake of path) {
            setEmptySafe(grid, getHeadX(snake), getHeadY(snake));
        }

        chain.unshift(...path);
    }

    fillOutside(outside, grid);
    chain.pop();
    return chain;
};

interface PathNode {
    parent: PathNode | null;
    snake: Snake;
    weight: number;
    estimate: number;
    score: number;
}

const getPathTo = (
    grid: Grid,
    snake0: Snake,
    x: number,
    y: number,
): Snake[] | undefined => {
    const openList: PathNode[] = [
        { snake: snake0, parent: null, weight: 0, estimate: 0, score: 0 },
    ];
    const closeList: Snake[] = [];

    while (openList.length) {
        const node = openList.shift()!;
        const currentX = getHeadX(node.snake);
        const currentY = getHeadY(node.snake);

        for (const step of around4) {
            const nextX = currentX + step.x;
            const nextY = currentY + step.y;

            if (nextX === x && nextY === y) {
                const path = [nextSnake(node.snake, step.x, step.y)];
                let parent = node.parent;
                let current: PathNode | null = node;
                while (current && parent) {
                    path.push(current.snake);
                    current = parent;
                    parent = current.parent;
                }
                return path;
            }

            if (
                isInsideLarge(grid, 2, nextX, nextY) &&
                !snakeWillSelfCollide(node.snake, step.x, step.y) &&
                (!isInside(grid, nextX, nextY) ||
                    isEmpty(getColor(grid, nextX, nextY)))
            ) {
                const next = nextSnake(node.snake, step.x, step.y);

                if (!closeList.some((current) => snakeEquals(current, next))) {
                    const weight = node.weight + 1;
                    const estimate = Math.abs(nextX - x) + Math.abs(nextY - y);
                    const score = weight + estimate;
                    const entry = {
                        snake: next,
                        parent: node,
                        weight,
                        estimate,
                        score,
                    };

                    sortPush(openList, entry, (a, b) => a.score - b.score);
                    closeList.push(next);
                }
            }
        }
    }
};

const getBestRoute = (grid0: Grid, snake0: Snake): Snake[] => {
    const grid = copyGrid(grid0);
    const outside = createOutside(grid);
    const chain: Snake[] = [snake0];

    const maxColor = Math.max(...grid.data);
    const colors = Array.from({ length: maxColor }, (_, index) => index + 1);

    for (const color of colors) {
        if (1 < color) {
            chain.unshift(
                ...clearResidualColoredLayer(grid, outside, chain[0], color),
            );
        }
        chain.unshift(
            ...clearCleanColoredLayer(grid, outside, chain[0], color),
        );
    }

    return chain.reverse();
};

interface PoseNode {
    snake: Snake;
    parent: PoseNode | null;
    weight: number;
    score: number;
}

const getPathToPose = (
    snake0: Snake,
    target: Snake,
    grid?: Grid,
): Snake[] | undefined => {
    if (snakeEquals(snake0, target)) {
        return [];
    }

    const targetCells = snakeToCells(target).reverse();
    const snakeLength = getSnakeLength(snake0);
    const box = {
        min: {
            x: Math.min(getHeadX(snake0), getHeadX(target)) - snakeLength - 1,
            y: Math.min(getHeadY(snake0), getHeadY(target)) - snakeLength - 1,
        },
        max: {
            x: Math.max(getHeadX(snake0), getHeadX(target)) + snakeLength + 1,
            y: Math.max(getHeadY(snake0), getHeadY(target)) + snakeLength + 1,
        },
    };

    const [head, ...forbidden] = targetCells;
    const openList: PoseNode[] = [
        { snake: snake0, parent: null, weight: 0, score: 0 },
    ];
    const closeList: Snake[] = [];

    while (openList.length) {
        const node = openList.shift()!;
        const x = getHeadX(node.snake);
        const y = getHeadY(node.snake);

        if (x === head.x && y === head.y) {
            const path: Snake[] = [];
            let current: PoseNode | null = node;
            while (current) {
                path.push(current.snake);
                current = current.parent;
            }
            path.unshift(...getTunnelPath(path[0], targetCells));
            path.pop();
            path.reverse();
            return path;
        }

        for (const step of around4) {
            const nextX = x + step.x;
            const nextY = y + step.y;

            if (
                !snakeWillSelfCollide(node.snake, step.x, step.y) &&
                (!grid ||
                    !isInside(grid, nextX, nextY) ||
                    isEmpty(getColor(grid, nextX, nextY))) &&
                (grid
                    ? isInsideLarge(grid, 2, nextX, nextY)
                    : box.min.x <= nextX &&
                      nextX <= box.max.x &&
                      box.min.y <= nextY &&
                      nextY <= box.max.y) &&
                !forbidden.some(
                    (point) => point.x === nextX && point.y === nextY,
                )
            ) {
                const next = nextSnake(node.snake, step.x, step.y);

                if (!closeList.some((current) => snakeEquals(current, next))) {
                    const weight = node.weight + 1;
                    const score =
                        weight +
                        Math.abs(nextX - head.x) +
                        Math.abs(nextY - head.y);
                    sortPush(
                        openList,
                        { snake: next, parent: node, weight, score },
                        (a, b) => a.score - b.score,
                    );
                    closeList.push(next);
                }
            }
        }
    }
};

const createContributionGrid = (cells: SolverRouteCell[]): Grid => {
    const width = Math.max(...cells.map((cell) => cell.week)) + 1;
    const height = Math.max(...cells.map((cell) => cell.dayOfWeek)) + 1;
    const grid = createEmptyGrid(width, height);

    cells.forEach((cell) => {
        setColor(
            grid,
            cell.week,
            cell.dayOfWeek,
            Math.max(0, cell.contributionLevel),
        );
    });

    return grid;
};

export const buildSnkSnakeRoute = (
    cells: SolverRouteCell[],
    snakeLength = 4,
): Point[] => {
    if (cells.length < 2) {
        return [];
    }

    const grid = createContributionGrid(cells);
    if (isGridEmpty(grid)) {
        return [];
    }

    const snake = createInitialSnake(snakeLength);
    const chain = getBestRoute(grid, snake);
    const returnPath = getPathToPose(chain[chain.length - 1], snake) || [];
    const fullChain = [...chain, ...returnPath];
    return fullChain.map((segment) => ({
        x: getHeadX(segment),
        y: getHeadY(segment),
    }));
};
