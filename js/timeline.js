/**
 * timeline.js
 * @module timeline
 * @description Renders the left-panel interactive election timeline widget.
 * Displays key election milestones (registration, early voting, election day,
 * certification) with dates pulled from Firebase Realtime Database.
 * Replaces the Google Maps panel for non-location queries.
 *
 * Security: Uses textContent and DOM APIs exclusively — no innerHTML
 * with user data to prevent XSS vectors.
 *
 * Accessibility: Each milestone item has tabIndex=0, role="button",
 * and keyboard event handlers for Enter/Space activation.
 */

/**
 * Election milestone step configuration.
 * @constant {Array<{id: string, label: string}>}
 */
const STEPS = [
  { id: "registrationDeadline", label: "Voter Registration" },
  { id: "earlyVotingStart", label: "Early Voting Begins" },
  { id: "electionDay", label: "Election Day" },
  { id: "certificationDate", label: "Results Certification" },
];

/**
 * Initialise the timeline inside the given container using milestone data.
 * Clears any existing content and rebuilds the full timeline widget.
 * Uses safe DOM construction (createElement + textContent) to prevent XSS.
 *
 * @param {HTMLElement} container - The DOM element to hold the timeline
 * @param {Object} milestones - Map of milestone IDs to Unix timestamps
 * @returns {void}
 */
export function initTimeline(container, milestones) {
  if (!container) {
    return;
  }
  // Clear previous timeline content safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "election-timeline";
  wrapper.setAttribute("role", "list");
  wrapper.setAttribute("aria-label", "Election process timeline");
  wrapper.style.padding = "20px";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "20px";

  STEPS.forEach((step) => {
    const item = document.createElement("div");
    item.className = `timeline-item ${step.id}`;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `${step.label} milestone`);
    item.style.padding = "10px";
    item.style.border = "1px solid var(--color-border-tertiary)";
    item.style.borderRadius = "var(--border-radius-md)";
    item.style.cursor = "pointer";

    // Build child elements safely using textContent (no innerHTML)
    const labelEl = document.createElement("div");
    labelEl.style.fontWeight = "500";
    labelEl.textContent = step.label;

    const dateEl = document.createElement("div");
    dateEl.style.fontSize = "12px";
    dateEl.style.color = "var(--color-text-secondary)";
    const ts = milestones ? milestones[step.id] : undefined;
    dateEl.textContent = ts ? new Date(ts).toLocaleDateString() : "TBD";

    item.appendChild(labelEl);
    item.appendChild(dateEl);
    wrapper.appendChild(item);
  });

  container.appendChild(wrapper);
}

/**
 * Update a milestone's visual status to reflect its temporal position.
 *
 * @param {string} milestoneId - The milestone identifier (e.g. "registrationDeadline")
 * @param {"past"|"current"|"upcoming"} status - The visual state to apply
 * @returns {void}
 */
export function updateMilestoneStatus(milestoneId, status) {
  const el = document.querySelector(`.timeline-item.${milestoneId}`);
  if (!el) {
    return;
  }

  if (status === "past") {
    el.style.opacity = "0.6";
    el.style.borderLeft = "4px solid var(--color-text-secondary)";
  } else if (status === "current") {
    el.style.opacity = "1";
    el.style.borderLeft = "4px solid var(--color-text-info)";
    el.style.backgroundColor = "var(--color-background-info)";
  } else {
    el.style.opacity = "1";
    el.style.borderLeft = "4px solid transparent";
  }
}

/**
 * Attach click and keyboard handlers to a milestone for interactive queries.
 * Supports both mouse click and keyboard activation (Enter/Space keys).
 *
 * @param {string} id - The milestone identifier
 * @param {function(string): void} callback - Invoked with the milestone ID when activated
 * @returns {void}
 */
export function onMilestoneClick(id, callback) {
  const el = document.querySelector(`.timeline-item.${id}`);
  if (!el) {
    return;
  }
  el.addEventListener("click", () => callback(id));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback(id);
    }
  });
}
