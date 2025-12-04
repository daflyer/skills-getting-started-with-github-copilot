document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to show a temporary message
  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Optimistically update the DOM to show a newly added participant
  function addParticipantToDOM(activity, email) {
    const cards = activitiesList.querySelectorAll('.activity-card');
    for (const card of cards) {
      const title = card.querySelector('h4');
      if (title && title.textContent === activity) {
        let ul = card.querySelector('.participants-list');
        if (!ul) {
          const sec = document.createElement('div');
          sec.className = 'participants-section';
          sec.innerHTML = '<strong>Participants:</strong><ul class="participants-list"></ul>';
          card.appendChild(sec);
          ul = sec.querySelector('.participants-list');
        }

        // avoid duplicates
        const existing = Array.from(ul.querySelectorAll('.participant-email')).some(
          (el) => el.textContent === email
        );
        if (existing) return;

        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'participant-email';
        span.textContent = email;
        const btn = document.createElement('button');
        btn.className = 'unregister-btn';
        btn.dataset.activity = activity;
        btn.dataset.email = email;
        btn.setAttribute('aria-label', `Unregister ${email}`);
        btn.textContent = '✖';
        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);
        return;
      }
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants list HTML with unregister/delete button
        let participantsHTML = "";
        if (details.participants.length > 0) {
          participantsHTML = `
            <div class="participants-section">
              <strong>Participants:</strong>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (p) =>
                      `<li><span class="participant-email">${p}</span><button class="unregister-btn" data-activity="${escapeHtml(
                        name
                      )}" data-email="${escapeHtml(p)}" aria-label="Unregister ${escapeHtml(p)}">✖</button></li>`
                  )
                  .join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants-section">
              <strong>Participants:</strong>
              <p class="no-participants">No participants yet.</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Basic escaping to avoid simple HTML injection when inserting strings
  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Optimistically update UI so the new participant appears immediately
        addParticipantToDOM(activity, email);
        showMessage(result.message, "success");
        signupForm.reset();
        // Re-fetch to reconcile counts and data (short delay to ensure server processed)
        setTimeout(() => fetchActivities(), 300);
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Event delegation for unregister buttons
  activitiesList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".unregister-btn");
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "Failed to unregister", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Failed to unregister. Please try again.", "error");
    }
  });

  // Initialize app
  fetchActivities();
});
