const STORAGE_KEY = "contacthub_contacts";

let contacts = [];
let editId = null;
const modalEl = document.getElementById("contactModal");
const modal = new bootstrap.Modal(modalEl);

// ---------- Storage ----------
function loadContacts() {
  const data = localStorage.getItem(STORAGE_KEY);
  contacts = data ? JSON.parse(data) : [];
}

function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

// ---------- Helpers ----------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Validation ----------
function validateForm() {
  const name = document.getElementById("contactName");
  const phone = document.getElementById("contactPhone");
  const email = document.getElementById("contactEmail");

  let valid = true;

  // Name: letters & spaces, 2-50 chars
  const nameVal = name.value.trim();
  const nameRegex = /^[a-zA-Z\u0600-\u06FF\s]{2,50}$/;
  if (!nameRegex.test(nameVal)) {
    name.classList.add("is-invalid");
    valid = false;
  } else {
    name.classList.remove("is-invalid");
  }

  // Egyptian phone: 01 followed by 9 digits
  const phoneVal = phone.value.trim().replace(/\s|-/g, "");
  const phoneRegex = /^01[0125][0-9]{8}$/;
  if (!phoneRegex.test(phoneVal)) {
    phone.classList.add("is-invalid");
    valid = false;
  } else {
    phone.classList.remove("is-invalid");
  }

  // Email optional but must be valid if filled
  const emailVal = email.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailVal && !emailRegex.test(emailVal)) {
    email.classList.add("is-invalid");
    valid = false;
  } else {
    email.classList.remove("is-invalid");
  }

  return valid;
}

function clearValidation() {
  document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

// ---------- Render ----------
function updateStats() {
  document.getElementById("totalCount").textContent = contacts.length;
  document.getElementById("favCount").textContent = contacts.filter((c) => c.favorite).length;
  document.getElementById("emergencyCount").textContent = contacts.filter((c) => c.emergency).length;
  document.getElementById("contactsSubtitle").textContent =
    `Manage and organize your ${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`;
}

function renderAvatar(contact, sizeClass = "") {
  if (contact.avatar) {
    return `<div class="contact-avatar ${sizeClass}"><img src="${contact.avatar}" alt="" /></div>`;
  }
  return `<div class="contact-avatar ${sizeClass}">${getInitials(contact.name)}</div>`;
}

function renderContactCard(contact) {
  const badges = [];
  if (contact.group) badges.push(`<span class="badge-tag badge-group">${escapeHtml(contact.group)}</span>`);
  if (contact.favorite) badges.push(`<span class="badge-tag badge-fav">★ Favorite</span>`);
  if (contact.emergency) badges.push(`<span class="badge-tag badge-emergency">♥ Emergency</span>`);

  return `
    <div class="contact-card" data-id="${contact.id}">
      ${renderAvatar(contact)}
      <div class="contact-info">
        <h6>${escapeHtml(contact.name)}</h6>
        <p>${escapeHtml(contact.phone)}${contact.email ? " · " + escapeHtml(contact.email) : ""}</p>
        ${badges.length ? `<div class="contact-badges">${badges.join("")}</div>` : ""}
      </div>
      <div class="contact-actions">
        <a class="action-btn call" href="tel:${escapeHtml(contact.phone)}" title="Call">
          <i class="bi bi-telephone-fill"></i>
        </a>
        ${
          contact.email
            ? `<a class="action-btn email" href="mailto:${escapeHtml(contact.email)}" title="Email">
                <i class="bi bi-envelope-fill"></i>
              </a>`
            : ""
        }
        <button class="action-btn fav ${contact.favorite ? "active" : ""}" data-action="toggle-fav" title="Favorite">
          <i class="bi bi-star${contact.favorite ? "-fill" : ""}"></i>
        </button>
        <button class="action-btn edit" data-action="edit" title="Edit">
          <i class="bi bi-pencil-fill"></i>
        </button>
        <button class="action-btn delete" data-action="delete" title="Delete">
          <i class="bi bi-trash-fill"></i>
        </button>
      </div>
    </div>
  `;
}

function renderSideItem(contact) {
  return `
    <div class="side-contact">
      ${renderAvatar(contact)}
      <div class="flex-grow-1 min-width-0">
        <h6>${escapeHtml(contact.name)}</h6>
        <p>${escapeHtml(contact.phone)}</p>
      </div>
      <a class="action-btn call" href="tel:${escapeHtml(contact.phone)}" title="Call">
        <i class="bi bi-telephone-fill"></i>
      </a>
    </div>
  `;
}

function renderAll(filter = "") {
  const q = filter.toLowerCase().trim();
  const filtered = contacts.filter((c) => {
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const list = document.getElementById("contactsList");
  const empty = document.getElementById("emptyState");

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    empty.querySelector("p.fw-semibold").textContent = q ? "No matching contacts" : "No contacts found";
    empty.querySelector("p.small").textContent = q
      ? "Try a different search term"
      : 'Click "Add Contact" to get started';
  } else {
    empty.style.display = "none";
    list.innerHTML = filtered.map(renderContactCard).join("");
  }

  // Favorites sidebar
  const favs = contacts.filter((c) => c.favorite);
  const favList = document.getElementById("favoritesList");
  favList.innerHTML = favs.length
    ? favs.map(renderSideItem).join("")
    : `<p class="text-muted text-center small py-3 mb-0">No favorites yet</p>`;

  // Emergency sidebar
  const emerg = contacts.filter((c) => c.emergency);
  const emergList = document.getElementById("emergencyList");
  emergList.innerHTML = emerg.length
    ? emerg.map(renderSideItem).join("")
    : `<p class="text-muted text-center small py-3 mb-0">No emergency contacts</p>`;

  updateStats();
}

// ---------- Modal ----------
function resetForm() {
  document.getElementById("contactForm").reset();
  document.getElementById("avatarData").value = "";
  document.getElementById("avatarPreview").innerHTML = '<i class="bi bi-person-fill"></i>';
  document.getElementById("avatarPreview").style.background =
    "linear-gradient(135deg, #60a5fa, #3b82f6)";
  clearValidation();
  editId = null;
  document.getElementById("modalTitle").textContent = "Add New Contact";
  document.getElementById("saveContactBtn").textContent = "Save Contact";
}

function openAddModal() {
  resetForm();
  modal.show();
}

function openEditModal(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;

  editId = id;
  document.getElementById("modalTitle").textContent = "Edit Contact";
  document.getElementById("saveContactBtn").textContent = "Update Contact";
  document.getElementById("contactName").value = contact.name;
  document.getElementById("contactPhone").value = contact.phone;
  document.getElementById("contactEmail").value = contact.email || "";
  document.getElementById("contactAddress").value = contact.address || "";
  document.getElementById("contactGroup").value = contact.group || "";
  document.getElementById("contactNotes").value = contact.notes || "";
  document.getElementById("contactFavorite").checked = !!contact.favorite;
  document.getElementById("contactEmergency").checked = !!contact.emergency;
  document.getElementById("avatarData").value = contact.avatar || "";

  const preview = document.getElementById("avatarPreview");
  if (contact.avatar) {
    preview.innerHTML = `<img src="${contact.avatar}" alt="" />`;
    preview.style.background = "transparent";
  } else {
    preview.innerHTML = `<span style="font-size:1.5rem;font-weight:700">${getInitials(contact.name)}</span>`;
  }

  clearValidation();
  modal.show();
}

function getFormData() {
  return {
    name: document.getElementById("contactName").value.trim(),
    phone: document.getElementById("contactPhone").value.trim().replace(/\s|-/g, ""),
    email: document.getElementById("contactEmail").value.trim(),
    address: document.getElementById("contactAddress").value.trim(),
    group: document.getElementById("contactGroup").value,
    notes: document.getElementById("contactNotes").value.trim(),
    favorite: document.getElementById("contactFavorite").checked,
    emergency: document.getElementById("contactEmergency").checked,
    avatar: document.getElementById("avatarData").value || "",
  };
}

function saveContact() {
  if (!validateForm()) return;

  const data = getFormData();

  if (editId) {
    const idx = contacts.findIndex((c) => c.id === editId);
    if (idx !== -1) {
      contacts[idx] = { ...contacts[idx], ...data };
    }
    Swal.fire({
      icon: "success",
      title: "Updated!",
      text: "Contact updated successfully",
      timer: 1500,
      showConfirmButton: false,
    });
  } else {
    contacts.unshift({ id: generateId(), ...data, createdAt: Date.now() });
    Swal.fire({
      icon: "success",
      title: "Added!",
      text: "Contact added successfully",
      timer: 1500,
      showConfirmButton: false,
    });
  }

  saveContacts();
  renderAll(document.getElementById("searchInput").value);
  modal.hide();
  resetForm();
}

function deleteContact(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;

  Swal.fire({
    title: "Are you sure?",
    text: `Delete "${contact.name}"? This cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
  }).then((result) => {
    if (result.isConfirmed) {
      contacts = contacts.filter((c) => c.id !== id);
      saveContacts();
      renderAll(document.getElementById("searchInput").value);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Contact has been deleted",
        timer: 1400,
        showConfirmButton: false,
      });
    }
  });
}

function toggleFavorite(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;
  contact.favorite = !contact.favorite;
  saveContacts();
  renderAll(document.getElementById("searchInput").value);
}

// ---------- Avatar upload ----------
document.getElementById("avatarInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    Swal.fire({ icon: "error", title: "File too large", text: "Max size is 2MB" });
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    const dataUrl = ev.target.result;
    document.getElementById("avatarData").value = dataUrl;
    const preview = document.getElementById("avatarPreview");
    preview.innerHTML = `<img src="${dataUrl}" alt="" />`;
    preview.style.background = "transparent";
  };
  reader.readAsDataURL(file);
});

// ---------- Events ----------
document.getElementById("openAddModal").addEventListener("click", openAddModal);
document.getElementById("saveContactBtn").addEventListener("click", saveContact);

document.getElementById("searchInput").addEventListener("input", function () {
  renderAll(this.value);
});

document.getElementById("contactsList").addEventListener("click", function (e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const card = btn.closest(".contact-card");
  if (!card) return;
  const id = card.dataset.id;
  const action = btn.dataset.action;

  if (action === "edit") openEditModal(id);
  if (action === "delete") deleteContact(id);
  if (action === "toggle-fav") toggleFavorite(id);
});

// Clear validation on input
["contactName", "contactPhone", "contactEmail"].forEach((id) => {
  document.getElementById(id).addEventListener("input", function () {
    this.classList.remove("is-invalid");
  });
});

// Init
loadContacts();
renderAll();
