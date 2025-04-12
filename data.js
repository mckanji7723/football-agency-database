let playerData = [];
let currentPage = 1;
const rowsPerPage = 50;
let filteredData = [];
let retryCount = 0;
const MAX_RETRIES = 3;

async function loadCSV() {
  try {
    document.getElementById("loadingIndicator").style.display = "block";
    document.getElementById("loadingIndicator").innerHTML = "Preparing to load data...";
    console.log("Starting to load CSV...");
    
    while (retryCount < MAX_RETRIES) {
      try {
        // First check if the file exists
        console.log("Attempting to fetch CSV file...");
        const response = await fetch("footballagency.csv");
        console.log("Fetch response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        document.getElementById("loadingIndicator").innerHTML = "Fetching CSV data...";
        console.log("CSV file fetched successfully");
        
        const csvText = await response.text();
        console.log("CSV text length:", csvText.length);
        
        if (!csvText || csvText.trim().length === 0) {
          throw new Error("CSV file is empty");
        }

        document.getElementById("loadingIndicator").innerHTML = "Parsing CSV data...";
        console.log("CSV text loaded, starting parse...");
        console.log("First few characters of CSV:", csvText.substring(0, 100));

        return new Promise((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function (result) {
              console.log("CSV parsing completed successfully");
              console.log("Number of rows:", result.data.length);
              
              if (result.data.length === 0) {
                throw new Error("No data found in CSV file");
              }

              // Log all available columns
              const availableColumns = Object.keys(result.data[0]);
              console.log("Available columns:", availableColumns);

              // Map column names to standard names
              const columnMapping = {
                "name": "Name",
                "player_name": "Name",
                "full_name": "Name",
                "age": "Age",
                "player_age": "Age",
                "team": "Team & Contract",
                "club": "Team & Contract",
                "current_team": "Team & Contract",
                "id": "ID",
                "player_id": "ID",
                "position": "Best position",
                "best_position": "Best position",
                "market_value": "Market value in €",
                "value": "Market value in €",
                "height": "Height",
                "player_height": "Height",
                "foot": "Foot",
                "preferred_foot": "Foot",
                "nationality": "Nationality",
                "country": "Nationality"
              };

              // Standardize column names
              const standardizedData = result.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                  const standardKey = columnMapping[key.toLowerCase()] || key;
                  newRow[standardKey] = row[key];
                });
                return newRow;
              });

              // Validate data structure
              const requiredColumns = ["Name", "Age", "Team & Contract", "ID"];
              const missingColumns = requiredColumns.filter(col => !standardizedData[0].hasOwnProperty(col));
              
              if (missingColumns.length > 0) {
                console.error("Missing columns:", missingColumns);
                console.error("Available columns:", Object.keys(standardizedData[0]));
                throw new Error(`Missing required columns: ${missingColumns.join(", ")}. Available columns: ${Object.keys(standardizedData[0]).join(", ")}`);
              }
              
              console.log("First row sample:", standardizedData[0]);
              playerData = standardizedData;
              filteredData = [...playerData];
              displayTable();
              document.getElementById("loadingIndicator").style.display = "none";
              document.getElementById("paginationControls").style.display = "block";
              resolve();
            },
            error: function(error) {
              console.error("Error parsing CSV:", error);
              document.getElementById("loadingIndicator").style.display = "none";
              const container = document.getElementById("dataContainer");
              container.innerHTML = `
                <div class="error-message">
                  <p>Error parsing data: ${error.message}</p>
                  <p>Please try refreshing the page. If the problem persists, contact support.</p>
                </div>`;
              reject(error);
            }
          });
        });
        
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
          document.getElementById("loadingIndicator").innerHTML = `Loading failed. Retrying (${retryCount}/${MAX_RETRIES})...`;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue;
        }
        
        throw error; // If all retries failed, throw the error
      }
    }
  } catch (error) {
    console.error("Error loading CSV:", error);
    document.getElementById("loadingIndicator").style.display = "none";
    const container = document.getElementById("dataContainer");
    container.innerHTML = `
      <div class="error-message">
        <p>Error loading data: ${error.message}</p>
        <p>Please try refreshing the page. If the problem persists, contact support.</p>
        <button onclick="retryCount = 0; loadCSV();" class="w-button">Retry Loading</button>
      </div>`;
  }
}

function displayTable() {
  const container = document.getElementById("dataContainer");
  container.innerHTML = ""; // Clear the container first

  if (filteredData.length === 0) {
    container.innerHTML = "<p style='text-align: center; margin-top: 20px;'>No data found</p>";
    return;
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const table = document.createElement("table");
  table.style.marginTop = "20px";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headers = Object.keys(currentData[0]);
  thead.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "<th>Actions</th></tr>";

  currentData.forEach((row, index) => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = row[h] || ""; // Handle null/undefined values
      td.contentEditable = true;
      td.dataset.key = h;
      td.addEventListener("input", () => {
        const globalIndex = startIndex + index;
        playerData[globalIndex][h] = td.textContent;
      });
      tr.appendChild(td);
    });

    const actionTd = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "w-button";
    deleteBtn.style.backgroundColor = "#f44336";
    deleteBtn.onclick = () => {
      if (confirm("Are you sure you want to delete this record?")) {
        const globalIndex = startIndex + index;
        playerData.splice(globalIndex, 1);
        filteredData = [...playerData];
        displayTable();
      }
    };
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);

  // Update pagination info
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

function searchPlayer() {
  try {
    const query = document.getElementById("search").value.toLowerCase().trim();
    const filterKey = document.getElementById("searchFilter").value;

    console.log("Searching for:", query, "in column:", filterKey);

    if (!query) {
      filteredData = [...playerData];
      console.log("No search query, showing all data");
    } else {
      filteredData = playerData.filter(p => {
        if (!p[filterKey]) return false;
        const value = p[filterKey].toString().toLowerCase();
        return value.includes(query);
      });
      console.log("Found", filteredData.length, "matching results");
    }

    // Reset to first page when searching
    currentPage = 1;
    
    // Update the display
    const container = document.getElementById("dataContainer");
    if (filteredData.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>No results found for "${query}" in ${filterKey}</p>
          <button onclick="filteredData = [...playerData]; currentPage = 1; displayTable();" class="w-button">
            Show All Data
          </button>
        </div>`;
    } else {
      displayTable();
    }

    // Update pagination controls
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages || totalPages === 0;

  } catch (error) {
    console.error("Error searching:", error);
    const container = document.getElementById("dataContainer");
    container.innerHTML = `
      <div class="error-message">
        <p>Error performing search: ${error.message}</p>
        <button onclick="filteredData = [...playerData]; currentPage = 1; displayTable();" class="w-button">
          Show All Data
        </button>
      </div>`;
  }
}

function insertRow() {
  try {
    const newRow = {
      "Name": document.getElementById("insertName").value.trim(),
      "Age": document.getElementById("insertAge").value.trim(),
      "Team & Contract": document.getElementById("insertTeam").value.trim(),
      "ID": document.getElementById("insertID").value.trim(),
      "Best position": document.getElementById("insertPosition").value.trim(),
      "Market value in €": document.getElementById("insertMarketValue").value.trim(),
      "Height": document.getElementById("insertHeight").value.trim(),
      "Foot": document.getElementById("insertFoot").value.trim(),
      "Nationality": document.getElementById("insertNationality").value.trim()
    };

    // Validate required fields
    if (!newRow.Name || !newRow.ID) {
      alert("Name and ID are required fields");
      return;
    }

    // Validate ID is unique
    if (playerData.some(p => p.ID === newRow.ID)) {
      alert("A player with this ID already exists");
      return;
    }

    playerData.unshift(newRow);
    filteredData = [...playerData];
    displayTable();

    // Clear input fields
    document.getElementById("insertName").value = "";
    document.getElementById("insertAge").value = "";
    document.getElementById("insertTeam").value = "";
    document.getElementById("insertID").value = "";
    document.getElementById("insertPosition").value = "";
    document.getElementById("insertMarketValue").value = "";
    document.getElementById("insertHeight").value = "";
    document.getElementById("insertFoot").value = "";
    document.getElementById("insertNationality").value = "";
  } catch (error) {
    console.error("Error inserting row:", error);
    alert("Error inserting new row. Please check the console for details.");
  }
}

// Add event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadCSV();
  document.getElementById("searchButton").addEventListener("click", searchPlayer);
  document.getElementById("search").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchPlayer();
    }
  });
  
  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayTable();
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      displayTable();
    }
  });
});
