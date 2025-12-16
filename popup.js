browser.storage.local.get("timeData").then(data => {
    const list = document.getElementById("list");
    const timeData = data.timeData || {};
  
    for (const [site, ms] of Object.entries(timeData)) {
      const li = document.createElement("li");
      li.textContent = `${site}: ${(ms / 60000).toFixed(1)} min`;
      list.appendChild(li);
    }
  });
  