import Trait from '../Trait.js';
import Stomper from './Stomper.js';

const COIN_LIFE_THRESHOLD = 100;

export default class Player extends Trait {
    name = 'UNNAMED';
    coins = 0;
    lives = 3;
    score = 0;

    constructor() {
        super();
        this.listen(Stomper.EVENT_STOMP, () => {
            this.score += 100;
            console.log('Score', this.score);
        });
    }

    addCoins(count: number): void {
        this.coins += count;
        this.queue(entity => {
            entity.sounds.add('coin');
        });

        while (this.coins >= COIN_LIFE_THRESHOLD) {
            this.addLives(1);
            this.coins -= COIN_LIFE_THRESHOLD;
        }
    }

    addLives(count: number): void {
        this.lives += count;
    }
}
