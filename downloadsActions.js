var downloadsActions = {
	dpt: dpTweaker,

	showDownloadWindow: function(window) {
		this.toggleDownloadPanel(window, false);
		if(!this.dpt.dispatchAPIEvent(window, "OpenDownloadWindow")) {
			_log("showDownloadWindow(): someone handle API event, do nothing");
			return true;
		}
		// https://addons.mozilla.org/firefox/addon/downloads-window/
		if(this.packageAvailable("downloads_window")) {
			_log("Found Downloads Window extension, will open its window");
			return this.openWindow(window, {
				uri: "chrome://downloads_window/content/downloadsWindow.xul",
				name: "downloads window",
				features: "chrome,dialog=no,resizable,centerscreen"
			});
		}
		if(
			"PrivateBrowsingUtils" in window
			&& window.PrivateBrowsingUtils.isWindowPrivate(window.content)
		) {
			_log("showDownloadWindow(): private downloads aren't supported");
			return false;
		}
		// See resource://app/components/DownloadsUI.js
		// DownloadsUI.prototype.show()
		_log("showDownloadWindow()");
		var toolkitUI = Components.classesByID["{7dfdf0d1-aff6-4a34-bad1-d0fe74601642}"]
			.getService(Components.interfaces.nsIDownloadManagerUI);
		toolkitUI.show(window/*, aDownload, aReason, aUsePrivateUI*/);
		return true;
	},
	toggleDownloadPanel: function(window, show) {
		_log("toggleDownloadPanel(" + show + ")");
		var DownloadsPanel = window.DownloadsPanel;
		if(show === undefined)
			show = !DownloadsPanel.isPanelShowing;
		else if(show == DownloadsPanel.isPanelShowing)
			return;
		if(show)
			DownloadsPanel.showPanel();
		else
			DownloadsPanel.hidePanel();
	},
	openDownloadsTab: function(window) {
		this.toggleDownloadPanel(window, false);
		const downloadsURI = "about:downloads";
		var gBrowser = window.gBrowser;
		// We need to check private state for Private Tab extension
		var pbu = "PrivateBrowsingUtils" in window && window.PrivateBrowsingUtils;
		var isPrivate = pbu && pbu.isWindowPrivate(window.content);
		if(!Array.some(gBrowser.visibleTabs || gBrowser.tabs, function(tab) {
			var browser = tab.linkedBrowser;
			if(
				browser
				&& browser.currentURI
				&& browser.currentURI.spec == downloadsURI
				&& isPrivate == (pbu && pbu.isWindowPrivate(browser.contentWindow))
			) {
				gBrowser.selectedTab = tab;
				return true;
			}
			return false;
		})) {
			//gBrowser.selectedTab = gBrowser.addTab(downloadsURI);
			// See resource://app/components/DownloadsUI.js
			window.openUILinkIn(downloadsURI, "tab");
		}
	},
	openDownloadsLibrary: function(window) {
		this.toggleDownloadPanel(window, false);
		// See resource://app/components/DownloadsUI.js
		return this.openWindow(window, {
			uri: "chrome://browser/content/places/places.xul",
			type: "Places:Organizer",
			features: "chrome,toolbar=yes,dialog=no,resizable",
			args: ["Downloads"],
			callback: function(win, alreadyOpened) {
				if(alreadyOpened)
					win.PlacesOrganizer.selectLeftPaneQuery("Downloads");
			}
		});
	},
	toggleDownloadsSidebar: function(window) {
		this.toggleDownloadPanel(window, false);
		if(!this.dpt.dispatchAPIEvent(window, "ToggleDownloadSidebar")) {
			_log("toggleDownloadsSidebar(): someone handle API event, do nothing");
			return true;
		}
		var document = window.document;
		var sbItem = document.getElementById("menu_dmSidebar") // OmniSidebar
			|| document.getElementById("downloads-mitem"); // All-in-One Sidebar
		if(sbItem) {
			// Prefer broadcaster, if available (because menuitem may be disabled)
			// see https://github.com/Infocatcher/Download_Panel_Tweaker/issues/21
			var observes = sbItem.getAttribute("observes");
			sbItem = observes && document.getElementById(observes) || sbItem;
			_log("toggleDownloadsSidebar(): found #" + sbItem.id);
			sbItem.doCommand();
			return;
		}
		var sbBrowser = document.getElementById("sidebar");
		var wpBrowser = sbBrowser && sbBrowser.boxObject.width > 0
			&& sbBrowser.contentDocument.getElementById("web-panels-browser");
		if(wpBrowser && wpBrowser.currentURI.spec == "about:downloads") {
			window.toggleSidebar();
			return;
		}
		var downloadsTitle = this.dpt.getEntity(
			["chrome://browser/locale/downloads/downloads.dtd"],
			"downloads.title",
			"Downloads"
		);
		window.openWebPanel(downloadsTitle, "about:downloads");
	},

	clearDownloads: function(mi) {
		_log("clearDownloads()");
		if(
			!this.confirm({
				pref: "clearDownloads.confirm",
				messageKey: "dpt.clearDownloads.confirmMessage",
				messageDefault: "Are you sure you want to clear ALL downloads history?",
				window: mi && mi.ownerDocument.defaultView
			})
		)
			return;
		try {
			var downloads = Services.downloads;
			downloads.canCleanUp && downloads.cleanUp();
			downloads.canCleanUpPrivate && downloads.cleanUpPrivate();
		}
		catch(e) { // Firefox 26.0a1
			_log("clearDownloads(): Services.downloads.cleanUp/cleanUpPrivate() failed:\n" + e);
			try {
				var global = Components.utils.import("resource://app/modules/DownloadsCommon.jsm", {});
				if(global.DownloadsData && global.DownloadsData.removeFinished) {
					global.DownloadsData.removeFinished();
					_log("clearDownloads(): cleanup DownloadsData");
				}
				if(global.PrivateDownloadsData && global.PrivateDownloadsData.removeFinished) {
					global.PrivateDownloadsData.removeFinished();
					_log("clearDownloads(): cleanup PrivateDownloadsData");
				}
			}
			catch(e2) {
				Components.utils.reportError(e2);
			}
		}
		Components.classes["@mozilla.org/browser/download-history;1"]
			.getService(Components.interfaces.nsIDownloadHistory)
			.removeAllDownloads();
		_log("clearDownloads(): done");
	},
	copyReferrer: function(mi) {
		var dlContext = mi.parentNode;
		var dlController = this.getDlController(dlContext.triggerNode);
		var document = mi.ownerDocument;
		var clipHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
			.getService(Components.interfaces.nsIClipboardHelper);
		try {
			var contentDoc = document.defaultView.content.document; // For Private Tab extension
			clipHelper.copyString(dlController.dataItem.referrer, contentDoc);
		}
		catch(e) {
			_log("nsIClipboardHelper.copyString(..., content.document) failed, Electrolysis?");
			Components.utils.reportError(e);
			clipHelper.copyString(dlController.dataItem.referrer, document);
		}
	},
	removeFile: function(mi) {
		var dlContext = mi.parentNode;
		var dlItem = this.getDlNode(dlContext.triggerNode);
		var dlController = this.getDlController(dlItem);
		var dataItem = dlController.dataItem;
		var path = this.getDataItemPath(dataItem);
		_log("removeFile(): " + path);
		var htmlPattern = /\.(?:[xs]?html?|xht)$/i;
		var removeFilesDirPref = "removeFile.removeFilesDirectoryForHTML";
		var clearHistory = prefs.get("removeFile.clearHistory");
		try {
			Components.utils.import("resource://gre/modules/osfile.jsm");
			OS.File.remove(path).then(
				function onSuccess() {
					dlItem.removeAttribute("exists");
					if(clearHistory)
						this.removeFromPanel(dlController, clearHistory > 1);
				}.bind(this),
				Components.utils.reportError
			);
			if(htmlPattern.test(path) && prefs.get(removeFilesDirPref)) {
				var filesPath = RegExp.leftContext + "_files";
				_log("removeFile(): HTML _files directory: " + filesPath);
				OS.File.removeDir(filesPath, { ignoreAbsent: true }).then(
					null,
					Components.utils.reportError
				);
			}
		}
		catch(e) { // Firefox 17
			if((e.message || e) != "osfile.jsm cannot be used from the main thread yet")
				Components.utils.reportError(e);
			_log("removeFile(): will use dataItem.localFile.remove(false)");
			var localFile = dataItem.localFile;
			if(htmlPattern.test(localFile.leafName) && prefs.get(removeFilesDirPref)) {
				var filesName = RegExp.leftContext + "_files";
				var filesDir = localFile.parent.clone();
				filesDir.append(filesName);
				_log("removeFile(): HTML _files directory: " + filesDir.path);
			}
			localFile.remove(false);
			if(clearHistory)
				this.removeFromPanel(dlController, clearHistory > 1);
			if(filesDir && filesDir.exists())
				filesDir.remove(true);
		}
	},
	removeFromPanel: function(dlController, clearHistory) {
		// See chrome://browser/content/downloads/downloads.js
		if(!clearHistory && dlController.dataItem && "remove" in dlController.dataItem) {
			dlController.dataItem.remove(); // Firefox 20+
			_log("removeFromPanel() -> dlController.dataItem.remove()");
		}
		else {
			if(!clearHistory)
				_log("removeFromPanel(): dlController.dataItem.remove() not available!");
			dlController.doCommand("cmd_delete");
			_log('removeFromPanel() -> dlController.doCommand("cmd_delete")');
		}
	},

	getDlNode: function(node) {
		for(; node; node = node.parentNode) {
			var ln = node.localName;
			if(ln == "richlistitem") {
				if(node.getAttribute("type") == "download")
					return node;
				break;
			}
			else if(ln == "panel") {
				break;
			}
		}
		return null;
	},
	getDlController: function(node) {
		var dlItem = this.getDlNode(node);
		if(!dlItem)
			return null;
		var window = dlItem.ownerDocument.defaultView;
		return new window.DownloadsViewItemController(dlItem);
	},
	getDataItemPath: function(dataItem) {
		var path = dataItem.file;
		if(!path || typeof path != "string" || path.startsWith("file:/")) // Firefox 24 and older
			path = dataItem.localFile.path;
		return path;
	},

	get xcr() {
		delete this.xcr;
		return this.xcr = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
			.getService(Components.interfaces.nsIXULChromeRegistry);
	},
	packageAvailable: function(packageName) {
		try {
			return /^[a-z]/.test(this.xcr.getSelectedLocale(packageName));
		}
		catch(e) {
		}
		return false;
	},
	openWindow: function(parentWindow, options) {
		var win = options.type && Services.wm.getMostRecentWindow(options.type)
			|| options.name && Services.ww.getWindowByName(options.name, null)
			|| (function() {
				var ws = Services.wm.getEnumerator(null);
				while(ws.hasMoreElements()) {
					var win = ws.getNext();
					if(win.location.href == options.uri)
						return win;
				}
				return null;
			})();
		if(win) {
			_log("openWindow(): already opened " + options.uri);
			options.callback && options.callback(win, true);
			win.focus();
		}
		else {
			var openArgs = [options.uri, options.name || "", options.features || "chrome,all,dialog=0"];
			options.args && openArgs.push.apply(openArgs, options.args);
			win = parentWindow.openDialog.apply(parentWindow, openArgs);
			_log("openWindow(): open " + options.uri);
			options.callback && win.addEventListener("load", function load(e) {
				win.removeEventListener(e.type, load, false);
				_log("openWindow(): loaded " + options.uri);
				options.callback(win, false);
			}, false);
		}
		return win;
	},
	confirm: function(options) {
		var pref = options.pref;
		if(!prefs.get(pref))
			return true;
		var strings = {
			"dpt.confirm.title": "Download Panel Tweaker",
			"dpt.confirm.dontAskAgain": "Don't ask again"
		};
		strings[options.messageKey] = options.messageDefault;
		this.dpt.getEntities(["chrome://downloadpaneltweaker/locale/dpt.dtd"], strings);
		var dontAsk = { value: false };
		var ok = Services.prompt.confirmCheck(
			options.window || Services.ww.activeWindow,
			strings["dpt.confirm.title"],
			strings[options.messageKey],
			strings["dpt.confirm.dontAskAgain"],
			dontAsk
		);
		if(ok && dontAsk.value)
			prefs.set(pref, false);
		return ok;
	}
};