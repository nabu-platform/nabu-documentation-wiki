Vue.view("wiki-menu-root", {
	category: "Wiki",
	name: "Wiki Menu",
	description: "A menu that contains the wiki articles",
	icon: "images/views/wiki.png",
	props: {
		path: {
			type: String
		},
		initialSmall: {
			type: Boolean,
			required: false,
			default: function() {
				return navigator.userAgent.toLowerCase().indexOf("mobi") >= 0
			}
		}
	},
	data: function() {
		return {
			small: null,
			search: null
		}
	},
	created: function() {
		this.small = this.initialSmall;	
	},
	methods: {
		getEvents: function() {
			return {
				selectedArticle: this.$services.swagger.resolve("nabu.web.wiki.types.WikiArticle")
			}
		},
		trigger: function(article) {
			var instance = this.$services.page.getCurrentInstance(this);
			instance.emit("selectedArticle", article);
			this.small = this.initialSmall;
			this.$services.wiki.selected = article.path;
		},
		searchFull: function() {
			if (this.search) {
				this.$refs.menu.hasMatch(this.search);
				this.$services.router.route("wiki-search", {q: this.search});
			}
		},
		checkKey: function(event) {
			if (event.keyCode === 13) {
				this.searchFull();
			}
		}
	},
	events: {
		selectArticle: function(article) {
			// we have a new path
			if (article != null && article.path != null) {
				this.$refs.menu.select(article.path);
				this.$services.wiki.selected = article.path;
			}
		}
	},
	watch: {
		small: function(newValue) {
			console.log("swiped!", newValue);
		}
	}
});

Vue.component("wiki-menu", {
	template: "#wiki-menu",
	props: {
		root: {
			type: Object,
			required: false
		},
		initialOpen: {
			type: Array,
			required: false,
			default: function() {
				return []
			}
		}
	},
	data: function() {
		return {
			openDirectories: []
		}
	},
	computed: {
		initialChildrenOpen: function() {
			return this.initialOpen.filter(function(x) { return x.indexOf("/", 1) > 0 }).map(function(x) {
				// leading / does not count
				if (x.indexOf("/") == 0) {
					x = x.substring(1);
				}
				return x.substring(x.indexOf("/") + 1);
			});
		}
	},
	created: function() {
		if (this.root.directories) {
			this.root.directories.sort(function(a, b) {
				return a.name.localeCompare(b.name);	
			});
		}
		if (this.root.articles) {
			this.root.articles.sort(function(a, b) {
				return a.name.localeCompare(b.name);	
			});
		}
		nabu.utils.arrays.merge(this.openDirectories, this.initialOpen.filter(function(x) { return x.indexOf("/", 1) > 0 }).map(function(x) {
			// leading / does not count
			if (x.indexOf("/") == 0) {
				x = x.substring(1);
			}
			return x.substring(0, x.indexOf("/"));
		}));
	},
	methods: {
		select: function(path) {
			var self = this;
			// check if we have the child here
			if (this.root.articles) {
				for (var i = 0; i < this.root.articles.length; i++) {
					console.log("\tchecking", this.root.articles[i].path, this.root.articles[i].path == path);
					if (this.root.articles[i].path == path) {
						return true;
					}
				}
			}
			// otherwise, if it is a child path of this one, check child directories
			if (path.indexOf(this.root.path) == 0 && (this.root.path == "/" || path.substring(this.root.path.length).indexOf("/") == 0) && this.$refs.directories && this.$refs.directories.length) {
				var selected = false;
				this.$refs.directories.forEach(function(x) {
					if (x.select(path)) {
						self.toggle(x.root);
						selected = true;
					}
				});
				return selected;
			}
			return false;
		},
		isOpen: function(directory) {
			return this.openDirectories.indexOf(directory.name) >= 0;
		},
		toggle: function(directory) {
			var index = this.openDirectories.indexOf(directory.name);
			if (index < 0) {
				this.openDirectories.push(directory.name);
			}
			else {
				this.openDirectories.splice(index, 1);
			}
		},
		hasMatch: function(search) {
			var matched = false;
			var self = this;
			this.root.directories.forEach(function(dir) {
				if (dir.name.toLowerCase().indexOf(search.toLowerCase()) >= 0) {
					matched = true;
				}
			});
			if (!matched) {
				this.root.articles.forEach(function(dir) {
					if (!matched && dir.name.toLowerCase().indexOf(search.toLowerCase()) >= 0) {
						matched = true;
					}
				});
			}
			if (this.$refs.directories && this.$refs.directories.length) {
				this.$refs.directories.forEach(function(x) {
					var result = x.hasMatch(search);
					if (result) {
						matched = true;
						if (self.openDirectories.indexOf(x.root.name) < 0) {
							self.toggle(x.root);	
						}
					}
					else if (self.openDirectories.indexOf(x.root.name) >= 0) {
						self.toggle(x.root);	
					}
				});
			}
			return matched;
		}
	}
});