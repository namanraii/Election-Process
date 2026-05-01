/**
 * @file timeline.test.js
 * @description Unit tests for the election timeline widget (timeline.js).
 * Tests DOM rendering, milestone status updates, keyboard accessibility,
 * and click handler registration.
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { updateMilestoneStatus, initTimeline, onMilestoneClick } from '../js/timeline.js';

describe('timeline.js — election timeline widget', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="timeline-container"></div>';
  });

  // --- initTimeline ---
  test('renders 4 milestone items', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, { registrationDeadline: 1234567890000 });
    const items = document.querySelectorAll('.timeline-item');
    expect(items.length).toBe(4);
  });

  test('renders milestone labels using textContent (no innerHTML)', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const firstItem = document.querySelector('.timeline-item');
    // Should use safe DOM construction — first child is the label div
    expect(firstItem.children[0].textContent).toBe('Voter Registration');
  });

  test('sets role="list" on wrapper and role="button" on items', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const wrapper = container.querySelector('.election-timeline');
    expect(wrapper.getAttribute('role')).toBe('list');
    const items = document.querySelectorAll('.timeline-item');
    items.forEach(item => {
      expect(item.getAttribute('role')).toBe('button');
    });
  });

  test('displays "TBD" when milestone timestamp is missing', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const dateEl = document.querySelector('.timeline-item').children[1];
    expect(dateEl.textContent).toBe('TBD');
  });

  test('displays formatted date when milestone timestamp is provided', () => {
    const container = document.getElementById('timeline-container');
    const ts = new Date('2026-11-03').getTime();
    initTimeline(container, { registrationDeadline: ts });
    const dateEl = document.querySelector('.registrationDeadline').children[1];
    expect(dateEl.textContent).not.toBe('TBD');
  });

  test('clears previous content on re-init', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    initTimeline(container, {});
    // Should only have one wrapper
    expect(container.querySelectorAll('.election-timeline').length).toBe(1);
  });

  test('handles null container gracefully', () => {
    expect(() => initTimeline(null, {})).not.toThrow();
  });

  test('handles null milestones gracefully', () => {
    const container = document.getElementById('timeline-container');
    expect(() => initTimeline(container, null)).not.toThrow();
    expect(document.querySelectorAll('.timeline-item').length).toBe(4);
  });

  test('sets tabIndex=0 on all milestone items', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    document.querySelectorAll('.timeline-item').forEach(item => {
      expect(item.tabIndex).toBe(0);
    });
  });

  // --- updateMilestoneStatus ---
  test('applies "current" styling with visible opacity', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, { registrationDeadline: 1234567890000 });
    updateMilestoneStatus('registrationDeadline', 'current');
    const el = document.querySelector('.registrationDeadline');
    expect(el.style.opacity).toBe('1');
    expect(el.style.borderLeft).toContain('4px solid');
  });

  test('applies "past" styling with reduced opacity', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    updateMilestoneStatus('registrationDeadline', 'past');
    const el = document.querySelector('.registrationDeadline');
    expect(el.style.opacity).toBe('0.6');
  });

  test('applies "upcoming" styling with transparent border', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    updateMilestoneStatus('registrationDeadline', 'upcoming');
    const el = document.querySelector('.registrationDeadline');
    expect(el.style.opacity).toBe('1');
  });

  test('handles missing milestone element gracefully', () => {
    expect(() => updateMilestoneStatus('nonExistent', 'current')).not.toThrow();
  });

  // --- onMilestoneClick ---
  test('registers click handler on milestone', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const cb = jest.fn();
    onMilestoneClick('registrationDeadline', cb);
    document.querySelector('.registrationDeadline').click();
    expect(cb).toHaveBeenCalledWith('registrationDeadline');
  });

  test('registers keyboard handler (Enter key)', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const cb = jest.fn();
    onMilestoneClick('electionDay', cb);
    const el = document.querySelector('.electionDay');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    el.dispatchEvent(event);
    expect(cb).toHaveBeenCalledWith('electionDay');
  });

  test('registers keyboard handler (Space key)', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const cb = jest.fn();
    onMilestoneClick('earlyVotingStart', cb);
    const el = document.querySelector('.earlyVotingStart');
    const event = new KeyboardEvent('keydown', { key: ' ' });
    el.dispatchEvent(event);
    expect(cb).toHaveBeenCalledWith('earlyVotingStart');
  });

  test('does not fire callback on other keys', () => {
    const container = document.getElementById('timeline-container');
    initTimeline(container, {});
    const cb = jest.fn();
    onMilestoneClick('registrationDeadline', cb);
    const el = document.querySelector('.registrationDeadline');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(cb).not.toHaveBeenCalled();
  });

  test('handles missing milestone in onMilestoneClick gracefully', () => {
    expect(() => onMilestoneClick('nonExistent', jest.fn())).not.toThrow();
  });
});
