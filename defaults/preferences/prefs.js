pref("extensions.downloadPanelTweaker.itemCountLimit", 7);
pref("extensions.downloadPanelTweaker.panelWidth", 58);
pref("extensions.downloadPanelTweaker.panelMaxHeight", 0);
pref("extensions.downloadPanelTweaker.progressBarHeight", 10);
pref("extensions.downloadPanelTweaker.showDownloadRate", true);
pref("extensions.downloadPanelTweaker.compactDownloads", 1);
pref("extensions.downloadPanelTweaker.decolorizePausedProgress", true);

pref("extensions.downloadPanelTweaker.middleClickToRemoveFromHistory", false);

pref("extensions.downloadPanelTweaker.overrideDownloadsCommand", 0);
pref("extensions.downloadPanelTweaker.overrideDownloadsCommand.private", 0);
pref("extensions.downloadPanelTweaker.overrideDownloadsHotkey", 1);
pref("extensions.downloadPanelTweaker.overrideDownloadsHotkey.private", 1);
pref("extensions.downloadPanelTweaker.overrideShowAllDownloads", 0);
pref("extensions.downloadPanelTweaker.overrideShowAllDownloads.private", 0);
// 0 - perform default action (don't override)
// 1 - toggle download panel
// 2 - open old downloads window
// 3 - open "about:downloads" tab
// 4 - open downloads library
// 5 - toggle sidebar with "about:downloads"

pref("extensions.downloadPanelTweaker.dontRemoveFinishedDownloads", true);
// Additional tweaks for dontRemoveFinishedDownloads = true, only Firefox 26+
pref("extensions.downloadPanelTweaker.downloadsMaxRetentionHours", 72); // 3*24
// Store finished downloads at least this time (in hours)
pref("extensions.downloadPanelTweaker.cleanupDownloadsOnShutdown", true);
// Save current "session" downloads into %profile%/downloads.json on browser shutdown to perform cleanup
// and correctly remove deleted (from UI) downloads, but this may break save process, if someone will
// call it at the same time.
pref("extensions.downloadPanelTweaker.fixDownloadsLoading", true);
// Override DownloadStore.prototype.load() to correctly load large data
pref("extensions.downloadPanelTweaker.fixDownloadsLoadingPerformance", true);
// Only for test purposes, reenable extension after change
pref("extensions.downloadPanelTweaker.suppressPausedDownloadsNotifications", true);
// Suppress notifications about all "canceled" downloads (include paused)

pref("extensions.downloadPanelTweaker.fixWrongTabsOnTopAttribute", true);

pref("extensions.downloadPanelTweaker.prefsVersion", 0);

pref("extensions.downloadPanelTweaker.debug", false);
pref("extensions.downloadPanelTweaker.debug.verbose", false);