/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { updateMilestoneStatus, initTimeline } from '../js/timeline.js';

describe('timeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="timeline-container"></div>';
  });

  test('initializes timeline correctly', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, { registrationDeadline: 1234567890 });
    const items = document.querySelectorAll('.timeline-item');
    expect(items.length).toBe(4);
    expect(items[0].innerHTML).toContain('Voter Registration');
  });

  test('updates milestone status', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, { registrationDeadline: 1234567890 });
    
    updateMilestoneStatus('registrationDeadline', 'current');
    const el = document.querySelector('.registrationDeadline');
    expect(el.style.opacity).toBe('1');
  });
});
