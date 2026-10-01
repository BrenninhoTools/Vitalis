const fs = require("fs");
const path = require("path");

const projectStructure = {
  directories: [
    "src",
    "tools",
    "public",
    "assets/videos",
    "assets/images"
  ],
  files: {
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n<title>Vitalis</title>\n</head>\n<body>\n<h1>Welcome to Vitalis</h1>\n</body>\n</html>",
    "src/Main.js": "document.addEventListener(\"DOMContentLoaded\", () => {\n  console.log(\"Vitalis initialized successfully.\");\n});",
    "tools/Setup.js": "// Setup script placeholder"
  }
};

function createProjectEnvironment() {
  projectStructure.directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log("Directory created: " + dir);
    }
  });

  for (const [filePath, fileContent] of Object.entries(projectStructure.files)) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, fileContent, "utf8");
      console.log("File created: " + filePath);
    }
  }

  console.log("Vitalis project environment setup complete.");
}

createProjectEnvironment();
