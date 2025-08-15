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
  initNavigation();
});