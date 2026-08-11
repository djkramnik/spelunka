export type MatrixCallback<T> = (value: T, x: number, y: number) => void;

export class Matrix<T> {
    readonly grid: Array<Array<T> | undefined> = [];

    forEach(callback: MatrixCallback<T>): void {
        this.grid.forEach((column, x) => {
            column?.forEach((value, y) => {
                callback(value, x, y);
            });
        });
    }

    delete(x: number, y: number): void {
        const column = this.grid[x];
        if (column) {
            delete column[y];
        }
    }

    get(x: number, y: number): T | undefined {
        return this.grid[x]?.[y];
    }

    set(x: number, y: number, value: T): void {
        if (!this.grid[x]) {
            this.grid[x] = [];
        }

        this.grid[x][y] = value;
    }
}

export class Vec2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    copy(vector: Vec2): void {
        this.x = vector.x;
        this.y = vector.y;
    }

    set(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }
}
