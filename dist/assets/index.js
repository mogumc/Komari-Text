function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds / 3600) % 24);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days} 天 ${hours} 时 ${minutes} 分 ${secs} 秒`;
}

function startLiveMonitoring() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}/api/clients`);
  let intervalId;
  const wsStatusTd = document.getElementById("ws");
  const updateInterval = 3000;

  function sendPing() {
    if (ws.readyState === WebSocket.OPEN) ws.send("get");
  }

  function formatPercentage(used, total) {
    if (total === 0) return "0.00%";
    return ((used / total) * 100).toFixed(2) + "%";
  }

  function updateCpuUsage(serverDiv, usage, coresText = "获取失败") {
    const el = serverDiv.querySelector("p:nth-child(4)");
    if (el) {
      el.textContent = `CPU: ${coresText} ${usage.toFixed(2)}%`;
    }
  }

  function updateRamUsage(serverDiv, used, total) {
    const el = serverDiv.querySelector("p:nth-child(5)");
    if (el) {
      const usedFmt = formatBytes(used);
      const totalFmt = formatBytes(total);
      const percentage = formatPercentage(used, total);
      el.textContent = `RAM: ${usedFmt} /${totalFmt} ${percentage}`;
    }
  }

  function updateDiskUsage(serverDiv, used, total) {
    const el = serverDiv.querySelector("p:nth-child(6)");
    if (el) {
      const usedFmt = formatBytes(used);
      const totalFmt = formatBytes(total);
      const percentage = formatPercentage(used, total);
      el.textContent = `Disk: ${usedFmt} /${totalFmt} ${percentage}`;
    }
  }

  function updateTraffic(serverDiv, up, down) {
    const el = serverDiv.querySelector("p:nth-child(7)");
    if (el) {
      const upGB = (up / Math.pow(1024, 3)).toFixed(2);
      const downGB = (down / Math.pow(1024, 3)).toFixed(2);
      el.textContent = `Traffic: ↑ ${upGB} GB ↓ ${downGB} GB`;
    }
  }

  function updateSpeed(serverDiv, up, down) {
    const el = serverDiv.querySelector("p:nth-child(8)");
    if (el) {
      const upKB = (up / 1024).toFixed(2);
      const downKB = (down / 1024).toFixed(2);
      el.textContent = `Speed: Up ${upKB} KB/s Down ${downKB} KB/s`;
    }
  }

  function updateRuntime(serverDiv, uptime) {
    const el = serverDiv.querySelector("p:nth-child(9)");
    if (el) {
      el.textContent = `RunTime: ${formatUptime(uptime)}`;
    }
  }
  
  function updateLoad(serverDiv, load1) {
    const el = serverDiv.querySelector("p:nth-child(10)");
    if (el) {
      el.textContent = `Load: ${load1.toFixed(2)} Online`;
    }
  }

  function updateServerInfo(uuid, info) {
    const serverCard = document.querySelector(`.server-card h3[uuid="${uuid}"]`);
    if (!serverCard) return;
    const serverDiv = serverCard.parentElement;

    const cpuEl = serverDiv.querySelector("p:nth-child(4)");

    const cpuText = cpuEl?.textContent || "";
    const coresMatch = cpuText.match(/CPU: ([\d\s]*Cores)/i);
    const coresText = coresMatch ? coresMatch[1] : "获取失败";
    const { cpu, ram, disk, network, uptime, load } = info;

    updateCpuUsage(serverDiv, cpu.usage, coresText);
    updateRamUsage(serverDiv, ram.used, ram.total);
    updateDiskUsage(serverDiv, disk.used, disk.total);
    updateTraffic(serverDiv, network.totalUp, network.totalDown);
    updateSpeed(serverDiv, network.up, network.down);
    updateRuntime(serverDiv, uptime);
    updateLoad(serverDiv, load.load1);
  }

  ws.addEventListener("open", () => {
    if (wsStatusTd) wsStatusTd.textContent = "";
    sendPing();
    intervalId = setInterval(sendPing, updateInterval);
  });

  ws.addEventListener("message", e => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.status === "success" && msg.data?.data) {
        const clients = msg.data.data;
        for (const uuid in clients) {
          updateServerInfo(uuid, clients[uuid]);
        }
      }
    } catch (err) {
      console.error("数据解析失败", err.message);
    }
  });

  ws.addEventListener("close", () => {
    clearInterval(intervalId);
    if (wsStatusTd) wsStatusTd.textContent = "ws未连接";
  });

  ws.addEventListener("error", err => {
    console.error("WS错误", err.message);
    ws.close();
    if (wsStatusTd) wsStatusTd.textContent = "ws未连接";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  function initNavigation() {
    const existingTitle = document.querySelector("h1");
    if (existingTitle && existingTitle.textContent.trim() === "Komari Monitor") {
      fetchPublicData();
      return;
    }
    const navbar = document.getElementById("navbar");
    if (navbar) {
      navbar.innerHTML = `
        <nav>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="left"><h1 id="dynamic-title">Komari Monitor</h1><span id="ws">ws未连接</span></td>
              <td align="right"><a href="/admin">管理</a></td>
            </tr>
          </table>
        </nav>`;
      fetchPublicData();
    }
  }

  function fetchPublicData() {
    fetch("/api/public")
      .then(r => {
        if (!r.ok) throw new Error("获取公共数据失败");
        return r.json();
      })
      .then(d => {
        if (d.status === "success") {
          const title = document.querySelector("h1");
          if (title) title.textContent = d.data.sitename || "Komari Monitor";
        }
      })
      .catch(e => console.error("获取站点设置失败", e));
  }

  function fetchNodes() {
    fetch("/api/nodes")
      .then(r => {
        if (!r.ok) throw new Error("获取服务器列表失败");
        return r.json();
      })
      .then(d => {
        if (d.status === "success") renderServers(d.data);
      })
      .catch(e => console.error("服务器数据请求失败", e));
  }

  function renderServers(data) {
    const container = document.getElementById("serverList");
    if (!container) return;
    const groups = {};
    data.forEach(node => {
      const tag = node.group || "未分组";
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(node);
    });
    container.innerHTML = "";
    for (const tag in groups) {
      const groupDiv = document.createElement("div");
      groupDiv.className = "tag-group";
      const title = document.createElement("h2");
      title.textContent = tag;
      groupDiv.appendChild(title);
      groups[tag].forEach(node => {
        const serverCard = document.createElement("div");
        serverCard.className = "server-card";
        serverCard.innerHTML = `
          <h3 uuid="${node.uuid}">${node.name}</h3>
          <p><strong>服务器信息</strong>
             <a href="/instance/?uuid=${node.uuid}"><strong>详细信息</strong></a>
             <a href="/task/?uuid=${node.uuid}"><strong>任务信息</strong></a>
          </p>
          <p>${node.region} 系统: ${node.os} 标签: ${node.tags || "--"}</p>
          <p>CPU: ${node.cpu_cores} Cores 0.00%</p>
          <p>RAM: -- /${formatBytes(node.mem_total)} 0.00%</p>
          <p>Disk: -- /${formatBytes(node.disk_total)} 0.00%</p>
          <p>Traffic: ↑ 0.00 GB ↓ 0.00 GB</p>
          <p>Speed: Up 0.00 KB/s Down 0.00 KB/s</p>
          <p>RunTime: -- 天 -- 时 -- 分 -- 秒</p>
          <p>Load: 0.00 Offline</p>
          <br/>
        `;
        groupDiv.appendChild(serverCard);
      });
      container.appendChild(groupDiv);
    }
  }

  initNavigation();
  fetchNodes();
  startLiveMonitoring();
});