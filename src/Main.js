document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll("nav a");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const diseaseCards = document.querySelectorAll(".disease-card");
  const searchInput = document.getElementById("search-input");
  const episodeCards = document.querySelectorAll(".episode-card");
  const mainVideo = document.getElementById("main-video");
  const modal = document.getElementById("protocol-modal");
  const closeModal = document.getElementById("close-modal");

  navLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      const category = button.dataset.category;

      diseaseCards.forEach(card => {
        if (category === "all" || card.dataset.category === category) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", event => {
      const query = event.target.value.toLowerCase().trim();
      diseaseCards.forEach(card => {
        const title = card.querySelector("h3").textContent.toLowerCase();
        const description = card.querySelector("p").textContent.toLowerCase();
        if (title.includes(query) || description.includes(query)) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  episodeCards.forEach(card => {
    card.addEventListener("click", () => {
      const videoSrc = card.dataset.videoSrc;
      if (mainVideo && videoSrc) {
        mainVideo.src = videoSrc;
        mainVideo.play();
        window.scrollTo({ top: mainVideo.offsetTop - 100, behavior: "smooth" });
      }
    });
  });

  diseaseCards.forEach(card => {
    const detailBtn = card.querySelector(".view-protocol-btn");
    if (detailBtn) {
      detailBtn.addEventListener("click", () => {
        if (modal) {
          modal.classList.add("open");
        }
      });
    }
  });

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      if (modal) {
        modal.classList.remove("open");
      }
    });
  }

  window.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.remove("open");
    }
  });
});
