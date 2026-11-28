// SPDX-License-Identifier: LicenseRef-Runink-Proprietary
// SPDX-FileCopyrightText: 2026 Runink
require(["gitbook"], function (gitbook) {
  gitbook.events.bind("page.change", function () {
    document.querySelectorAll("pre").forEach(function (pre) {
      if (pre.querySelector(".runink-copy")) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "runink-copy";
      b.textContent = "Copy";
      b.addEventListener("click", function () {
        navigator.clipboard.writeText(pre.innerText.replace(/Copy$/, "").trimEnd());
      });
      pre.appendChild(b);
    });
  });
});
