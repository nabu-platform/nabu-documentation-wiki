Vue.service("wiki", {
	services: ["swagger"],
	data: function() {
		return {
			root: null,
			selected: null
		}
	},
	activate: function(done) {
		var self = this;
		this.$services.swagger.execute("nabu.documentation.wiki.rest.wiki.hierarchy").then(function(list) {
			if (list) {
				Vue.set(self, "root", list);
			}
			done();
		}, done);
	},
	computed: {
		articles: function() {
			var result = [];
			var recursive = function(root) {
				if (root.directories) {
					root.directories.forEach(recursive);
				}
				if (root.articles) {
					nabu.utils.arrays.merge(result, root.articles);
				}
			}
			if (this.root) {
				recursive(this.root);
			}
			return result;
		},
		explainers: function() {
			var explainers = this.articles.filter(function(x) {
				return x.meta && x.meta.length && x.meta.filter(function(y) { return y.key == "explain" }).length;
			});
			var result = {};
			explainers.forEach(function(x) {
				var value = x.meta.filter(function(y) { return y.key == "explain" })[0].value;
				if (value) {
					var parts = value.split(/[\s]*,[\s]*/);
					parts.forEach(function(part) {
						part = part.toLowerCase();
						if (!result[part]) {
							result[part] = [];
						}
						result[part].push(x);
					});
				}
			});
			return result;
		},
		tags: function() {
			var tags = this.articles.filter(function(x) {
				return x.tags && x.tags.length;
			});
			var result = {};
			tags.forEach(function(x) {
				x.tags.forEach(function(tag) {
					tag = tag.toLowerCase();
					if (!result[tag]) {
						result[tag] = [];
					}
					result[tag].push(x);
				});
			});
			return result;
		}
	},
	methods: {
		searchByTags: function() {
			var tags = arguments;
			return this.articles.filter(function(x) {
				if (x.tags && x.tags.length > 0) {
					var matches = true;
					for (var i = 0; i < tags.length; i++) {
						if (x.tags.indexOf(tags[i]) < 0) {
							matches = false;
							break;
						}	
					}
					return matches;
				}
			});
		}
	}
});