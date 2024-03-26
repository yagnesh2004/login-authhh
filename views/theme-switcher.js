// Wait for the DOM content to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Get the sun logo and moon logo elements
    const sunLogo = document.getElementById("sun-logo");
    const moonLogo = document.getElementById("moon-logo");

    // Add click event listeners to the sun logo and moon logo
    sunLogo.addEventListener("click", function() {
        // Set the theme to light mode
        setTheme("light");
    });

    moonLogo.addEventListener("click", function() {
        // Set the theme to dark mode
        setTheme("dark");
    });

    // Function to set the theme
    function setTheme(themeName) {
        // Get the link element for the theme stylesheet
        const themeStyle = document.getElementById("theme-style");

        // Determine the URL of the theme stylesheet based on the theme name
        const themeURL = themeName === "light" ? "/css/light-theme.css" : "/css/dark-theme.css";

        // Set the href attribute of the theme stylesheet to the new URL
        themeStyle.setAttribute("href", themeURL);
    }
});
