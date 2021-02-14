Vue.view("page-share-social", {
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		}
	},
	data: function() {
		return {
			configuring: false
		}
	},
	methods: {
		configure: function() {
			if (!this.cell.state.share) {
				Vue.set(this.cell.state, "share", []);
			}
			this.configuring = true;	
		},
		analyze: function(provider) {
			this.$services.analysis.push({
				pageName: this.page.content.name,
				pageCategory: this.page.content.category,
				category: "social",
				type: "social-share",
				event: provider
			});
			// DEPRECATED
			if (this.$services.analysis && this.$services.analysis.emit) {
				this.$services.analysis.emit("share-" + provider, {url:window.location}, null, true);
			}
		},
		generateLink: function(provider) {
			var url = null;
			if (this.cell.state.link) {
				// if we have an absolute link, just use that
				if (this.cell.state.link.indexOf("http:") == 0 || this.cell.state.link.indexOf("https:") == 0) {
					url = encodeURIComponent(this.cell.state.link);
				}
				// if we have an absolute path, add the host etc
				else if (this.cell.state.link.indexOf("/") == 0) {
					url = encodeURIComponent(window.location.protocol + "//" + window.location.host + this.cell.state.link);
				}
				// relative path? we assume relative to the web root...
				else {
					url = encodeURIComponent(window.location.protocol + "//" + window.location.host + "${server.root()}" + this.cell.state.link);
				}
			}
			else {
				url = encodeURIComponent(window.location);
			}
			var title = null;
			var summary = null;
			var source = null;
			var tags = [];
			var result = null;
			if (provider == "facebook") {
				result = "https://www.facebook.com/sharer/sharer.php?u=" + url;
			}
			else if (provider == "twitter") {
				result = "http://twitter.com/share?url=" + url;
				if (title != null) {
					result += "&text=" + title;
				}
				if (tags != null && tags.length) {
					result += "&hashtags=" + tags.join(",");
				}
			}
			else if (provider == "google-plus") {
				result = "https://plus.google.com/share?url=" + url;
			}
			else if (provider == "linkedin") {
				result = "https://www.linkedin.com/shareArticle?mini=true&url=" + url;
				if (title != null) {
					result += "&&title=" + title;
				}
				if (summary != null) {
					result += "&summary=" + summary;
				}
				if (source != null) {
					result += "&source=" + source;
				}
			}
			else if (provider == "email") {
				result = "mailto:?subject=" + (title ? title : url);
				if (title) {
					result += "&body=" + url;
				}
			}
			else if (provider == "pinterest") {
				result = "https://pinterest.com/pin/create/button/?url=" + url;
				if (title != null) {
					result += "&description=" + title;
				}
			}
			return result;
		}
	}
});