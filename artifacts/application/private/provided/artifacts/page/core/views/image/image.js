if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.views.Image = Vue.extend({
	template: "#page-image",
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
		href: {
			type: String,
			required: false
		}
	},
	activate: function(done) {
		var self = this;
		var promises = [];
		if (this.edit) {
			promises.push(this.load());
		}
		if (this.cell.state.inline && (this.cell.state.href || this.href)) {
			var self = this;
			var href = this.cell.state.href ? this.cell.state.href : this.href;
			// if not absolute, make it so
			if (href.indexOf("http://") != 0 && href.indexOf("https://") != 0 && href.indexOf("/") != 0) {
				href = "${server.root()}" + href;
			}
			nabu.utils.ajax({ url: href }).then(function(response) {
				self.inlineContent = response.responseText;
			});
		}
		this.$services.q.all(promises).then(done, done);
	},
	created: function() {
		this.normalize(this.cell.state);
	},
	data: function() {
		return {
			configuring: false,
			images: [],
			files: [],
			inlineContent: null
		}
	},
	computed: {
		fullHref: function() {
			var href = null;
			if (this.href) {
				href = this.href;
			}
			else if (this.cell.state.href) {
				href = this.cell.state.href;
			}
			// if the href is not an absolute one (either globally absolute or application absolute), we inject the server root
			if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && href.substring(0, 1) != "/") {
				href = "${server.root()}" + href;
			}
			if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && this.cell.state.absolute) {
				href = "${environment('url')}" + href;
			}
			// on mobile we don't want absolute paths starting with "/", otherwise it won't fetch from the file system
			else if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && ${environment("mobile") == true} && href.indexOf("/") == 0) {
				href = href.substring(1);
			}
			return href;
		}
	},
	methods: {
		load: function() {
			var self = this;
			return this.$services.swagger.execute("nabu.web.page.core.rest.resource.list", {path:this.cell.state.imagePath}).then(function(list) {
				self.images.splice(0, self.images.length);
				if (list && list.resources) {
					nabu.utils.arrays.merge(self.images, list.resources);
				}
			});
		},
		upload: function() {
			var self = this;
			this.$services.swagger.execute("nabu.web.page.core.rest.resource.create", { path:this.cell.state.imagePath, body: this.files[0] }).then(function(result) {
				self.load();
				if (result && result.relativePath) {
					self.cell.state.href = result.relativePath;
				}
				self.files.splice(0, self.files.length);
			});
		},
		configure: function() {
			this.configuring = true;	
		},
		normalize: function(state) {
			if (!state.href) {
				Vue.set(state, "href", null);
			}
			if (!state.title) {
				Vue.set(state, "title", null);
			}
			if (!state.height) {
				Vue.set(state, "height", "15rem");
			}
			if (!state.size) {
				Vue.set(state, "size", 'cover');
			}
			if (!state.imagePath) {
				Vue.set(state, "imagePath", 'images');
			}
		}
	},
	watch: {
		'cell.state.imagePath': function() {
			this.load();
		}
	}
})