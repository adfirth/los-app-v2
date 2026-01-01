import { describe, it, expect, beforeEach } from 'vitest';
import GameLogicManager from '../managers/GameLogicManager.js';

describe('GameLogicManager', () => {
    let gameLogicManager;

    beforeEach(() => {
        gameLogicManager = new GameLogicManager();
    });

    describe('Card Status Logic', () => {
        it('should return red-card for 0 lives', () => {
            expect(gameLogicManager.getCardStatus(0)).toBe('red-card');
        });

        it('should return yellow-card for 1 life', () => {
            expect(gameLogicManager.getCardStatus(1)).toBe('yellow-card');
        });

        it('should return no-cards for 2 lives', () => {
            expect(gameLogicManager.getCardStatus(2)).toBe('no-cards');
        });
    });

    describe('calculateLivesFromPicks', () => {
        it('should return default starting lives (2) when no picks exist', () => {
            expect(gameLogicManager.calculateLivesFromPicks({})).toBe(2);
        });

        it('should return custom starting lives when no picks exist', () => {
            expect(gameLogicManager.calculateLivesFromPicks({}, 5)).toBe(5);
        });

        it('should decrement lives for a loss', () => {
            const picks = {
                1: { result: 'loss' }
            };
            expect(gameLogicManager.calculateLivesFromPicks(picks, 2)).toBe(1);
        });

        it('should decrement lives for multiple losses', () => {
            const picks = {
                1: { result: 'loss' },
                2: { result: 'L' }
            };
            expect(gameLogicManager.calculateLivesFromPicks(picks, 2)).toBe(0);
        });

        it('should not decrement lives for a win', () => {
            const picks = {
                1: { result: 'win' }
            };
            expect(gameLogicManager.calculateLivesFromPicks(picks, 2)).toBe(2);
        });

        it('should not decrement lives for a draw', () => {
            const picks = {
                1: { result: 'draw' }
            };
            expect(gameLogicManager.calculateLivesFromPicks(picks, 2)).toBe(2);
        });

        it('should handle mixed results', () => {
            const picks = {
                1: { result: 'win' },
                2: { result: 'loss' },
                3: { result: 'draw' },
                4: { result: 'loss' }
            };
            expect(gameLogicManager.calculateLivesFromPicks(picks, 3)).toBe(1);
        });

        it('should not return negative lives', () => {
            const picks = {
                1: { result: 'loss' },
                2: { result: 'loss' },
                3: { result: 'loss' }
            };
            expect(gameLogicManager.calculateLivesFromPicks(picks, 2)).toBe(0);
        });
    });
});
