const BAR_WIDTH = 160;
const BAR_HEIGHT = 12;

export default class LoadingProgress {
    private completed = 0;
    private total = 1;
    private label = 'Loading';

    reset(total: number, label = 'Loading'): void {
        this.completed = 0;
        this.total = Math.max(1, total);
        this.label = label;
    }

    advance(): void {
        this.completed = Math.min(this.completed + 1, this.total);
    }

    setLabel(label: string): void {
        this.label = label;
    }

    draw(context: CanvasRenderingContext2D): void {
        const progress = this.completed / this.total;
        const x = Math.floor((context.canvas.width - BAR_WIDTH) / 2);
        const y = Math.floor(context.canvas.height / 2) + 16;
        const inset = 2;
        const fillWidth = Math.floor((BAR_WIDTH - inset * 2) * progress);

        context.save();
        context.imageSmoothingEnabled = false;

        context.fillStyle = '#000';
        context.fillRect(0, y - 22, context.canvas.width, BAR_HEIGHT + 32);

        context.font = '10px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillStyle = '#fff';
        context.fillText(
            `${this.label} ${Math.round(progress * 100)}%`,
            Math.floor(context.canvas.width / 2),
            y - 18,
        );

        context.fillStyle = '#fff';
        context.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);
        context.fillStyle = '#000';
        context.fillRect(
            x + inset,
            y + inset,
            BAR_WIDTH - inset * 2,
            BAR_HEIGHT - inset * 2,
        );
        context.fillStyle = '#e52521';
        context.fillRect(
            x + inset,
            y + inset,
            fillWidth,
            BAR_HEIGHT - inset * 2,
        );

        context.restore();
    }
}
