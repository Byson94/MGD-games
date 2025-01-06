function loadProject(name) {
  console.log("Sending request to load project:", name); // Debugging log
  fetch("http://localhost:3000/load", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }), // Make sure to send the name
  })
    .then((response) => {
      console.log("Response received:", response); // Debugging log
      return response.json();
    })
    .then((data) => {
      console.log("Data received from server:", data); // Debugging log
      if (data.success) {
        const iframe = document.createElement("iframe");
        iframe.width = "100%";
        iframe.height = "600px"; // Adjust the height based on your content
        document.body.appendChild(iframe); // Append the iframe to the body

        if (data.blobUrl) {
          iframe.src = data.blobUrl; // Use the Blob URL returned from the server
        } else {
          console.error("Error: No Blob URL returned");
        }
      } else {
        console.error("Error:", data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function getAllProjects() {
  fetch("http://localhost:3000/allProjects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.text())
    .then((text) => {
      console.log("Raw response:", text);

      try {
        const data = JSON.parse(text);
        if (data.success) {
          // Get the content area div
          const contentArea = document.querySelector(".contentArea");

          // Clear previous content if any
          contentArea.innerHTML = "";

          // Loop through project names and create a list
          data.projectNames.forEach((projectName) => {
            const projectElement = document.createElement("div");
            projectElement.classList.add("project-name");
            projectElement.textContent = projectName; // Set the project name as text

            // Make the project name clickable
            projectElement.addEventListener("click", () => {
              const projectName = projectElement.textContent; // Get the project name
              window.location.href = `http://localhost:3000/preview/${encodeURIComponent(
                projectName
              )}`;
            });

            contentArea.appendChild(projectElement); // Add to the content area
          });
        } else {
          console.error("Error:", data.message);
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// Call the function to get and display the projects
getAllProjects();