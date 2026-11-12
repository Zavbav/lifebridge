const assert = require("node:assert/strict");
const { Builder, By, until } = require("selenium-webdriver");

const baseUrl = "http://127.0.0.1:4173/";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let driver;
  const checks = [];
  try {
    driver = await new Builder().forBrowser("safari").build();
    await driver.manage().setTimeouts({ implicit: 1500, pageLoad: 30000, script: 10000 });
    await driver.get(baseUrl);
    await driver.wait(async () => (await driver.executeScript("return document.readyState")) === "complete", 20000);
    await driver.wait(until.elementLocated(By.css(".navlinks a[data-lb-route]")), 15000);

    await driver.executeScript(`
      window.__lbSafariErrors = [];
      window.addEventListener("error", event => window.__lbSafariErrors.push(event.message || "window error"));
      window.addEventListener("unhandledrejection", event => window.__lbSafariErrors.push(String(event.reason)));
    `);

    const routeLinks = await driver.findElements(By.css(".navlinks a[data-lb-route]"));
    const routeIds = [];
    for (const link of routeLinks) {
      routeIds.push((await link.getAttribute("href")).split("#")[1]);
    }
    assert(routeIds.includes("calendar"), "Calendar route is missing");
    assert(routeIds.includes("levelup"), "Progress route is missing");
    assert(routeIds.includes("bibleStudy"), "Bible Study route is missing");

    for (const id of routeIds) {
      const link = await driver.findElement(By.css(`.navlinks a[data-lb-route="${id}"]`));
      await link.click();
      await driver.wait(async () => (await driver.executeScript("return location.hash")) === "#" + id, 7000);

      const panelSelector = id === "home" ? ".hero-upgraded" : (id === "bibleStudy" ? "#learn" : "#" + id);
      const result = await driver.executeScript((selector, routeId) => {
        const panel = document.querySelector(selector);
        const innerBible = routeId === "bibleStudy" ? document.querySelector("#bibleStudy") : null;
        if (!panel) return { exists: false };
        const rect = panel.getBoundingClientRect();
        const style = getComputedStyle(panel);
        const innerVisible = !innerBible || (getComputedStyle(innerBible).display !== "none" && innerBible.getBoundingClientRect().height > 0);
        return {
          exists: true,
          display: style.display,
          ariaHidden: panel.getAttribute("aria-hidden"),
          height: rect.height,
          top: rect.top,
          innerVisible
        };
      }, panelSelector, id);

      assert(result.exists, id + " panel does not exist");
      assert.notEqual(result.display, "none", id + " panel is hidden");
      assert.notEqual(result.ariaHidden, "true", id + " panel is aria-hidden");
      assert(result.height > 0, id + " panel has no visible height");
      assert(result.top < 180, id + " opens too far down the page");
      assert(result.innerVisible, "Bible Study content is hidden");
      checks.push("Route opens at top: " + id);
    }

    await driver.findElement(By.css('.navlinks a[data-lb-route="learn"]')).click();
    await driver.wait(until.elementIsVisible(await driver.findElement(By.id("sampleDeck"))), 7000);
    await driver.findElement(By.id("sampleDeck")).click();
    await driver.findElement(By.id("createDeck")).click();
    await driver.wait(async () => {
      const count = await driver.executeScript("return document.querySelector('#deckSelect').options.length");
      return count > 1;
    }, 7000);
    checks.push("Sample study deck creates successfully");

    const modes = {
      cards: "flashcardMode",
      quiz: "quizMode",
      write: "writeMode",
      missed: "flashcardMode",
      sprint: "sprintMode",
      fill: "fillMode",
      match: "matchMode",
      exam: "examMode"
    };
    for (const [mode, panelId] of Object.entries(modes)) {
      await driver.findElement(By.css('[data-study-mode="' + mode + '"]')).click();
      await driver.wait(async () => driver.executeScript(
        "return !document.getElementById(arguments[0]).hidden", panelId
      ), 7000);
      checks.push("Study mode opens: " + mode);
    }

    const errors = await driver.executeScript("return window.__lbSafariErrors");
    assert.deepEqual(errors, [], "JavaScript errors during Safari navigation: " + errors.join(" | "));

    console.log("NATIVE SAFARI TEST PASSED");
    console.log(checks.map((item, index) => (index + 1) + ". " + item).join("\n"));
  } catch (error) {
    console.error("NATIVE SAFARI TEST FAILED");
    console.error(error && error.stack ? error.stack : error);
    if (driver) {
      try {
        console.error("Current URL:", await driver.getCurrentUrl());
        console.error("Browser errors:", await driver.executeScript("return window.__lbSafariErrors || []"));
      } catch {}
    }
    process.exitCode = 1;
  } finally {
    if (driver) await driver.quit();
  }
})();
