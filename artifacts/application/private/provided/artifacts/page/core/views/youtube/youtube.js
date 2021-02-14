if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.views.Youtube = Vue.extend({
	template: "#page-youtube",
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		localState: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			configuring: false
		}
	},
	created: function() {
		var self = this;
		// this monitor allows us to check whether you have activated the iframe and are thus presumably watching the video
		var monitor = setInterval(function(){
			var element = document.activeElement;
			if (element && element == self.$refs.iframe) {
				clearInterval(monitor);
				self.analyze();
			}
		}, 100);
	},
	computed: {
		url: function() {
			if (this.cell.state.url) {
				// examples:
				// main site: https://www.youtube.com/watch?v=bmLCj8Qba-M&t=553s
				// shorter: https://youtu.be/o0nar1v3jmU
				// already embedded: https://www.youtube.com/embed/bmLCj8Qba-M
				var url = this.cell.state.url;
				var code = null;
				if (url.match(/\\?v=/)) {
					code = url.replace(/^.*\\?v=([^&]+).*/, "$1");
				}
				else if (url.match(/.*youtu\.be/)) {
					code = url.replace(/^.*youtu\.be\/(.*)+/, "$1");
				}
				if (code != null) {
					url = "https://www.youtube.com/embed/" + code;
				}
				if (this.cell.state.hideControls) {
					url += "?controls=0";
				}
				return url;
			}
			return null;
		}	
	},
	methods: {
		configure: function() {
			this.configuring = true;	
		},
		analyze: function() {
			this.$services.analysis.push({
				pageName: this.page.content.name,
				pageCategory: this.page.content.category,
				category: "media",
				type: "media-view",
				event: "youtube",
				url: this.url
			});
			// DEPRECATED
			if (this.$services.analysis && this.$services.analysis.emit) {
				this.$services.analysis.emit("watch-youtube", this.url, null, true);
			}
		}
	}
})