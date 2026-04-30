/**
 * timeline.js
 * @module timeline
 * @description Renders the left-panel interactive timeline.
 * Replaces the Google Maps panel for non-location queries.
 */

/**
 * Initializes the timeline SVG inside the given container.
 * @param {HTMLElement} container - The DOM element to hold the timeline
 * @param {Object} milestones - The milestone timestamps
 */
export function initTimeline(container, milestones) {
  if (!container) {return;}
  // Clear container
  container.innerHTML = '';
  
  // Create a basic visual timeline using standard DOM elements or SVG
  const wrapper = document.createElement('div');
  wrapper.className = 'election-timeline';
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', 'Election process timeline');
  wrapper.style.padding = '20px';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '20px';

  const steps = [
    { id: 'registrationDeadline', label: 'Voter Registration' },
    { id: 'earlyVotingStart', label: 'Early Voting Begins' },
    { id: 'electionDay', label: 'Election Day' },
    { id: 'certificationDate', label: 'Results Certification' }
  ];

  steps.forEach(step => {
    const item = document.createElement('div');
    item.className = `timeline-item ${step.id}`;
    item.tabIndex = 0;
    item.style.padding = '10px';
    item.style.border = '1px solid var(--color-border-tertiary)';
    item.style.borderRadius = 'var(--border-radius-md)';
    item.style.cursor = 'pointer';
    
    const ts = milestones[step.id];
    const dateStr = ts ? new Date(ts).toLocaleDateString() : 'TBD';

    item.innerHTML = `
      <div style="font-weight: 500">${step.label}</div>
      <div style="font-size: 12px; color: var(--color-text-secondary)">${dateStr}</div>
    `;

    wrapper.appendChild(item);
  });

  container.appendChild(wrapper);
}

/**
 * Updates a milestone's visual status
 * @param {string} milestoneId 
 * @param {string} status 'past', 'current', 'upcoming'
 */
export function updateMilestoneStatus(milestoneId, status) {
  const el = document.querySelector(`.timeline-item.${milestoneId}`);
  if (!el) {return;}
  
  if (status === 'past') {
    el.style.opacity = '0.6';
    el.style.borderLeft = '4px solid var(--color-text-secondary)';
  } else if (status === 'current') {
    el.style.opacity = '1';
    el.style.borderLeft = '4px solid var(--color-text-info)';
    el.style.backgroundColor = 'var(--color-background-info)';
  } else {
    el.style.opacity = '1';
    el.style.borderLeft = '4px solid transparent';
  }
}

/**
 * Attaches a click handler to milestones to trigger chat queries.
 * @param {string} id - The milestone id
 * @param {function} callback - Callback to trigger when clicked
 */
export function onMilestoneClick(id, callback) {
  const el = document.querySelector(`.timeline-item.${id}`);
  if (!el) {return;}
  el.addEventListener('click', () => callback(id));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback(id);
    }
  });
}
