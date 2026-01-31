const themeSwitcher = document.getElementById('theme-switcher');
const html = document.documentElement;

// Function to set the theme
function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Event listener for the theme switcher button
themeSwitcher.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    setTheme('light');
  } else {
    setTheme('dark');
  }
});

// Check for a saved theme in localStorage when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
});
